// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Interfaz minima del Pool de Aave V3 (solo lo que necesitamos)
interface IAavePoolConservative {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
}

/**
 * @title ArbiAgentConservativeVault
 * @notice Boveda ERC-4626 en Arbitrum del modo CONSERVADOR. Invierte en Aave V3 y
 *         ejecuta rebalanceos solo si vienen acompanados de una firma EIP-712
 *         valida del agente de IA.
 */
contract ArbiAgentConservativeVault is ERC4626, Ownable, EIP712, ReentrancyGuard {
    using ECDSA for bytes32;

    // --- Direcciones clave ---
    address public aiAgent;      // Direccion (clave publica) que firma las senales de IA
    address public treasury;     // Recibe las comisiones de desempeno
    IAavePoolConservative public immutable aavePool;  // Pool de Aave V3 en Arbitrum
    address public immutable aToken;                  // aToken que representa nuestro deposito en Aave

    // --- Comisiones ---
    uint256 public performanceFee = 1000; // 10% (base 10000)
    uint256 public constant MAX_BPS = 10000;

    // --- Anti-replay para las firmas ---
    mapping(uint256 => bool) public usedNonces;

    // --- Cooldown entre rebalanceos ---
    // Este vault opera en modo CONSERVADOR: cooldown fijo de 24 horas entre
    // ejecuciones de executeSignal(), igual al valor definido en
    // decision_engine.py (RISK_CONFIGS[Conservador].rebalance_cooldown_hours).
    // Se hace cumplir on-chain via el require() en executeSignal().
    // El limite de exposicion a Aave (60%) lo controla el backend.
    uint256 public constant REBALANCE_COOLDOWN = 24 hours;
    uint256 public lastExecutionTime;

    // Estructura tipada que la IA firma off-chain (formato EIP-712)
    bytes32 private constant SIGNAL_TYPEHASH =
        keccak256("RebalanceSignal(uint256 amountToSupply,uint256 amountToWithdraw,uint256 profitGenerated,uint256 nonce,uint256 deadline)");

    event SignalExecuted(uint256 amountToSupply, uint256 amountToWithdraw, uint256 profitGenerated, uint256 nonce);
    event FeeCollected(address indexed treasury, uint256 amount);
    event AIAgentUpdated(address indexed newAIAgent);
    event TreasuryUpdated(address indexed newTreasury);
    event PerformanceFeeUpdated(uint256 newFee);

    constructor(
        IERC20 assetToken,
        address _aiAgent,
        address _treasury,
        address _aavePool,
        address _aToken
    )
        ERC20("ArbiAgent Conservative Vault Share", "aACons")
        ERC4626(assetToken)
        Ownable(msg.sender)
        EIP712("ArbiAgentVault", "1") // mismo dominio que los otros modos: el backend firma igual
    {
        require(_aiAgent != address(0), "Agente IA invalido");
        require(_treasury != address(0), "Tesoreria invalida");
        require(_aavePool != address(0), "Pool Aave invalido");
        require(_aToken != address(0), "aToken invalido");

        aiAgent = _aiAgent;
        treasury = _treasury;
        aavePool = IAavePoolConservative(_aavePool);
        aToken = _aToken;

        // Aprobacion maxima para que el Pool de Aave pueda tomar el activo cuando hagamos supply()
        bool approved = IERC20(address(assetToken)).approve(_aavePool, type(uint256).max);
        require(approved, "Aprobacion inicial fallida");
    }

    /**
     * @notice Ejecuta una senal de rebalanceo firmada por el agente de IA.
     * @dev Cualquiera puede llamar esta funcion (por ejemplo un keeper/bot),
     *      pero solo se ejecuta si la firma corresponde a `aiAgent`.
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
        require(
            lastExecutionTime == 0 || block.timestamp >= lastExecutionTime + REBALANCE_COOLDOWN,
            "Cooldown activo: espera antes de rebalancear de nuevo"
        );

        bytes32 structHash = keccak256(
            abi.encode(SIGNAL_TYPEHASH, amountToSupply, amountToWithdraw, profitGenerated, nonce, deadline)
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = digest.recover(signature);
        require(signer == aiAgent, "Firma invalida");

        usedNonces[nonce] = true;
        lastExecutionTime = block.timestamp;

        if (profitGenerated > 0) {
            _collectPerformanceFee(profitGenerated);
        }

        if (amountToSupply > 0) {
            aavePool.supply(asset(), amountToSupply, address(this), 0);
        }

        if (amountToWithdraw > 0) {
            uint256 withdrawn = aavePool.withdraw(asset(), amountToWithdraw, address(this));
            require(withdrawn >= amountToWithdraw, "Retiro de Aave incompleto");
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
        emit PerformanceFeeUpdated(_newFee);
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
     * @dev Si el retiro excede el saldo liquido, saca el faltante de Aave
     *      ANTES de transferir el activo al usuario. Evita que un retiro falle
     *      solo porque la mayoria del capital esta "trabajando" en Aave.
     */
    function _withdraw(
        address caller,
        address receiver,
        address shareOwner,
        uint256 assets,
        uint256 shares
    ) internal override nonReentrant {
        uint256 liquid = IERC20(asset()).balanceOf(address(this));

        if (liquid < assets) {
            uint256 shortfall = assets - liquid;
            uint256 withdrawnFromAave = aavePool.withdraw(asset(), shortfall, address(this));
            require(withdrawnFromAave >= shortfall, "Retiro de Aave incompleto");
        }

        super._withdraw(caller, receiver, shareOwner, assets, shares);
    }
}
