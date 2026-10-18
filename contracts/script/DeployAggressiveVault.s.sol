// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/ArbiAgentAggressiveVault.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @notice Script de deploy para ArbiAgentAggressiveVault.
 * @dev Mismas variables de entorno que DeployArbiAgentVault.
 *
 * Uso:
 *   forge script script/DeployAggressiveVault.s.sol:DeployAggressiveVault \
 *     --rpc-url $RPC_URL_ARBITRUM_SEPOLIA \
 *     --private-key $PRIVATE_KEY \
 *     --broadcast
 */
contract DeployAggressiveVault is Script {
    function run() external returns (ArbiAgentAggressiveVault vault) {
        address assetAddress = vm.envAddress("ASSET_ADDRESS");
        address aiAgentAddress = vm.envAddress("AI_AGENT_ADDRESS");
        address treasuryAddress = vm.envAddress("TREASURY_ADDRESS");
        address aavePoolAddress = vm.envAddress("AAVE_POOL_ADDRESS");
        address aTokenAddress = vm.envAddress("ATOKEN_ADDRESS");

        vm.startBroadcast();

        vault = new ArbiAgentAggressiveVault(
            IERC20(assetAddress),
            aiAgentAddress,
            treasuryAddress,
            aavePoolAddress,
            aTokenAddress
        );

        vm.stopBroadcast();

        console.log("ArbiAgentAggressiveVault desplegado en:", address(vault));
    }
}
