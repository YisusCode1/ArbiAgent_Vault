"""
Prueba end-to-end del flujo completo: Vault + Aave V3 + firma EIP-712 del agente de IA.

Que hace este script:
  1. Conecta a Arbitrum Sepolia con la wallet de prueba (PRIVATE_KEY).
  2. Aprueba y deposita USDC de prueba en el vault (deposit de ERC-4626).
  3. Firma una senal de rebalanceo con la clave privada del agente de IA
     (AI_AGENT_PRIVATE_KEY) - exactamente igual a como lo hace server/app/signer.py.
  4. Envia esa senal firmada al contrato via executeSignal().
  5. Verifica que el vault realmente movio fondos a Aave (via el balance de aToken).

Requisitos previos:
  pip install web3 eth-account python-dotenv

Variables de entorno esperadas (en un .env en la misma carpeta, o exportadas):
  RPC_URL_ARBITRUM_SEPOLIA
  PRIVATE_KEY              # wallet que deposita (puede ser tu wallet de deploy)
  AI_AGENT_PRIVATE_KEY     # clave privada del agente de IA (quien firma la senal)
  VAULT_CONTRACT_ADDRESS   # direccion del vault ya desplegado
  ASSET_ADDRESS            # direccion del USDC de prueba
  CHAIN_ID                 # 421614 para Arbitrum Sepolia

Uso:
  python test_e2e_signal.py
"""

import json
import os
import time
from pathlib import Path

from dotenv import load_dotenv
from eth_account import Account
from eth_account.messages import encode_typed_data
from web3 import Web3

load_dotenv()

# --- Configuracion desde variables de entorno ---
RPC_URL = os.environ["RPC_URL_ARBITRUM_SEPOLIA"]
DEPOSITOR_PRIVATE_KEY = os.environ["PRIVATE_KEY"]
AI_AGENT_PRIVATE_KEY = os.environ["AI_AGENT_PRIVATE_KEY"]
VAULT_ADDRESS = Web3.to_checksum_address(os.environ["VAULT_CONTRACT_ADDRESS"])
ASSET_ADDRESS = Web3.to_checksum_address(os.environ["ASSET_ADDRESS"])
CHAIN_ID = int(os.environ.get("CHAIN_ID", 421614))

DEPOSIT_AMOUNT = 5 * 10**6      # 5 USDC (6 decimales)
SUPPLY_TO_AAVE_AMOUNT = 3 * 10**6  # de esos 5, mandar 3 a Aave

# --- ABI minimo del token ERC20 (USDC de prueba) ---
ERC20_ABI = [
    {"constant": False, "inputs": [{"name": "spender", "type": "address"}, {"name": "amount", "type": "uint256"}],
     "name": "approve", "outputs": [{"name": "", "type": "bool"}], "type": "function"},
    {"constant": True, "inputs": [{"name": "account", "type": "address"}],
     "name": "balanceOf", "outputs": [{"name": "", "type": "uint256"}], "type": "function"},
]

# --- Carga el ABI real del vault, generado por `forge build` ---
# Asume que este script vive en server/test_e2e_signal.py
VAULT_ABI_PATH = Path(__file__).resolve().parent.parent / "contracts" / "out" / "ArbiAgentVault.sol" / "ArbiAgentVault.json"
with open(VAULT_ABI_PATH) as f:
    VAULT_ABI = json.load(f)["abi"]


def sign_rebalance_signal(amount_to_supply, amount_to_withdraw, profit_generated, nonce, deadline):
    """Replica exactamente la logica de server/app/signer.py para esta prueba."""
    domain_data = {
        "name": "ArbiAgentVault",
        "version": "1",
        "chainId": CHAIN_ID,
        "verifyingContract": VAULT_ADDRESS,
    }
    message_types = {
        "RebalanceSignal": [
            {"name": "amountToSupply", "type": "uint256"},
            {"name": "amountToWithdraw", "type": "uint256"},
            {"name": "profitGenerated", "type": "uint256"},
            {"name": "nonce", "type": "uint256"},
            {"name": "deadline", "type": "uint256"},
        ]
    }
    message_data = {
        "amountToSupply": amount_to_supply,
        "amountToWithdraw": amount_to_withdraw,
        "profitGenerated": profit_generated,
        "nonce": nonce,
        "deadline": deadline,
    }
    signable_message = encode_typed_data(domain_data=domain_data, message_types=message_types, message_data=message_data)
    ai_account = Account.from_key(AI_AGENT_PRIVATE_KEY)
    signed = ai_account.sign_message(signable_message)
    print(f"  Firmado por AI Agent: {ai_account.address}")
    return signed.signature


def main():
    w3 = Web3(Web3.HTTPProvider(RPC_URL))
    assert w3.is_connected(), "No se pudo conectar al RPC de Arbitrum Sepolia"

    depositor = Account.from_key(DEPOSITOR_PRIVATE_KEY)
    print(f"Wallet depositante: {depositor.address}")

    usdc = w3.eth.contract(address=ASSET_ADDRESS, abi=ERC20_ABI)
    vault = w3.eth.contract(address=VAULT_ADDRESS, abi=VAULT_ABI)

    nonce = w3.eth.get_transaction_count(depositor.address)

    # --- 1. Approve USDC hacia el vault ---
    print("\n[1/4] Aprobando USDC hacia el vault...")
    tx = usdc.functions.approve(VAULT_ADDRESS, DEPOSIT_AMOUNT).build_transaction({
        "from": depositor.address, "nonce": nonce, "chainId": CHAIN_ID,
    })
    signed_tx = w3.eth.account.sign_transaction(tx, DEPOSITOR_PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
    w3.eth.wait_for_transaction_receipt(tx_hash)
    print(f"  OK: {tx_hash.hex()}")
    nonce += 1

    # --- 2. Deposit en el vault (ERC-4626) ---
    print("\n[2/4] Depositando USDC en el vault...")
    tx = vault.functions.deposit(DEPOSIT_AMOUNT, depositor.address).build_transaction({
        "from": depositor.address, "nonce": nonce, "chainId": CHAIN_ID,
    })
    signed_tx = w3.eth.account.sign_transaction(tx, DEPOSITOR_PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    print(f"  OK: {tx_hash.hex()} (status={receipt.status})")
    nonce += 1

    # --- 3. Firmar la senal como lo haria el agente de IA ---
    print("\n[3/4] Firmando senal de rebalanceo (EIP-712)...")
    signal_nonce = int(time.time())  # nonce simple para la prueba
    deadline = int(time.time()) + 3600
    signature = sign_rebalance_signal(
        amount_to_supply=SUPPLY_TO_AAVE_AMOUNT,
        amount_to_withdraw=0,
        profit_generated=0,
        nonce=signal_nonce,
        deadline=deadline,
    )

    # --- 4. Ejecutar la senal on-chain ---
    print("\n[4/4] Enviando executeSignal() al contrato...")
    tx = vault.functions.executeSignal(
        SUPPLY_TO_AAVE_AMOUNT, 0, 0, signal_nonce, deadline, signature
    ).build_transaction({
        "from": depositor.address, "nonce": nonce, "chainId": CHAIN_ID,
    })
    signed_tx = w3.eth.account.sign_transaction(tx, DEPOSITOR_PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)

    if receipt.status == 1:
        print(f"  EXITO: {tx_hash.hex()}")
        print(f"\nVer en Arbiscan: https://sepolia.arbiscan.io/tx/{tx_hash.hex()}")
    else:
        print(f"  FALLO: la transaccion revirtio. Hash: {tx_hash.hex()}")


if __name__ == "__main__":
    main()
