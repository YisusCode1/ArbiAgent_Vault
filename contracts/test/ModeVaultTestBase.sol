// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/interfaces/IERC4626.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// --- Mocks (nombres propios para no chocar con los de ArbiAgentVault.t.sol) ---

contract ModeMockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "mUSDC") {
        _mint(msg.sender, 1_000_000 * 10 ** 18);
    }
}

contract ModeMockAToken is ERC20 {
    address public pool;

    constructor() ERC20("Mock aToken", "maUSDC") {}

    function setPool(address _pool) external {
        pool = _pool;
    }

    function mint(address to, uint256 amount) external {
        require(msg.sender == pool, "solo el pool puede mintear");
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        require(msg.sender == pool, "solo el pool puede quemar");
        _burn(from, amount);
    }
}

// Misma interfaz de funciones que usan los vaults (supply y withdraw)
contract ModeMockAavePool {
    IERC20 public underlying;
    ModeMockAToken public aToken;

    constructor(IERC20 _underlying, ModeMockAToken _aToken) {
        underlying = _underlying;
        aToken = _aToken;
    }

    function supply(address, uint256 amount, address onBehalfOf, uint16) external {
        underlying.transferFrom(msg.sender, address(this), amount);
        aToken.mint(onBehalfOf, amount);
    }

    function withdraw(address, uint256 amount, address to) external returns (uint256) {
        aToken.burn(msg.sender, amount);
        underlying.transfer(to, amount);
        return amount;
    }
}

