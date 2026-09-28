🌐 **English** | [Español](README.es.md)

# ArbiAgent — AI-Powered DeFi Vault on Arbitrum

> ERC-4626 vault on Arbitrum combining real DeFi yield (Aave V3)
> with AI-driven rebalancing decisions, verified on-chain
> via cryptographic signatures (EIP-712).

Project built for the EthLima Hackathon 2026,
category **AI - Blockchain**.

---

## Live Demo

- **Frontend**: https://arbi-agent-vault.vercel.app
- **Backend / API**: https://arbiagent-vault.onrender.com

⚠️ The backend runs on a free tier that "sleeps" after a period of
inactivity — the first request after being idle can take up to 50
seconds to respond while the service wakes up.

---

## The Problem

Manually managing DeFi yield means constantly monitoring rates,
moving funds between protocols, and reacting to market changes —
impractical for most users.

## Target Audience

Someone who already holds idle stablecoins or ETH and wants them to
generate yield, but doesn't want to become an active DeFi manager
checking rates and protocols every day — they want a "deposit and
trust" experience, with the ability to verify at any time, on-chain,
that the system is acting exactly as it claims to.

## The Solution

A vault where:

1. The user deposits an asset and receives shares (ERC-4626 standard).
2. An **AI agent** analyzes market data and decides how to allocate
   capital.
3. That decision is **cryptographically signed** off-chain and only
   executed on-chain if the signature is valid — the contract never
   blindly trusts who calls the function, only who signed it.
4. Funds are deployed into **Aave V3** (Arbitrum) to generate real
   yield.
5. The user can withdraw at any time; the vault automatically
   recovers liquidity if funds are currently deployed.

---

## Architecture

```
┌─────────────┐      EIP-712 signature   ┌──────────────────┐
│  AI Agent   │ ───────────────────────▶│  Smart Contract   │
│  (Python)   │                          │  ArbiAgentVault    │
└─────────────┘                          │  (ERC-4626)         │
      ▲                                  └────────┬───────────┘
      │ market data                               │ supply/withdraw
      │                                            ▼
┌─────────────┐                          ┌──────────────────┐
│  API/Server │                          │   Aave V3 Pool     │
│  (FastAPI)  │                          │   (Arbitrum)        │
└─────────────┘                          └──────────────────┘
      ▲
      │ REST (protected by internal API key)
┌─────────────┐
│  Frontend    │
│  (React)     │
└─────────────┘
```

Detailed diagram (Mermaid, interactive on GitHub): [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md)

**Why signatures instead of just a permissioned role:** anyone can
submit the execution transaction, but the contract only processes it
if the signature matches the AI agent's private key — this allows
cryptographic, on-chain verification that the signal truly came from
the AI and was not forged or altered.

---

## Repository Structure

```
ArbiAgent/
├── client/            # Frontend (React + Vite + TypeScript)
├── contracts/          # Smart contracts (Foundry)
│   ├── src/             # ArbiAgentVault.sol
│   └── test/             # Foundry tests
├── server/              # Backend / AI agent (Python)
├── docs/                 # Cross-team integration documentation
│   ├── ARQUITECTURA.md
│   ├── INTEGRACION_IA.md
│   ├── INTEGRACION_FRONTEND.md
│   └── SLITHER_REPORT.txt
└── compose.yml          # Docker service orchestration
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Smart Contracts | Solidity ^0.8.20, Foundry, OpenZeppelin (ERC-4626, EIP-712) |
| Network | Arbitrum Sepolia (testnet) |
| DeFi Protocol Integrated | Aave V3 |
| Backend / AI Agent | Python, FastAPI, Gemini |
| Frontend | React, TypeScript, Vite |
| Wallets | Wagmi, RainbowKit |
| Infrastructure | Docker Compose, Vercel (frontend), Render (backend) |

---

## How to Run the Project

### Smart Contracts

```bash
cd contracts
forge install       # installs dependencies (OpenZeppelin, forge-std)
forge build
forge test -vv
```

### Backend / Server

```bash
cd server
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The `/api/v1/rebalance` endpoint requires an `X-API-Key` header
matching `INTERNAL_API_KEY` (set in `server/.env`). All other
endpoints are open (read-only).

### Frontend

```bash
cd client
npm install
npm run dev
```

### Everything together with Docker

```bash
docker compose up
```

---

## Deployed Contract

