# ArbiAgent — AI-Powered DeFi Vault en Arbitrum

> Bóveda ERC-4626 en Arbitrum que combina rendimiento DeFi real (Aave V3)
> con decisiones de rebalanceo impulsadas por IA, verificadas on-chain
> mediante firmas criptográficas (EIP-712).

Proyecto construido para el EthLima Hackaton 2026
categoría **IA - Blockchain**.

---

##  Demo en vivo

- **Frontend**: https://arbi-agent-vault.vercel.app
- **Backend / API**: https://arbiagent-vault.onrender.com

⚠️ El backend corre en un plan gratuito que "duerme" tras un rato de
inactividad — la primera petición después de estar inactivo puede
tardar hasta 50 segundos en responder mientras el servicio despierta.

---

##  El problema

Gestionar rendimiento en DeFi manualmente implica monitorear tasas,
mover fondos entre protocolos, y reaccionar a cambios de mercado
constantemente — algo poco práctico para la mayoría de usuarios.

##  La solución

Un vault donde:

1. El usuario deposita un activo y recibe shares (ERC-4626 estándar).
2. Un **agente de IA** analiza datos de mercado y decide cómo asignar
   el capital.
3. Esa decisión se **firma criptográficamente** off-chain y se ejecuta
   on-chain solo si la firma es válida — el contrato nunca confía
   ciegamente en quién llama la función, sino en quién la firmó.
4. Los fondos se despliegan en **Aave V3** (Arbitrum) para generar
   rendimiento real.
5. El usuario retira en cualquier momento; el vault recupera liquidez
   automáticamente si los fondos están deployados.

---

##  Arquitectura

```
┌─────────────┐      firma EIP-712      ┌──────────────────┐
│  Agente IA  │ ───────────────────────▶│  Smart Contract   │
│  (Python)   │                          │  ArbiAgentVault    │
└─────────────┘                          │  (ERC-4626)         │
      ▲                                  └────────┬───────────┘
      │ datos de mercado                          │ supply/withdraw
      │                                            ▼
┌─────────────┐                          ┌──────────────────┐
│  API/Server │                          │   Aave V3 Pool     │
│  (FastAPI)  │                          │   (Arbitrum)        │
└─────────────┘                          └──────────────────┘
      ▲
      │ REST
┌─────────────┐
│  Frontend    │
│  (React)     │
└─────────────┘
```

Diagrama detallado (Mermaid, interactivo en GitHub): [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md)

**Por qué firma en vez de solo un rol autorizado:** cualquiera puede
enviar la transacción de ejecución, pero el contrato solo la procesa
si la firma corresponde a la clave privada del agente de IA — esto
permite verificar on-chain, de forma criptográfica, que la señal
realmente vino de la IA y no fue falsificada ni alterada.

---

##  Estructura del repositorio

```
ArbiAgent/
├── client/            # Frontend (React + Vite + TypeScript)
├── contracts/          # Smart contracts (Foundry)
│   ├── src/             # ArbiAgentVault.sol
│   └── test/             # Tests con Foundry
├── server/              # Backend / agente de IA (Python)
├── docs/                 # Documentacion de integracion entre equipos
│   ├── ARQUITECTURA.md
│   ├── INTEGRACION_IA.md
│   ├── INTEGRACION_FRONTEND.md
│   └── ORIENTACION_FRONTEND.md
└── compose.yml          # Orquestacion de servicios con Docker
```

---

##  Stack tecnológico

| Capa | Tecnología |
|---|---|
| Smart Contracts | Solidity ^0.8.20, Foundry, OpenZeppelin (ERC-4626, EIP-712) |
| Red | Arbitrum Sepolia (testnet) |
| Protocolo DeFi integrado | Aave V3 |
| Backend / Agente IA | Python, FastAPI, Gemini |
| Frontend | React, TypeScript, Vite |
| Wallets | Wagmi, RainbowKit |
| Infraestructura | Docker Compose, Vercel (frontend), Render (backend) |

---

##  Cómo correr el proyecto

### Smart Contracts

```bash
cd contracts
forge install       # instala dependencias (OpenZeppelin, forge-std)
forge build
forge test -vv
```

### Backend / Servidor

```bash
cd server
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
cd client
npm install
npm run dev
```

### Todo junto con Docker

```bash
docker compose up
```

---

##  Contrato desplegado

| Red | Dirección |
|---|---|
| Arbitrum Sepolia | `0x9271faFfEa4e430352F9d6a585b712b0922102C3` |

Verificado en Arbiscan: https://sepolia.arbiscan.io/address/0x9271faFfEa4e430352F9d6a585b712b0922102C3#code

---

##  Evidencia on-chain (pruebas end-to-end)

El flujo completo — depósito, firma EIP-712 del agente de IA, ejecución
on-chain, y retiro con recuperación automática de liquidez desde Aave —
fue probado con transacciones reales en Arbitrum Sepolia:

| Prueba | Qué demuestra | Transacción |
|---|---|---|
| Depósito + señal de IA ejecutada | El agente firma la decisión, el contrato la verifica y mueve fondos a Aave V3 | [`0x4b352f55...45353014`](https://sepolia.arbiscan.io/tx/4b352f5547e7eb189f2d28e395f77921d9f93676bec8d8c312e03e2e45353014) |
| Retiro con liquidez just-in-time | El vault recupera fondos de Aave automáticamente al retirar, sin fallar | [`0xe27f1116...b250ae3d2`](https://sepolia.arbiscan.io/tx/e27f11164778d499846cd852b5fe702fcf1830fe538decf901c1a95b250ae3d2) |

Ambas transacciones son públicamente verificables — cualquiera puede
revisar los eventos emitidos (`SignalExecuted`) y los movimientos de
tokens directamente en Arbiscan.

---

##  Decisiones de diseño relevantes

- **ERC-4626**: estándar de la industria para vaults tokenizados,
  compatible con cualquier herramienta/librería que ya sepa leerlo.
- **Un solo protocolo (Aave V3)**: decisión deliberada dado el tiempo
  del hackathon — mejor una integración real y sólida con un protocolo
  que una simulación superficial de varios. El agente de IA está
  diseñado para evaluar múltiples fuentes de rendimiento a futuro,
  no acoplado a un solo protocolo.
- **Liquidez just-in-time**: el vault recupera automáticamente fondos
  desde Aave al momento del retiro, para que el usuario nunca vea
  fallar una transacción solo porque el capital estaba "trabajando".
- **Comisión de desempeño**: 10% sobre las ganancias generadas (ajustable
  por el owner, con tope de 20%), pagada en shares del propio vault hacia
  la tesorería del proyecto.
- **Verificación EIP-712**: cada señal de rebalanceo se firma off-chain
  y se verifica on-chain, evitando que el contrato dependa únicamente
  de un control de acceso basado en `msg.sender`.

---

##  Equipo y roles

| Rol | Responsable |
|---|---|
| Smart Contracts / Integración on-chain | Jesús Alfaro |
| Agente de IA / Middleware | Dante Olivas |
| Frontend / UX / Wallets | Geraldin Nuñez / Dante Olivas |
| Producto / Backend API | Dante Olivas / Nayit Ruiz |

---

##  Nota sobre el modo demo

Este proyecto corre en **testnet (Arbitrum Sepolia)** con fondos de
prueba. No se manejan activos reales. Todas las operaciones mostradas
en la interfaz son verificables on-chain en Arbiscan, pero sin valor
monetario real.
