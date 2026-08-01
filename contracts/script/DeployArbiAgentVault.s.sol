// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/ArbiAgentVault.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @notice Script de deploy para ArbiAgentVault.
 * @dev Todas las direcciones se leen de variables de entorno, para que
 *      cualquiera del equipo pueda desplegar sin tener que editar codigo.
 *
 * Uso:
 *   forge script script/DeployArbiAgentVault.s.sol:DeployArbiAgentVault \
 *     --rpc-url $RPC_URL_ARBITRUM_SEPOLIA \
 *     --private-key $PRIVATE_KEY \
 *     --broadcast \
 *     --verify \
 *     --etherscan-api-key $ARBISCAN_API_KEY
 */
contract DeployArbiAgentVault is Script {
    function run() external returns (ArbiAgentVault vault) {
        // --- Variables de entorno requeridas ---
        address assetAddress = vm.envAddress("ASSET_ADDRESS");
        address aiAgentAddress = vm.envAddress("AI_AGENT_ADDRESS");
        address treasuryAddress = vm.envAddress("TREASURY_ADDRESS");
        address aavePoolAddress = vm.envAddress("AAVE_POOL_ADDRESS");
        address aTokenAddress = vm.envAddress("ATOKEN_ADDRESS");

        console.log("Desplegando ArbiAgentVault con:");
        console.log("  asset:      ", assetAddress);
        console.log("  aiAgent:    ", aiAgentAddress);
        console.log("  treasury:   ", treasuryAddress);
        console.log("  aavePool:   ", aavePoolAddress);
        console.log("  aToken:     ", aTokenAddress);

        vm.startBroadcast();

        vault = new ArbiAgentVault(
            IERC20(assetAddress),
            aiAgentAddress,
            treasuryAddress,
            aavePoolAddress,
            aTokenAddress
        );

        vm.stopBroadcast();

        console.log("ArbiAgentVault desplegado en:", address(vault));
    }
}
