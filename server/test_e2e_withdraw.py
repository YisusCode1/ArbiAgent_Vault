"""
Prueba end-to-end del RETIRO: confirma que el vault recupera liquidez de
Aave automaticamente cuando el balance liquido no alcanza para cubrir el
retiro solicitado (el fix de _withdraw() que agregamos al contrato).

Que hace este script:
  1. Lee el estado actual del vault: balance liquido, balance en Aave (aToken),
     y cuanto puede retirar la wallet (maxWithdraw).
  2. Calcula un monto a retirar que sea MAYOR al balance liquido del vault -
     esto obliga al contrato a jalar la diferencia desde Aave antes de
     completar la transferencia.
  3. Ejecuta el retiro.
  4. Verifica que el aToken del vault bajo (se recupero liquidez de Aave)
     y que la wallet recibio el USDC correctamente.

Requisitos previos:
  pip install web3 eth-account python-dotenv
  (mismas dependencias que test_e2e_signal.py)

Variables de entorno esperadas (mismo .env que test_e2e_signal.py):
  RPC_URL_ARBITRUM_SEPOLIA
  PRIVATE_KEY              # wallet que va a retirar (debe tener shares del vault)
  VAULT_CONTRACT_ADDRESS
  ASSET_ADDRESS
  CHAIN_ID

Uso:
  python test_e2e_withdraw.py

Nota: corre esto DESPUES de test_e2e_signal.py, ya que necesitas tener
shares del vault (haber depositado) para poder retirar algo.
"""

import json
import os
from pathlib import Path

from dotenv import load_dotenv
from eth_account import Account
from web3 import Web3

load_dotenv()

RPC_URL = os.environ["RPC_URL_ARBITRUM_SEPOLIA"]
WITHDRAWER_PRIVATE_KEY = os.environ["PRIVATE_KEY"]
VAULT_ADDRESS = Web3.to_checksum_address(os.environ["VAULT_CONTRACT_ADDRESS"])
ASSET_ADDRESS = Web3.to_checksum_address(os.environ["ASSET_ADDRESS"])
CHAIN_ID = int(os.environ.get("CHAIN_ID", 421614))

EXTRA_TO_FORCE_AAVE_PULL = 1 * 10**6  # 1 USDC extra sobre el liquido, para forzar el pull

ERC20_ABI = [
    {"constant": True, "inputs": [{"name": "account", "type": "address"}],
     "name": "balanceOf", "outputs": [{"name": "", "type": "uint256"}], "type": "function"},
]

VAULT_ABI_PATH = Path(__file__).resolve().parent.parent / "contracts" / "out" / "ArbiAgentVault.sol" / "ArbiAgentVault.json"
with open(VAULT_ABI_PATH) as f:
    VAULT_ABI = json.load(f)["abi"]


def to_units(raw, decimals=6):
    return raw / (10 ** decimals)


def main():
    w3 = Web3(Web3.HTTPProvider(RPC_URL))
    assert w3.is_connected(), "No se pudo conectar al RPC de Arbitrum Sepolia"

    withdrawer = Account.from_key(WITHDRAWER_PRIVATE_KEY)
    print(f"Wallet que retira: {withdrawer.address}")

    usdc = w3.eth.contract(address=ASSET_ADDRESS, abi=ERC20_ABI)
    vault = w3.eth.contract(address=VAULT_ADDRESS, abi=VAULT_ABI)
    a_token_address = vault.functions.aToken().call()
    a_token = w3.eth.contract(address=a_token_address, abi=ERC20_ABI)

    # --- 1. Estado ANTES del retiro ---
    print("\n[1/3] Leyendo estado actual del vault...")
    liquid_before = usdc.functions.balanceOf(VAULT_ADDRESS).call()
    a_token_before = a_token.functions.balanceOf(VAULT_ADDRESS).call()
    max_withdraw = vault.functions.maxWithdraw(withdrawer.address).call()
    wallet_usdc_before = usdc.functions.balanceOf(withdrawer.address).call()

    print(f"  Liquido en el vault:      {to_units(liquid_before)} USDC")
    print(f"  En Aave (aToken):          {to_units(a_token_before)} USDC")
    print(f"  Maximo que puedes retirar: {to_units(max_withdraw)} USDC")

    if max_withdraw == 0:
        print("\nNo tienes shares en el vault. Corre primero test_e2e_signal.py para depositar.")
        return

    # --- 2. Calcula un monto que FUERCE el pull desde Aave ---
    withdraw_amount = min(liquid_before + EXTRA_TO_FORCE_AAVE_PULL, max_withdraw)
    forces_pull = withdraw_amount > liquid_before

    print(f"\n[2/3] Retirando {to_units(withdraw_amount)} USDC "
          f"({'FORZANDO recuperacion desde Aave' if forces_pull else 'cubierto con liquidez propia'})...")

    nonce = w3.eth.get_transaction_count(withdrawer.address)
    tx = vault.functions.withdraw(
        withdraw_amount, withdrawer.address, withdrawer.address
    ).build_transaction({
        "from": withdrawer.address, "nonce": nonce, "chainId": CHAIN_ID,
    })
    signed_tx = w3.eth.account.sign_transaction(tx, WITHDRAWER_PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)

    if receipt.status != 1:
        print(f"  FALLO: la transaccion revirtio. Hash: {tx_hash.hex()}")
        return

    print(f"  OK: {tx_hash.hex()}")

    # --- 3. Estado DESPUES del retiro ---
    print("\n[3/3] Verificando resultado...")
    a_token_after = a_token.functions.balanceOf(VAULT_ADDRESS).call()
    wallet_usdc_after = usdc.functions.balanceOf(withdrawer.address).call()

    print(f"  aToken del vault: {to_units(a_token_before)} -> {to_units(a_token_after)} USDC")
    print(f"  Tu balance USDC:  {to_units(wallet_usdc_before)} -> {to_units(wallet_usdc_after)} USDC")

    if forces_pull and a_token_after < a_token_before:
        print("\nEXITO: el vault recupero liquidez de Aave automaticamente para completar el retiro.")
    elif not forces_pull:
        print("\nEXITO: retiro cubierto con liquidez propia (no hizo falta recuperar de Aave esta vez).")
    else:
        print("\nADVERTENCIA: se esperaba una reduccion en el balance de aToken y no se detecto.")

    print(f"\nVer en Arbiscan: https://sepolia.arbiscan.io/tx/{tx_hash.hex()}")


if __name__ == "__main__":
    main()