// Lo que los vaults tienen en comun, para usar los mismos helpers con cada uno
interface IModeVault {
    function executeSignal(
        uint256 amountToSupply,
        uint256 amountToWithdraw,
        uint256 profitGenerated,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external;
    function REBALANCE_COOLDOWN() external view returns (uint256);
    function lastExecutionTime() external view returns (uint256);
    function setPerformanceFee(uint256 newFee) external;
    function setTreasury(address newTreasury) external;
    function setAIAgent(address newAIAgent) external;
    function performanceFee() external view returns (uint256);
    function treasury() external view returns (address);
    function aiAgent() external view returns (address);
}

/// @dev Base compartida por los tests de los vaults conservador y agresivo:
///      mocks, firma EIP-712 y los escenarios que se repiten en cada modo.
///      No contiene tests; cada archivo de modo la hereda.
abstract contract ModeVaultTestBase is Test {
    ModeMockUSDC public asset;
    ModeMockAToken public aToken;
    ModeMockAavePool public aavePool;

    address public owner = address(1);
    uint256 public aiAgentPrivateKey = 0xA11CE;
    address public aiAgent;
    address public treasury = address(3);
    address public user = address(4);

    bytes32 constant SIGNAL_TYPEHASH = keccak256(
        "RebalanceSignal(uint256 amountToSupply,uint256 amountToWithdraw,uint256 profitGenerated,uint256 nonce,uint256 deadline)"
    );

    string constant COOLDOWN_MSG = "Cooldown activo: espera antes de rebalancear de nuevo";

    /// @dev Despliega los mocks de USDC, aToken y Pool de Aave.
    function _deployMocks() internal {
        aiAgent = vm.addr(aiAgentPrivateKey);

        vm.startPrank(owner);
        asset = new ModeMockUSDC();
        aToken = new ModeMockAToken();
        aavePool = new ModeMockAavePool(IERC20(address(asset)), aToken);
        aToken.setPool(address(aavePool));
        vm.stopPrank();
    }

    /// @dev Le da 1000 tokens al usuario de prueba.
    function _fundUser() internal {
        vm.prank(owner);
        asset.transfer(user, 1_000 * 10 ** 18);
    }

    // ---------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------

    /// @dev Firma EIP-712 como lo haria el backend, dirigida a un vault concreto.
    function _signWithKey(
        uint256 privateKey,
        address vaultAddr,
        uint256 amountToSupply,
        uint256 amountToWithdraw,
        uint256 profitGenerated,
        uint256 nonce,
        uint256 deadline
    ) internal view returns (bytes memory) {
        bytes32 structHash = keccak256(
            abi.encode(SIGNAL_TYPEHASH, amountToSupply, amountToWithdraw, profitGenerated, nonce, deadline)
        );
        bytes32 domainSeparator = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("ArbiAgentVault")),
                keccak256(bytes("1")),
                block.chainid,
                vaultAddr
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);
        return abi.encodePacked(r, s, v);
    }

    function _sign(
        address vaultAddr,
        uint256 amountToSupply,
        uint256 amountToWithdraw,
        uint256 profitGenerated,
        uint256 nonce,
        uint256 deadline
    ) internal view returns (bytes memory) {
        return _signWithKey(
            aiAgentPrivateKey, vaultAddr, amountToSupply, amountToWithdraw, profitGenerated, nonce, deadline
        );
    }

    function _deposit(address vaultAddr, uint256 amount) internal {
        vm.startPrank(user);
        asset.approve(vaultAddr, amount);
        IERC4626(vaultAddr).deposit(amount, user);
        vm.stopPrank();
    }

    // ---------------------------------------------------------------
    // Escenarios compartidos (se ejecutan para cada modo)
    // ---------------------------------------------------------------

    function _checkCooldown(address vaultAddr, uint256 cooldown) internal {
        IModeVault v = IModeVault(vaultAddr);
        _deposit(vaultAddr, 500 * 10 ** 18);

        // Primera senal: no hay cooldown previo
        uint256 deadline1 = block.timestamp + 1 hours;
        bytes memory sig1 = _sign(vaultAddr, 100 * 10 ** 18, 0, 0, 1, deadline1);
        v.executeSignal(100 * 10 ** 18, 0, 0, 1, deadline1, sig1);
        assertEq(v.lastExecutionTime(), block.timestamp);

        // Deadline amplio para que la firma siga valida durante todo el warp
        uint256 deadline2 = block.timestamp + cooldown + 1 hours;
        bytes memory sig2 = _sign(vaultAddr, 50 * 10 ** 18, 0, 0, 2, deadline2);

        // Inmediatamente despues: bloqueado
        vm.expectRevert(bytes(COOLDOWN_MSG));
        v.executeSignal(50 * 10 ** 18, 0, 0, 2, deadline2, sig2);

        // Un segundo antes de terminar el cooldown: sigue bloqueado
        vm.warp(block.timestamp + cooldown - 1);
        vm.expectRevert(bytes(COOLDOWN_MSG));
        v.executeSignal(50 * 10 ** 18, 0, 0, 2, deadline2, sig2);

        // Cooldown completo: pasa
        vm.warp(block.timestamp + 1);
        v.executeSignal(50 * 10 ** 18, 0, 0, 2, deadline2, sig2);

        assertEq(aToken.balanceOf(vaultAddr), 150 * 10 ** 18);
        assertEq(v.lastExecutionTime(), block.timestamp);
    }

    function _checkWithdrawPullsFromAave(address vaultAddr) internal {
        _deposit(vaultAddr, 500 * 10 ** 18);

        // La IA manda todo a Aave: el vault se queda sin liquidez propia
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _sign(vaultAddr, 500 * 10 ** 18, 0, 0, 1, deadline);
        IModeVault(vaultAddr).executeSignal(500 * 10 ** 18, 0, 0, 1, deadline, sig);

        assertEq(asset.balanceOf(vaultAddr), 0);
        assertEq(aToken.balanceOf(vaultAddr), 500 * 10 ** 18);

        // El usuario retira: el vault recupera la liquidez de Aave
        vm.prank(user);
        IERC4626(vaultAddr).withdraw(200 * 10 ** 18, user, user);

        assertEq(asset.balanceOf(user), 700 * 10 ** 18); // 1000 - 500 depositados + 200 retirados
        assertEq(aToken.balanceOf(vaultAddr), 300 * 10 ** 18);
    }

    function _checkInvalidSigner(address vaultAddr) internal {
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory badSig = _signWithKey(0xBAD, vaultAddr, 100 * 10 ** 18, 0, 0, 1, deadline);

        vm.expectRevert("Firma invalida");
        IModeVault(vaultAddr).executeSignal(100 * 10 ** 18, 0, 0, 1, deadline, badSig);
    }

    function _checkReusedNonce(address vaultAddr) internal {
        _deposit(vaultAddr, 500 * 10 ** 18);

        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _sign(vaultAddr, 100 * 10 ** 18, 0, 0, 1, deadline);
        IModeVault(vaultAddr).executeSignal(100 * 10 ** 18, 0, 0, 1, deadline, sig);

        vm.expectRevert("Nonce ya usado");
        IModeVault(vaultAddr).executeSignal(100 * 10 ** 18, 0, 0, 1, deadline, sig);
    }

    function _checkDepositAndMint(address vaultAddr) internal {
        _deposit(vaultAddr, 500 * 10 ** 18);

        assertEq(IERC20(vaultAddr).balanceOf(user), 500 * 10 ** 18);
        assertEq(IERC4626(vaultAddr).totalAssets(), 500 * 10 ** 18);
    }

    function _checkSupplyToAave(address vaultAddr) internal {
        _deposit(vaultAddr, 500 * 10 ** 18);

        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _sign(vaultAddr, 300 * 10 ** 18, 0, 0, 1, deadline);
        IModeVault(vaultAddr).executeSignal(300 * 10 ** 18, 0, 0, 1, deadline, sig);

        assertEq(aToken.balanceOf(vaultAddr), 300 * 10 ** 18);
        assertEq(IERC4626(vaultAddr).totalAssets(), 500 * 10 ** 18); // liquido + depositado en Aave
    }

    function _checkNonOwnerSetPerformanceFee(address vaultAddr) internal {
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, user));
        IModeVault(vaultAddr).setPerformanceFee(500);
    }

    function _checkFeeAboveMax(address vaultAddr) internal {
        vm.prank(owner);
        vm.expectRevert("Comision supera el maximo");
        IModeVault(vaultAddr).setPerformanceFee(2001);
    }

    function _checkNonOwnerSetTreasury(address vaultAddr) internal {
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, user));
        IModeVault(vaultAddr).setTreasury(address(0x999));
    }

    function _checkNonOwnerSetAIAgent(address vaultAddr) internal {
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, user));
        IModeVault(vaultAddr).setAIAgent(address(0x999));
    }

    function _checkOwnerCanUpdateAdminSettings(address vaultAddr) internal {
        IModeVault v = IModeVault(vaultAddr);

        vm.startPrank(owner);
        v.setPerformanceFee(1500);
        v.setTreasury(address(0x999));
        v.setAIAgent(address(0x888));
        vm.stopPrank();

        assertEq(v.performanceFee(), 1500);
        assertEq(v.treasury(), address(0x999));
        assertEq(v.aiAgent(), address(0x888));
    }

    function _checkPerformanceFeeCollection(address vaultAddr) internal {
        _deposit(vaultAddr, 1000 * 10 ** 18);

        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _sign(vaultAddr, 0, 0, 100 * 10 ** 18, 1, deadline);
        IModeVault(vaultAddr).executeSignal(0, 0, 100 * 10 ** 18, 1, deadline, sig);

        // Comision de 10% sobre 100 = 10, convertida a shares (ratio 1:1 aqui)
        assertEq(IERC20(vaultAddr).balanceOf(treasury), 10 * 10 ** 18);
    }
}
