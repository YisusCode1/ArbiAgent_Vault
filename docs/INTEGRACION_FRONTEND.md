# Integración Frontend ↔ Smart Contract — ArbiAgentVault

Este documento es para quien desarrolle la **interfaz de usuario**, la
**integración de wallets** y la **visualización de métricas** del vault y
las decisiones de la IA.

No necesitas esperar el deploy final para empezar: puedes construir la UI
contra Arbitrum Sepolia (testnet) con datos mock mientras se confirma el
asset y se despliega el contrato real.

---

## 1. Qué es este contrato, en corto

`ArbiAgentVault` es un vault **ERC-4626 estándar** (mismo estándar que usan
Yearn, Morpho, etc.), así que cualquier librería que sepa hablar ERC-4626
funciona de una. Solo tiene funciones extra para mostrar la actividad de
la IA (`executeSignal`, eventos `SignalExecuted`, `FeeCollected`).

---

## 2. Funciones que vas a usar en la UI

### Depositar / Retirar (estándar ERC-4626, heredadas automáticamente)

```solidity
function deposit(uint256 assets, address receiver) external returns (uint256 shares);
function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares);
function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets);
```

- `deposit`: el usuario mete el activo (ej. USDC), recibe shares del vault.
- `withdraw` / `redeem`: el usuario saca su activo devolviendo shares
  (`withdraw` especifica cuánto activo quiere recibir, `redeem` especifica
  cuántas shares quiere quemar — usa el que sea más intuitivo en tu UI).

Antes de `deposit`, el usuario necesita hacer `approve()` del token hacia
la dirección del vault (patrón estándar de ERC20).

### Lectura para mostrar métricas

```solidity
function totalAssets() external view returns (uint256);       // TVL del vault
function balanceOf(address user) external view returns (uint256); // shares del usuario
function convertToAssets(uint256 shares) external view returns (uint256); // shares -> valor real
function convertToShares(uint256 assets) external view returns (uint256); // valor real -> shares
function previewDeposit(uint256 assets) external view returns (uint256); // simula antes de depositar
function previewWithdraw(uint256 assets) external view returns (uint256); // simula antes de retirar
```

Con `convertToAssets(balanceOf(user))` obtienes cuánto vale realmente la
posición del usuario en este momento (incluye ganancias acumuladas).

---

## 3. Visualización de decisiones de la IA

El contrato emite estos eventos — son tu fuente de datos para el dashboard
de "actividad de la IA":

```solidity
event SignalExecuted(uint256 amountToSupply, uint256 amountToWithdraw, uint256 profitGenerated, uint256 nonce);
event FeeCollected(address indexed treasury, uint256 amount);
```

Sugerencia para la UI: cada `SignalExecuted` es un "rebalanceo" que puedes
mostrar como un item en una timeline/feed — con `amountToSupply`/
`amountToWithdraw` mostrando qué hizo la IA, y `profitGenerated` como la
ganancia detectada en ese ciclo.

Con **wagmi** esto se lee fácilmente con `useWatchContractEvent` (para
tiempo real) o `useContractEvent`/`getLogs` (para histórico).

---

## 4. Configuración de red (Arbitrum)

| Red | Chain ID | Uso |
|---|---|---|
| Arbitrum Sepolia (testnet) | `421614` | Desarrollo y demo del hackathon |
| Arbitrum One (mainnet) | `42161` | Solo si en algún momento se despliega a mainnet |

Con **RainbowKit + wagmi**, la config mínima se ve así:

```ts
import { arbitrumSepolia } from 'wagmi/chains';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';

const config = getDefaultConfig({
  appName: 'ArbiAgent',
  projectId: 'TU_WALLETCONNECT_PROJECT_ID', // sacar uno gratis en cloud.walletconnect.com
  chains: [arbitrumSepolia],
});
```

---

## 5. Cómo obtener el ABI

Una vez el contrato compile (`forge build` desde `contracts/`), el ABI
queda generado automáticamente en:

```
contracts/out/ArbiAgentVault.sol/ArbiAgentVault.json
```

El campo `"abi"` de ese JSON es lo que necesitas importar en tu proyecto
de frontend (wagmi/viem lo usa directo).

---

## 6. Pendiente de nuestro lado (equipo de contratos)

- Confirmar el asset final del vault (afecta los decimales que muestres
  en la UI — no es lo mismo formatear USDC de 6 decimales que un token de 18).
- Dirección del vault desplegado en Arbitrum Sepolia + ABI actualizado.
- Avisar cuando el contrato esté verificado en Arbiscan, para que puedas
  linkear directo a las transacciones desde la UI si quieres ese detalle
  extra en el demo.

## 7. Contexto de la decisión de la IA (para mensajes tipo "se envió X% por Y% de rendimiento")

El evento `SignalExecuted` trae los montos y la ganancia generada, pero
**no** el APY que motivó la decisión — ese dato vive en el backend, no on-chain.

Para mostrar mensajes como "Se envió 30% de lo depositado al protocolo ya
que tiene un rendimiento del 5%", el flujo es:

1. Escuchas el evento `SignalExecuted` (te da el `nonce` y los montos)
2. Con ese `nonce`, pides al backend: `GET /signals/{nonce}`
3. El backend responde con el contexto que usó la IA para decidir (APY
   detectado, razón, timestamp)

*(Pendiente de nuestro lado: confirmar el endpoint exacto con el equipo
de backend/IA — se agregará aquí cuando esté listo.)*

