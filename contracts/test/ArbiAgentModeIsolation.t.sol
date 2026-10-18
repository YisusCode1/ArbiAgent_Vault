// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ModeVaultTestBase.sol";
import "../src/ArbiAgentConservativeVault.sol";
import "../src/ArbiAgentAggressiveVault.sol";

/// @notice Comprueba que los vaults de cada modo son independientes entre si.
///         Necesita los dos desplegados a la vez, por eso va en su propio archivo.
contract ArbiAgentModeIsolationTest is ModeVaultTestBase {
    ArbiAgentConservativeVault public conservative;
    ArbiAgentAggressiveVault public aggressive;

    function setUp() public {
        _deployMocks();

        vm.startPrank(owner);
        conservative = new ArbiAgentConservativeVault(
            IERC20(address(asset)), aiAgent, treasury, address(aavePool), address(aToken)
        );
        aggressive = new ArbiAgentAggressiveVault(
            IERC20(address(asset)), aiAgent, treasury, address(aavePool), address(aToken)
        );
        vm.stopPrank();

        _fundUser();
    }

    /// @dev Una firma hecha para un vault no sirve en otro: el dominio EIP-712
    ///      incluye la direccion del contrato (verifyingContract).
    function test_SignatureForOneVaultFailsOnAnother() public {
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sigForConservative = _sign(address(conservative), 100 * 10 ** 18, 0, 0, 1, deadline);

        vm.expectRevert("Firma invalida");
        aggressive.executeSignal(100 * 10 ** 18, 0, 0, 1, deadline, sigForConservative);
    }

    /// @dev El cooldown y los fondos de cada modo son independientes: ejecutar
    ///      en el conservador no bloquea al agresivo.
    function test_ModesHaveIndependentCooldownAndFunds() public {
        _deposit(address(conservative), 400 * 10 ** 18);
        _deposit(address(aggressive), 400 * 10 ** 18);

        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sigC = _sign(address(conservative), 100 * 10 ** 18, 0, 0, 1, deadline);
        bytes memory sigA = _sign(address(aggressive), 300 * 10 ** 18, 0, 0, 1, deadline);

        conservative.executeSignal(100 * 10 ** 18, 0, 0, 1, deadline, sigC);
        aggressive.executeSignal(300 * 10 ** 18, 0, 0, 1, deadline, sigA); // mismo instante: no hay bloqueo cruzado

        assertEq(aToken.balanceOf(address(conservative)), 100 * 10 ** 18);
        assertEq(aToken.balanceOf(address(aggressive)), 300 * 10 ** 18);
        assertEq(conservative.totalAssets(), 400 * 10 ** 18);
        assertEq(aggressive.totalAssets(), 400 * 10 ** 18);
    }
}
