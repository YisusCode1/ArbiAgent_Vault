# ArbiAgent — AI-Powered DeFi Vault en Arbitrum

> Bóveda ERC-4626 en Arbitrum que combina rendimiento DeFi real (Aave V3)
> con decisiones de rebalanceo impulsadas por IA, verificadas on-chain
> mediante firmas criptográficas (EIP-712).

Proyecto construido para el EthLima Hackaton 2026
categoría **IA - Blockchain**.

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

**Por qué firma en vez de solo un rol autorizado:** cualquiera puede
enviar la transacción de ejecución, pero el contrato solo la procesa
si la firma corresponde a la clave privada del agente de IA — esto
permite verificar on-chain, de forma criptográfica, que la señal
realmente vino de la IA y no fue falsificada ni alterada.

---

##  Estructura del repositorio

```
ArbiAgent/
├── cliente/          # Frontend (React + Vite + TypeScript)
├── contracts/        # Smart contracts (Foundry)
│   ├── src/           # ArbiAgentVault.sol
│   └── test/           # Tests con Foundry
├── server/            # Backend / agente de IA (Python)
├── docs/               # Documentacion de integracion entre equipos
│   ├── INTEGRACION_IA.md
│   ├── INTEGRACION_FRONTEND.md
│   └── ORIENTACION_FRONTEND.md
└── compose.yml        # Orquestacion de servicios con Docker
```

---

##  Stack tecnológico

| Capa | Tecnología |
|---|---|
| Smart Contracts | Solidity ^0.8.20, Foundry, OpenZeppelin (ERC-4626, EIP-712) |
| Red | Arbitrum Sepolia (testnet) |
| Protocolo DeFi integrado | Aave V3 |
| Backend / Agente IA | Python, FastAPI |
| Frontend | React, TypeScript, Vite |
| Wallets | Wagmi, RainbowKit |
| Infraestructura | Docker Compose |

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
pip install -r requeriments.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
cd cliente
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
| Arbitrum Sepolia | `[pendiente de deploy]` |

Verificado en Arbiscan: `[pendiente]`

---

##  Decisiones de diseño relevantes

- **ERC-4626**: estándar de la industria para vaults tokenizados,
  compatible con cualquier herramienta/librería que ya sepa leerlo.
- **Un solo protocolo (Aave V3)**: decisión deliberada dado el tiempo
  del hackathon — mejor una integración real y sólida con un protocolo
  que una simulación superficial de varios.
- **Liquidez just-in-time**: el vault recupera automáticamente fondos
  desde Aave al momento del retiro, para que el usuario nunca vea
  fallar una transacción solo porque el capital estaba "trabajando".
- **Comisión de desempeño**: 10% sobre las ganancias generadas (ajustable
  por el owner, con tope de 20%), pagada en shares del propio vault hacia
  la tesorería del proyecto.

---

##  Equipo y roles

| Rol | Responsable |
|---|---|
| Smart Contracts / Integración on-chain | [tu nombre] |
| Agente de IA / Middleware | [nombre] |
| Frontend / UX / Wallets | [nombre] |
| Producto / Backend API | [nombre] |

---

##  Nota sobre el modo demo

Este proyecto corre en **testnet (Arbitrum Sepolia)** con fondos de
prueba. No se manejan activos reales. Todas las operaciones mostradas
en la interfaz son verificables on-chain en Arbiscan, pero sin valor
monetario real.