## IMPORTANTE
El usuario nunca interactúa con Aave directamente. `deposit()`
mete el activo al vault y entrega shares del vault mismo. Es la IA quien,
después, decide cuánto de esa liquidez mandar a Aave vía `executeSignal()`.
Las shares del usuario ganan valor con el tiempo porque representan una
porción del vault completo (capital parado + capital en Aave).

---

## 🌉 Integración del Puente Stellar -> Arbitrum (`useBridge`)

El estado global del puente Soroban ya está envuelto en `App.tsx` mediante `<BridgeProvider>` y sincronizado automáticamente con `Web3Context` (toma `wallet.account` de MetaMask como dirección de destino en Arbitrum Sepolia).

### 1. Variables de Entorno Requeridas (`client/.env`)

Agrega estas variables en tu archivo local `client/.env` antes de levantar Vite (`npm run dev`):

```env
VITE_STELLAR_RPC_URL="https://soroban-testnet.stellar.org"
VITE_STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
VITE_BRIDGE_CONTRACT_ID="CD2JE4VYB45A7YHDIODCRGZYUPGPPXCWQBH46I7MQBV3UAM6FRYGWXLG"
VITE_STELLAR_TOKEN_MESSENGER_ID="CD6DGLSQNOVDMDPUWDHWMLW3TFKIJ44WZK3KJF4IVXJZ76BDA5TTN7IP"
VITE_STELLAR_USDC_CONTRACT_ID="CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA"
VITE_ARBITRUM_DOMAIN_ID="3"
```

### 2. Propiedades y Métodos del Hook `useBridge()`

Importa el hook desde `src/hooks/useBridge`:

```tsx
import { useBridge } from "../hooks/useBridge";
```

| Propiedad / Función | Tipo | Descripción |
| :--- | :--- | :--- |
| `stellarAccount` | `string \| null` | Dirección pública de Stellar (`G...`) obtenida desde el Snap de MetaMask. |
| `stellarUsdcBalance` | `string` | Balance formateado de USDC en Stellar Testnet (ej. `"10.50"`). |
| `status` | `BridgeStatus` | Estado actual: `"idle"` \| `"building"` \| `"signing"` \| `"submitting"` \| `"completed"` \| `"error"`. |
| `txHash` | `string \| null` | Hash de la transacción en Stellar una vez confirmada (`status === "completed"`). |
| `error` | `string \| null` | Mensaje de error legible si falla la conexión, firma o simulación. |
| `connectStellarAccount()` | `() => Promise<void>` | Conecta e inicializa el Snap de Stellar dentro de MetaMask y carga el balance. |
| `bridgeUsdcToArbitrum(amount)` | `(amountUsdc: string) => Promise<void>` | Construye el XDR, solicita firma en MetaMask y envía el depósito al contrato Bridge. |
| `refreshStellarBalance()` | `() => Promise<void>` | Actualiza manualmente el balance de USDC en Stellar. |
| `resetBridge()` | `() => void` | Limpia `status`, `txHash` y `error` para iniciar una nueva operación. |

### 3. Ejemplo Rápido de Uso en un Componente (`VaultView.tsx`)

```tsx
import React, { useState } from "react";
import { useBridge } from "../hooks/useBridge";
import { useWeb3 } from "../hooks/useWeb3";

export const BridgeWidget: React.FC = () => {
  const { wallet } = useWeb3();
  const {
    stellarAccount,
    stellarUsdcBalance,
    status,
    txHash,
    error,
    connectStellarAccount,
    bridgeUsdcToArbitrum,
    resetBridge,
  } = useBridge();

  const [amount, setAmount] = useState("");
  const isBusy = status === "building" || status === "signing" || status === "submitting";

  const handleBridge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    await bridgeUsdcToArbitrum(amount);
  };

  return (
    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Puente Stellar ➔ Arbitrum</h3>
        {!stellarAccount ? (
          <button
            onClick={connectStellarAccount}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm"
          >
            Activar Stellar en MetaMask
          </button>
        ) : (
          <span className="text-xs text-slate-400">
            Balance Stellar: <strong className="text-white">{stellarUsdcBalance} USDC</strong>
          </span>
        )}
      </div>

      <form onSubmit={handleBridge} className="space-y-3">
        <input
          type="number"
          step="any"
          placeholder="Monto en USDC (ej. 10)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={!stellarAccount || isBusy}
          className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white"
        />

        <div className="text-xs text-slate-400">
          Destino Arbitrum: {wallet.account || "Conecta tu wallet EVM primero"}
        </div>

        <button
          type="submit"
          disabled={!stellarAccount || !wallet.account || isBusy}
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg font-medium"
        >
          {status === "building" && "Preparando transacción en Soroban..."}
          {status === "signing" && "Confirma la firma en MetaMask..."}
          {status === "submitting" && "Enviando a Stellar Testnet..."}
          {(status === "idle" || status === "completed" || status === "error") && "Transferir USDC a Arbitrum"}
        </button>
      </form>

      {error && (
        <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-xs">
          {error}
        </div>
      )}

      {status === "completed" && txHash && (
        <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex justify-between items-center">
          <a
            href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            Ver transacción en Stellar Expert
          </a>
          <button onClick={resetBridge} className="text-slate-300 hover:text-white ml-4">
            Nueva transferencia
          </button>
        </div>
      )}
    </div>
  );
};
```