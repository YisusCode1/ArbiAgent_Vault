// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/ArbiAgentVault.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// --- Mocks para simular el ecosistema Aave en tests locales ---

contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "mUSDC") {
        _mint(msg.sender, 1_000_000 * 10 ** 18);
    }
}

contract MockAToken is ERC20 {
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

// Implementa la misma interfaz IAavePool declarada en ArbiAgentVault.sol
contract MockAavePool is IAavePool {
    IERC20 public underlying;
    MockAToken public aToken;

    constructor(IERC20 _underlying, MockAToken _aToken) {
        underlying = _underlying;
        aToken = _aToken;
    }

    function supply(address, uint256 amount, address onBehalfOf, uint16) external override {
        underlying.transferFrom(msg.sender, address(this), amount);
        aToken.mint(onBehalfOf, amount);
    }

    function withdraw(address, uint256 amount, address to) external override returns (uint256) {
        aToken.burn(msg.sender, amount);
        underlying.transfer(to, amount);
        return amount;
    }
}

contract ArbiAgentVaultTest is Test {
    ArbiAgentVault public vault;
    MockUSDC public asset;
    MockAToken public aToken;
    MockAavePool public aavePool;

    address public owner = address(1);
    uint256 public aiAgentPrivateKey = 0xA11CE; // clave privada de prueba
    address public aiAgent;                      // se deriva de la clave arriba
    address public treasury = address(3);
    address public user = address(4);

    // Debe ser EXACTAMENTE igual al TYPEHASH definido en el contrato
    bytes32 constant SIGNAL_TYPEHASH = keccak256(
        "RebalanceSignal(uint256 amountToSupply,uint256 amountToWithdraw,uint256 profitGenerated,uint256 nonce,uint256 deadline)"
    );

    function setUp() public {
        aiAgent = vm.addr(aiAgentPrivateKey);

        vm.startPrank(owner);
        asset = new MockUSDC();
        aToken = new MockAToken();
        aavePool = new MockAavePool(IERC20(address(asset)), aToken);
        aToken.setPool(address(aavePool));

        vault = new ArbiAgentVault(
            IERC20(address(asset)),
            aiAgent,
            treasury,
            address(aavePool),
            address(aToken)
        );

        asset.transfer(user, 1_000 * 10 ** 18);
        vm.stopPrank();
    }

    /// @dev Simula lo que haria el backend en Python: firma la senal con la
    ///      clave privada del agente de IA, siguiendo el mismo esquema EIP-712
    ///      que usa el contrato.
    function _signSignal(
        uint256 amountToSupply,
        uint256 amountToWithdraw,
        uint256 profitGenerated,
        uint256 nonce,
        uint256 deadline
    ) internal view returns (bytes memory signature) {
        bytes32 structHash = keccak256(
            abi.encode(SIGNAL_TYPEHASH, amountToSupply, amountToWithdraw, profitGenerated, nonce, deadline)
        );

        bytes32 domainSeparator = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("ArbiAgentVault")),
                keccak256(bytes("1")),
                block.chainid,
                address(vault)
            )
        );

        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(aiAgentPrivateKey, digest);
        signature = abi.encodePacked(r, s, v);
    }

    function test_DepositAndMintShares() public {
        vm.startPrank(user);
        asset.approve(address(vault), 500 * 10 ** 18);
        vault.deposit(500 * 10 ** 18, user);
        vm.stopPrank();

        assertEq(vault.balanceOf(user), 500 * 10 ** 18);
        assertEq(vault.totalAssets(), 500 * 10 ** 18);
    }

    function test_ExecuteSignal_SupplyToAave() public {
        vm.startPrank(user);
        asset.approve(address(vault), 500 * 10 ** 18);
        vault.deposit(500 * 10 ** 18, user);
        vm.stopPrank();

        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _signSignal(300 * 10 ** 18, 0, 0, 1, deadline);

        // Cualquiera puede enviar la transaccion; lo que autoriza es la firma
        vault.executeSignal(300 * 10 ** 18, 0, 0, 1, deadline, sig);

        assertEq(aToken.balanceOf(address(vault)), 300 * 10 ** 18);
        assertEq(vault.totalAssets(), 500 * 10 ** 18); // liquido + depositado en Aave
    }

    function test_RevertOnInvalidSigner() public {
        uint256 fakePrivateKey = 0xBAD;
        uint256 deadline = block.timestamp + 1 hours;

        bytes32 structHash = keccak256(
            abi.encode(SIGNAL_TYPEHASH, uint256(100 * 10 ** 18), uint256(0), uint256(0), uint256(1), deadline)
        );
        bytes32 domainSeparator = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("ArbiAgentVault")),
                keccak256(bytes("1")),
                block.chainid,
                address(vault)
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(fakePrivateKey, digest);
        bytes memory badSig = abi.encodePacked(r, s, v);

        vm.expectRevert("Firma invalida");
        vault.executeSignal(100 * 10 ** 18, 0, 0, 1, deadline, badSig);
    }

    function test_RevertOnReusedNonce() public {
        vm.startPrank(user);
        asset.approve(address(vault), 500 * 10 ** 18);
        vault.deposit(500 * 10 ** 18, user);
        vm.stopPrank();

        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _signSignal(100 * 10 ** 18, 0, 0, 1, deadline);
        vault.executeSignal(100 * 10 ** 18, 0, 0, 1, deadline, sig);

        vm.expectRevert("Nonce ya usado");
        vault.executeSignal(100 * 10 ** 18, 0, 0, 1, deadline, sig);
    }

    function test_WithdrawPullsLiquidityFromAave() public {
        // El usuario deposita 500
        vm.startPrank(user);
        asset.approve(address(vault), 500 * 10 ** 18);
        vault.deposit(500 * 10 ** 18, user);
        vm.stopPrank();

        // La IA manda TODO a Aave, el vault se queda sin liquidez propia
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _signSignal(500 * 10 ** 18, 0, 0, 1, deadline);
        vault.executeSignal(500 * 10 ** 18, 0, 0, 1, deadline, sig);

        assertEq(IERC20(address(asset)).balanceOf(address(vault)), 0);
        assertEq(aToken.balanceOf(address(vault)), 500 * 10 ** 18);

        // El usuario retira: sin el fix, esto revertiria por falta de liquidez
        vm.prank(user);
        vault.withdraw(200 * 10 ** 18, user, user);

        assertEq(asset.balanceOf(user), 700 * 10 ** 18); // 500 iniciales - 500 depositados + 200 retirados
        assertEq(aToken.balanceOf(address(vault)), 300 * 10 ** 18); // 500 - 200 recuperados de Aave
    }

    function test_RevertOnNonOwnerSetPerformanceFee() public {
        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, user)
        );
        vault.setPerformanceFee(500);
    }

    function test_RevertOnFeeAboveMax() public {
        vm.prank(owner);
        vm.expectRevert("Comision supera el maximo");
        vault.setPerformanceFee(2001);
    }

    function test_RevertOnNonOwnerSetTreasury() public {
        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, user)
        );
        vault.setTreasury(address(0x999));
    }

    function test_RevertOnNonOwnerSetAIAgent() public {
        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, user)
        );
        vault.setAIAgent(address(0x999));
    }

    function test_OwnerCanUpdateAdminSettings() public {
        vm.startPrank(owner);
        vault.setPerformanceFee(1500);
        vault.setTreasury(address(0x999));
        vault.setAIAgent(address(0x888));
        vm.stopPrank();

        assertEq(vault.performanceFee(), 1500);
        assertEq(vault.treasury(), address(0x999));
        assertEq(vault.aiAgent(), address(0x888));
    }

    function test_PerformanceFeeCollection() public {
        vm.startPrank(user);
        asset.approve(address(vault), 1000 * 10 ** 18);
        vault.deposit(1000 * 10 ** 18, user);
        vm.stopPrank();

        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _signSignal(0, 0, 100 * 10 ** 18, 1, deadline);
        vault.executeSignal(0, 0, 100 * 10 ** 18, 1, deadline, sig);

        // Fee de 10% de 100 = 10 USDC, convertido a shares (ratio 1:1 aqui)
        assertEq(vault.balanceOf(treasury), 10 * 10 ** 18);
    }
}
