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
