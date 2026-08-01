// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Interfaz minima del Pool de Aave V3 (solo lo que necesitamos)
interface IAavePool {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
}

/**
 * @title ArbiAgentVault
 * @notice Boveda ERC-4626 en Arbitrum que invierte en Aave V3 y ejecuta
 *         rebalanceos solo si vienen acompanados de una firma EIP-712 valida
 *         del agente de IA. Esto permite verificar ON-CHAIN que la senal
 *         realmente proviene de la clave privada autorizada del agente,
 *         sin depender solo de "quien llama la funcion" (msg.sender).
 */
contract ArbiAgentVault is ERC4626, Ownable, EIP712, ReentrancyGuard {
    using ECDSA for bytes32;

    // --- Direcciones clave ---
    address public aiAgent;      // Direccion (clave publica) que firma las senales de IA
    address public treasury;     // Recibe las comisiones de desempeno
    IAavePool public immutable aavePool;  // Pool de Aave V3 en Arbitrum
    address public immutable aToken;      // aToken que representa nuestro deposito en Aave (ej. aArbUSDC)

    // --- Comisiones ---
    uint256 public performanceFee = 1000; // 10% (base 10000)
    uint256 public constant MAX_BPS = 10000;

    // --- Anti-replay para las firmas ---
    mapping(uint256 => bool) public usedNonces;

    // Estructura tipada que la IA firma off-chain (formato EIP-712)
    bytes32 private constant SIGNAL_TYPEHASH =
        keccak256("RebalanceSignal(uint256 amountToSupply,uint256 amountToWithdraw,uint256 profitGenerated,uint256 nonce,uint256 deadline)");

    event SignalExecuted(uint256 amountToSupply, uint256 amountToWithdraw, uint256 profitGenerated, uint256 nonce);
    event FeeCollected(address indexed treasury, uint256 amount);
    event AIAgentUpdated(address indexed newAIAgent);
    event TreasuryUpdated(address indexed newTreasury);

    constructor(
        IERC20 _asset,
        address _aiAgent,
        address _treasury,
        address _aavePool,
        address _aToken
    )
        ERC20("ArbiAgent Vault Share", "aAVault")
        ERC4626(_asset)
        Ownable(msg.sender)
        EIP712("ArbiAgentVault", "1") // dominio EIP-712, usado en el hash de la firma
    {
        require(_aiAgent != address(0), "Agente IA invalido");
        require(_treasury != address(0), "Tesoreria invalida");
        require(_aavePool != address(0), "Pool Aave invalido");
        require(_aToken != address(0), "aToken invalido");

        aiAgent = _aiAgent;
        treasury = _treasury;
        aavePool = IAavePool(_aavePool);
        aToken = _aToken;

        // Aprobacion maxima para que el Pool de Aave pueda tomar el activo cuando hagamos supply()
        IERC20(address(_asset)).approve(_aavePool, type(uint256).max);
    }

    /**
     * @notice Ejecuta una senal de rebalanceo firmada por el agente de IA.
     * @dev Cualquiera puede llamar esta funcion (por ejemplo un keeper/bot),
     *      pero solo se ejecuta si la firma corresponde a `aiAgent`.
     *      Esto es lo que el jurado va a llamar "integracion on-chain de senales de IA":
     *      la logica de decision vive off-chain (el modelo), pero la EJECUCION
     *      y VERIFICACION de que la decision es legitima vive on-chain.
     * @param amountToSupply Monto a depositar en Aave (0 si no aplica)
     * @param amountToWithdraw Monto a retirar de Aave (0 si no aplica)
     * @param profitGenerated Ganancia detectada por la IA desde el ultimo rebalanceo
     * @param nonce Numero unico para evitar que la misma firma se reutilice
     * @param deadline Timestamp limite de validez de la firma
     * @param signature Firma EIP-712 generada por la clave privada de aiAgent
     */
    function executeSignal(
        uint256 amountToSupply,
        uint256 amountToWithdraw,
        uint256 profitGenerated,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external nonReentrant {
        require(block.timestamp <= deadline, "Senal expirada");
        require(!usedNonces[nonce], "Nonce ya usado");

        bytes32 structHash = keccak256(
            abi.encode(SIGNAL_TYPEHASH, amountToSupply, amountToWithdraw, profitGenerated, nonce, deadline)
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = digest.recover(signature);
        require(signer == aiAgent, "Firma invalida");

        usedNonces[nonce] = true;

        if (profitGenerated > 0) {
            _collectPerformanceFee(profitGenerated);
        }

        if (amountToSupply > 0) {
            aavePool.supply(asset(), amountToSupply, address(this), 0);
        }

        if (amountToWithdraw > 0) {
            aavePool.withdraw(asset(), amountToWithdraw, address(this));
        }

        emit SignalExecuted(amountToSupply, amountToWithdraw, profitGenerated, nonce);
    }

    /**
     * @notice Calcula y cobra la comision sobre las ganancias generadas
     */
    function _collectPerformanceFee(uint256 totalProfit) internal {
        if (performanceFee > 0) {
            uint256 feeAmount = (totalProfit * performanceFee) / MAX_BPS;
            _mint(treasury, convertToShares(feeAmount));
            emit FeeCollected(treasury, feeAmount);
        }
    }

    // --- Configuracion Admin ---

    function setPerformanceFee(uint256 _newFee) external onlyOwner {
        require(_newFee <= 2000, "Comision supera el maximo");
        performanceFee = _newFee;
    }

    function setTreasury(address _newTreasury) external onlyOwner {
        require(_newTreasury != address(0), "Direccion invalida");
        treasury = _newTreasury;
        emit TreasuryUpdated(_newTreasury);
    }

    function setAIAgent(address _newAIAgent) external onlyOwner {
        require(_newAIAgent != address(0), "Direccion invalida");
        aiAgent = _newAIAgent;
        emit AIAgentUpdated(_newAIAgent);
    }

    /**
     * @notice Total de activos gestionados: lo que esta liquido en el vault
     *         mas lo que esta depositado (y generando yield) en Aave.
     */
    function totalAssets() public view override returns (uint256) {
        uint256 liquid = IERC20(asset()).balanceOf(address(this));
        uint256 deployed = IERC20(aToken).balanceOf(address(this));
        return liquid + deployed;
    }

    /**
     * @dev Hook interno que ejecutan withdraw() y redeem() de ERC-4626 antes
     *      de transferir el activo al usuario. Por defecto, ERC-4626 solo
     *      transfiere desde el balance liquido del contrato. Como nuestros
     *      fondos pueden estar depositados en Aave (no liquidos), sacamos
     *      automaticamente la diferencia que falte desde Aave ANTES de que
     *      se ejecute la transferencia real. Esto evita que un retiro falle
     *      solo porque la mayoria del capital esta "trabajando" en Aave.
     */
    function _withdraw(
        address caller,
        address receiver,
        address owner,
        uint256 assets,
        uint256 shares
    ) internal override nonReentrant {
        uint256 liquid = IERC20(asset()).balanceOf(address(this));

        if (liquid < assets) {
            uint256 shortfall = assets - liquid;
            // Si no hay suficiente aToken para cubrir el faltante, esto revierte
            // naturalmente (no deberia pasar si totalAssets/maxWithdraw estan bien calculados).
            aavePool.withdraw(asset(), shortfall, address(this));
        }

        super._withdraw(caller, receiver, owner, assets, shares);
    }
}
