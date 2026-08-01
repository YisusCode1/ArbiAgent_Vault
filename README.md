# ArbiAgent - AI DeFi Vault en Arbitrum

Un Vault DeFi (bóveda de inversión automatizada) que utiliza un agente de IA para analizar el mercado en tiempo real y rebalancear fondos hacia los protocolos con mayor rendimiento y menor riesgo en Arbitrum.

## Arquitectura del Proyecto

```
presentacion/
|-- client/              - Frontend (React + Vite + TailwindCSS + Ethers.js)
|   `-- src/
|       |-- components/  - Navbar, VaultView, EstrategiaIA, Actividad, ComoFunciona
|       |-- context/     - Web3Context (Wallet MetaMask, Red Arbitrum Sepolia)
|       |-- hooks/       - useWeb3, useVault, useStrategy (Custom Hooks)
|       |-- services/    - web3Service, apiService
|       |-- App.tsx      - Componente principal
|       `-- main.tsx     - Punto de entrada React
|-- server/              - Backend IA (Python + FastAPI)
|   `-- app/
|       `-- main.py      - API REST con endpoints de IA y Startbase
|-- contracts/           - Smart Contracts (Solidity + Foundry)
|   |-- src/
|   |   `-- ArbiAgentVault.sol   - Vault ERC-4626 con firmas EIP-712
|   `-- test/
|       `-- ArbiAgentVault.t.sol - Tests unitarios
|-- docs/                - Documentacion de integracion
|-- compose.yml          - Docker Compose (API + Client)
`-- README.md
```

## Ejecucion Rapida

### Con Docker (Recomendado)
```bash
docker compose up --build
```
- Frontend: http://localhost:5173
- API Backend: http://localhost:8000
- API Docs (Swagger): http://localhost:8000/docs

### Sin Docker (Desarrollo local)

Frontend:
```bash
cd client
npm install
npm run dev
```

Backend:
```bash
cd server
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Smart Contracts:
```bash
cd contracts
forge build
forge test
```

## Tecnologias

| Componente | Stack |
|---|---|
| Frontend | React 18, Vite, TailwindCSS, TypeScript, Lucide Icons, Ethers.js v6 |
| Backend | Python 3.13, FastAPI, Web3.py, Scikit-learn, Pandas |
| Contratos | Solidity 0.8.20, Foundry, OpenZeppelin (ERC-4626, EIP-712, ECDSA) |
| Infraestructura | Docker, Docker Compose |
| Blockchain | Arbitrum Sepolia (Testnet, Chain ID 421614) |

## Smart Contracts

| Contrato | Descripcion |
|---|---|
| ArbiAgentVault.sol | Vault ERC-4626 que invierte en Aave V3 y ejecuta rebalanceos firmados por IA via EIP-712 |

## Red y Explorador

- Red: Arbitrum Sepolia (Chain ID: 421614 / 0x66eee)
- Explorador: https://sepolia.arbiscan.io/

## Licencia

MIT License - Ver LICENSE
