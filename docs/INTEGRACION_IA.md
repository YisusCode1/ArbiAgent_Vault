# Integración IA ↔ Smart Contract — ArbiAgentVault

Este documento es para quien desarrolle el **agente de IA** y el **middleware/API**
que conecta las decisiones del modelo con el contrato `ArbiAgentVault`.

No necesitas esperar la decisión del activo (asset) del vault: la interfaz que
vas a usar no depende de eso.

---

## 1. Qué hace tu backend

1. Tu modelo de IA decide: cuánto depositar en Aave, cuánto retirar, y cuánta
   ganancia se generó desde el último rebalanceo.
2. Tu backend **firma esa decisión** con la clave privada del agente (EIP-712).
3. Tu backend (o cualquiera) envía la transacción `executeSignal(...)` al contrato.
4. El contrato verifica la firma on-chain y solo ejecuta si es válida.

La clave privada del agente **nunca se sube a la blockchain** ni se comparte:
solo firma mensajes off-chain. La dirección pública correspondiente
(`aiAgent`) es la que se configura en el contrato al desplegarlo.

---

## 2. Función que vas a llamar

```solidity
function executeSignal(
    uint256 amountToSupply,     // cuanto depositar en Aave (0 si no aplica)
    uint256 amountToWithdraw,   // cuanto retirar de Aave (0 si no aplica)
    uint256 profitGenerated,    // ganancia detectada desde el ultimo rebalanceo
    uint256 nonce,              // numero unico, no reusar
    uint256 deadline,           // timestamp unix limite de validez
    bytes calldata signature    // tu firma EIP-712
) external
```

Todos los montos van con la misma cantidad de decimales que tenga el asset
(lo confirmamos cuando se decida cuál usar).

---

## 3. Esquema de firma (EIP-712)

**Dominio** (fijo, no cambia):

```
name: "ArbiAgentVault"
version: "1"
chainId: <el del deploy, ej. 421614 para Arbitrum Sepolia>
verifyingContract: <direccion del vault desplegado>
```

**Tipo del mensaje:**

```
RebalanceSignal(
    uint256 amountToSupply,
    uint256 amountToWithdraw,
    uint256 profitGenerated,
    uint256 nonce,
    uint256 deadline
)
```

---

## 4. Ejemplo en Python (con `eth_account`)

```bash
pip install eth-account web3
```

```python
from eth_account import Account
from eth_account.messages import encode_typed_data

# Clave privada del agente de IA (guardala en variable de entorno, NUNCA hardcodeada en repo real)
AI_AGENT_PRIVATE_KEY = "0x..."

# Estos 3 valores dependen del deploy, se actualizan cuando el contrato este en testnet
CHAIN_ID = 421614  # Arbitrum Sepolia
VAULT_ADDRESS = "0x..."  # direccion del vault desplegado

def sign_rebalance_signal(amount_to_supply: int, amount_to_withdraw: int,
                            profit_generated: int, nonce: int, deadline: int) -> str:
    """
    Firma una senal de rebalanceo siguiendo el esquema EIP-712 del contrato.
    Devuelve la firma en formato hex lista para enviar en executeSignal().
    """
    typed_data = {
        "types": {
            "EIP712Domain": [
                {"name": "name", "type": "string"},
                {"name": "version", "type": "string"},
                {"name": "chainId", "type": "uint256"},
                {"name": "verifyingContract", "type": "address"},
            ],
            "RebalanceSignal": [
                {"name": "amountToSupply", "type": "uint256"},
                {"name": "amountToWithdraw", "type": "uint256"},
                {"name": "profitGenerated", "type": "uint256"},
                {"name": "nonce", "type": "uint256"},
                {"name": "deadline", "type": "uint256"},
            ],
        },
        "primaryType": "RebalanceSignal",
        "domain": {
            "name": "ArbiAgentVault",
            "version": "1",
            "chainId": CHAIN_ID,
            "verifyingContract": VAULT_ADDRESS,
        },
        "message": {
            "amountToSupply": amount_to_supply,
            "amountToWithdraw": amount_to_withdraw,
            "profitGenerated": profit_generated,
            "nonce": nonce,
            "deadline": deadline,
        },
    }

    account = Account.from_key(AI_AGENT_PRIVATE_KEY)
    signable_message = encode_typed_data(full_message=typed_data)
    signed = account.sign_message(signable_message)

    return signed.signature.hex()


# --- Ejemplo de uso ---
if __name__ == "__main__":
    import time

    signature = sign_rebalance_signal(
        amount_to_supply=300 * 10**18,   # ajustar segun decimales del asset final
        amount_to_withdraw=0,
        profit_generated=0,
        nonce=1,                          # debe ser unico, sugerido: timestamp o contador incremental
        deadline=int(time.time()) + 3600, # valido por 1 hora
    )
    print("Firma generada:", signature)
```

Luego, para enviar la transacción on-chain (con `web3.py`), llamas a
`executeSignal(amountToSupply, amountToWithdraw, profitGenerated, nonce, deadline, signature)`
usando el ABI del contrato (se comparte apenas esté compilado/verificado).

---

## 5. Cosas importantes para tu API/middleware

- **`nonce` no se puede reusar** — el contrato lo rechaza. Recomendación simple
  para el hackathon: usar `int(time.time())` o un contador que persistas en tu
  backend (ej. en una base de datos o archivo simple).
- **`deadline`** — dale un margen razonable (ej. 5-15 min) para que la
  transacción tenga tiempo de confirmarse en la red sin quedar "vieja".
- El endpoint de tu API que dispare esto debería, como mínimo:
  1. Recibir/calcular la decisión del modelo.
  2. Firmar con la función de arriba.
  3. Enviar la tx a la red (o devolver la firma para que otro servicio la envíe).
  4. Loggear el evento `SignalExecuted` emitido por el contrato como confirmación.

---

## 6. Pendiente de nuestro lado (equipo de contratos)

- Confirmar el asset final del vault (USDC de test u otro) — no bloquea tu trabajo.
- Compartir la dirección del vault desplegado + ABI en cuanto esté verificado en Arbiscan.
- Compartir la dirección pública del `aiAgent` que se configure en el deploy
  (la clave privada correspondiente la manejas tú/tu equipo de IA).
