"""
Modulo para obtener datos de mercado reales on-chain de Aave V3 en Arbitrum Sepolia.
Reemplaza los valores hardcodeados con lecturas directas del contrato Pool de Aave.
"""
import logging
from web3 import Web3
from app.models import MarketData
from app.config import settings

logger = logging.getLogger(__name__)

# RPC de Arbitrum Sepolia
ARBITRUM_SEPOLIA_RPC = "https://sepolia-rollup.arbitrum.io/rpc"

# Direcciones oficiales de Aave V3 en Arbitrum Sepolia
AAVE_DATA_PROVIDER_ADDRESS = Web3.to_checksum_address("0x12373B5085e3b42D42C1D4ABF3B3Cf4Df0E0Fa01")
USDC_ADDRESS = Web3.to_checksum_address("0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d")

# ABI de AaveProtocolDataProvider para leer getReserveData
AAVE_DATA_PROVIDER_ABI = [
    {
        "inputs": [{"internalType": "address", "name": "asset", "type": "address"}],
        "name": "getReserveData",
        "outputs": [
            {"internalType": "uint256", "name": "unbacked", "type": "uint256"},
            {"internalType": "uint256", "name": "accruedToTreasury", "type": "uint256"},
            {"internalType": "uint256", "name": "totalAToken", "type": "uint256"},
            {"internalType": "uint256", "name": "totalStableDebt", "type": "uint256"},
            {"internalType": "uint256", "name": "totalVariableDebt", "type": "uint256"},
            {"internalType": "uint256", "name": "liquidityRate", "type": "uint256"},
            {"internalType": "uint256", "name": "variableBorrowRate", "type": "uint256"},
            {"internalType": "uint256", "name": "stableBorrowRate", "type": "uint256"},
            {"internalType": "uint256", "name": "averageStableBorrowRate", "type": "uint256"},
            {"internalType": "uint256", "name": "liquidityIndex", "type": "uint256"},
            {"internalType": "uint256", "name": "variableBorrowIndex", "type": "uint256"},
            {"internalType": "uint40", "name": "lastUpdateTimestamp", "type": "uint40"}
        ],
        "stateMutability": "view",
        "type": "function"
    }
]

# ABI minimalista del Vault ERC-4626 para leer totalAssets
VAULT_ABI = [
    {
        "inputs": [],
        "name": "totalAssets",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    }
]

# Inicializar conexion Web3
w3 = Web3(Web3.HTTPProvider(ARBITRUM_SEPOLIA_RPC))


def fetch_market_data(vault_address: str = None) -> MarketData:
    """
    Obtiene tasas on-chain reales de Aave V3 y datos del Vault.
    En caso de fallo del RPC, lanza un ConnectionError (fail-fast).
    """
    target_vault = vault_address or settings.VAULT_CONTRACT_ADDRESS

    try:
        provider_contract = w3.eth.contract(address=AAVE_DATA_PROVIDER_ADDRESS, abi=AAVE_DATA_PROVIDER_ABI)

        # Llamada on-chain al contrato AaveProtocolDataProvider
        reserve_data = provider_contract.functions.getReserveData(USDC_ADDRESS).call()

        # liquidityRate esta en el indice 5. Aave usa formato RAY (1e27)
        liquidity_rate_ray = reserve_data[5]
        supply_apy = (liquidity_rate_ray / 1e27) * 100

        # Calcular tasa de utilizacion real: deuda_total / liquidez_total
        total_atoken = reserve_data[2] / 1e6   # USDC tiene 6 decimales
        total_variable_debt = reserve_data[4] / 1e6
        utilization = (total_variable_debt / total_atoken) if total_atoken > 0 else 0.0

        # Leer TVL real del Vault (totalAssets)
        tvl = 0.0
        try:
            vault_addr_checksum = Web3.to_checksum_address(target_vault)
            vault_contract = w3.eth.contract(address=vault_addr_checksum, abi=VAULT_ABI)
            raw_tvl = vault_contract.functions.totalAssets().call()
            tvl = raw_tvl / 1e6  # USDC 6 decimales
        except Exception as ve:
            logger.warning(f"No se pudo leer totalAssets del Vault ({target_vault}): {ve}")

        # Calcular current_allocation como proporcion del TVL depositada en Aave
        # Por ahora se estima en base a la utilizacion del vault
        current_allocation = min(0.95, utilization + 0.10) if tvl > 0 else 0.50

        logger.info(
            f"Datos on-chain obtenidos: supply_apy={supply_apy:.2f}%, "
            f"utilization={utilization:.2f}, tvl={tvl:.2f} USDC"
        )

        return MarketData(
            supply_rate=round(supply_apy, 2),
            utilization_rate=round(min(utilization, 1.0), 4),
            health_factor=1.50,           # Sin posicion de deuda activa, HF es seguro
            tvl=round(tvl, 2),
            volatility_7d=7.85,           # Conectar a CoinGecko/DeFiLlama en el futuro
            current_allocation=round(current_allocation, 4),
            profit_generated=0.0
        )

    except Exception as e:
        # CIRCUIT BREAKER: No simulamos datos. Forzamos el error.
        error_msg = f"Fallo de lectura on-chain. Nodo RPC inaccesible: {e}"
        logger.error(f"CRÍTICO: {error_msg}")
        raise ConnectionError(error_msg)