| Network | Address |
|---|---|
| Arbitrum Sepolia | [`0x6Ab1F75e863730de07b68fF87B67717d36cA0Df8`](https://sepolia.arbiscan.io/address/0x6Ab1F75e863730de07b68fF87B67717d36cA0Df8) |

Deployment tx: [`0x70fa62c8...df833802`](https://sepolia.arbiscan.io/tx/0x70fa62c8ca687b0c181447f0e807e0aa7e22a66e59e6268323eab5a0df833802)

This is the final version deployed for the hackathon, including the
on-chain rebalance cooldown and the fixes identified by static
analysis (see [Security & Testing](#security--testing) below).

---

## Security & Testing

- **12/12 unit tests passing** with Foundry (`forge test -vv`),
  covering deposits, AI signal execution, signature validation,
  nonce replay protection, admin access control, performance fee
  collection, just-in-time liquidity recovery on withdrawal, and the
  **8-hour rebalance cooldown** (tested explicitly: blocks immediately
  after execution, still blocks one second before the cooldown ends,
  and succeeds exactly when it elapses).
- **Static analysis with [Slither](https://github.com/crytic/slither)**
  was run against the contract; findings that applied to our own code
  (unused return values, local variable shadowing, a missing event on
  a setter) were fixed. Remaining findings are either informational
  (timestamp usage in `require` checks, which is the expected pattern
  for deadlines/cooldowns) or belong to OpenZeppelin's audited
  library code. Full report: [`docs/SLITHER_REPORT.txt`](docs/SLITHER_REPORT.txt)
- **Aave V3 integration addresses were verified against the official
  [`aave-address-book`](https://github.com/aave-dao/aave-address-book)**
  registry for Arbitrum Sepolia before deployment (Pool, USDC
  underlying asset, and aToken).
- The `/api/v1/rebalance` backend endpoint requires an internal API
  key (fail-closed: the endpoint is unusable if the key isn't
  configured), to reduce abuse/spam of the AI signing pipeline. This
  is a lightweight protection appropriate for the hackathon scope,
  not a substitute for a production-grade auth system — the key is
  bundled into the frontend build and is not meant to be secret from
  a determined attacker.

---

## On-Chain Evidence (End-to-End Proof)

The transactions below were recorded against a **previous deployment**
of the contract (before the cooldown hardening and Slither fixes).
The complete flow — deposit, EIP-712 signature from the AI agent,
on-chain execution, and withdrawal with automatic liquidity recovery
from Aave — was verified end-to-end on Arbitrum Sepolia:

| Test | What it proves | Transaction |
|---|---|---|
| Deposit + executed AI signal | The agent signs the decision, the contract verifies it and moves funds into Aave V3 | [`0x4b352f55...45353014`](https://sepolia.arbiscan.io/tx/4b352f5547e7eb189f2d28e395f77921d9f93676bec8d8c312e03e2e45353014) |
| Withdrawal with just-in-time liquidity | The vault automatically recovers funds from Aave on withdrawal, without failing | [`0xe27f1116...b250ae3d2`](https://sepolia.arbiscan.io/tx/e27f11164778d499846cd852b5fe702fcf1830fe538decf901c1a95b250ae3d2) |

**TODO before submission:** replace the two transactions above with
fresh ones against the current deployment
(`0x6Ab1F75e863730de07b68fF87B67717d36cA0Df8`), so the linked evidence
matches the exact code that's live and verified on Arbiscan.

Both transactions are publicly verifiable — anyone can inspect the
emitted events (`SignalExecuted`) and token movements directly on
Arbiscan.

---

## Relevant Design Decisions

- **ERC-4626**: industry standard for tokenized vaults, compatible
  with any tooling/library that already knows how to read it.
- **Single protocol (Aave V3)**: a deliberate decision given the
  hackathon timeframe — a real, solid integration with one protocol
  beats a shallow simulation of several. The AI agent is designed to
  evaluate multiple yield sources in the future, not coupled to a
  single protocol.
- **Single risk mode (Moderate) for this deployment**: the contract
  and decision engine support Conservative / Moderate / Aggressive
  risk profiles, but for this hackathon only the Moderate vault
  (8-hour cooldown, 80% max Aave exposure) is deployed. Conservative
  and Aggressive are on the roadmap as separate, independent vault
  contracts — each with its own isolated pool of funds, cooldown, and
  exposure limits — rather than a single shared vault with a
  selectable mode.
- **Just-in-time liquidity**: the vault automatically recovers funds
  from Aave at withdrawal time, so the user never sees a transaction
  fail just because capital was "at work."
- **Performance fee**: 10% on generated profits (adjustable by the
  owner, capped at 20%), paid in the vault's own shares to the
  project treasury. The fee is charged globally at each rebalance
  (on the AI-reported profit for the whole vault), not per-user at
  withdrawal time — every user's share value reflects the fee already
  applied. `profit_generated` is currently hardcoded to `0` in the
  backend pending a verified on-chain profit calculation, so this
  code path is not active yet in this deployment.
- **EIP-712 verification**: every rebalance signal is signed off-chain
  and verified on-chain, preventing the contract from relying solely
  on `msg.sender`-based access control.
- **On-chain rebalance cooldown**: a fixed 8-hour cooldown between
  `executeSignal()` calls is enforced by the contract itself (not
  just shown in the UI), shared by the whole vault — not per user.

---

## Team and Roles

| Role | Responsible |
|---|---|
| Smart Contracts / On-chain Integration | Jesús Alfaro |
| AI Agent / Middleware | Dante Olivas |
| Frontend / UX / Wallets | Geraldin Nuñez / Dante Olivas |
| Product / Backend API | Dante Olivas / Nayit Ruiz |

---

## Note on Demo Mode

This project runs on **testnet (Arbitrum Sepolia)** with test funds.
No real assets are handled. All operations shown in the interface
are verifiable on-chain via Arbiscan, but carry no real monetary
value.
