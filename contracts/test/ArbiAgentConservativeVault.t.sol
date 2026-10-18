// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ModeVaultTestBase.sol";
import "../src/ArbiAgentConservativeVault.sol";

/// @notice Tests del vault conservador (cooldown 24 h). Los escenarios compartidos viven en ModeVaultTestBase.
contract ArbiAgentConservativeVaultTest is ModeVaultTestBase {
    ArbiAgentConservativeVault public vault;

    function setUp() public {
        _deployMocks();

        vm.startPrank(owner);
        vault = new ArbiAgentConservativeVault(
            IERC20(address(asset)), aiAgent, treasury, address(aavePool), address(aToken)
        );
        vm.stopPrank();

        _fundUser();
    }

    function test_CooldownValueAndSymbol() public view {
        assertEq(vault.REBALANCE_COOLDOWN(), 24 hours);
        assertEq(IERC20Metadata(address(vault)).symbol(), "aACons");
    }

    function test_Cooldown() public {
        _checkCooldown(address(vault), 24 hours);
    }

    function test_WithdrawPullsLiquidityFromAave() public {
        _checkWithdrawPullsFromAave(address(vault));
    }

    function test_RevertOnInvalidSigner() public {
        _checkInvalidSigner(address(vault));
    }

    function test_RevertOnReusedNonce() public {
        _checkReusedNonce(address(vault));
    }

    function test_DepositAndMintShares() public {
        _checkDepositAndMint(address(vault));
    }

    function test_ExecuteSignal_SupplyToAave() public {
        _checkSupplyToAave(address(vault));
    }

    function test_RevertOnNonOwnerSetPerformanceFee() public {
        _checkNonOwnerSetPerformanceFee(address(vault));
    }

    function test_RevertOnFeeAboveMax() public {
        _checkFeeAboveMax(address(vault));
    }

    function test_RevertOnNonOwnerSetTreasury() public {
        _checkNonOwnerSetTreasury(address(vault));
    }

    function test_RevertOnNonOwnerSetAIAgent() public {
        _checkNonOwnerSetAIAgent(address(vault));
    }

    function test_OwnerCanUpdateAdminSettings() public {
        _checkOwnerCanUpdateAdminSettings(address(vault));
    }

    function test_PerformanceFeeCollection() public {
        _checkPerformanceFeeCollection(address(vault));
    }
}
