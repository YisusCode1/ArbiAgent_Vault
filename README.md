🌐 **English** | [Español](README.es.md)

# ArbiAgent — AI-Powered DeFi Vaults on Arbitrum

> Three independent ERC-4626 vaults on Arbitrum (Conservative, Moderate,
> Aggressive) combining real DeFi yield (Aave V3) with AI-driven
> rebalancing decisions, verified on-chain via cryptographic
> signatures (EIP-712).

Project built for the EthLima Hackathon 2026,
category **AI - Blockchain**.

---

## Live Demo

- **Frontend**: https://arbi-agent-vault.vercel.app
- **Backend / API**: https://arbiagent-vault-ziq4.onrender.com

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

A set of vaults, one per risk profile, where:

1. The user picks a risk mode, deposits USDC into that mode's vault and
   receives shares (ERC-4626 standard).
2. An **AI agent** analyzes market data and decides how to allocate
   that vault's capital, within the limits of its risk mode.
3. That decision is **cryptographically signed** off-chain and only
   executed on-chain if the signature is valid — the contract never
   blindly trusts who calls the function, only who signed it.
4. Funds are deployed into **Aave V3** (Arbitrum) to generate real
   yield.
5. The user can withdraw at any time; the vault automatically
   recovers liquidity if funds are currently deployed.

---

## Risk Modes and Vaults

Each risk mode is its own smart contract, with its own pool of funds,
its own shares, its own rebalance cooldown and its own exposure limits.
Funds are **not shared between modes**: depositing in Moderate does not
put any money in Conservative or Aggressive.

| Mode | Rebalance cooldown | Contract (Arbitrum Sepolia) |
|---|---|---|
| Conservative | 24 hours | [`0xc4e031259cA7d2390408F10608fAE03982a47F39`](https://sepolia.arbiscan.io/address/0xc4e031259cA7d2390408F10608fAE03982a47F39) |
| Moderate | 8 hours | [`0x6Ab1F75e863730de07b68fF87B67717d36cA0Df8`](https://sepolia.arbiscan.io/address/0x6Ab1F75e863730de07b68fF87B67717d36cA0Df8) |
| Aggressive | 2 hours | [`0x1D48956912c301C0Da67A10F3bC47BB2c8dEad0d`](https://sepolia.arbiscan.io/address/0x1D48956912c301C0Da67A10F3bC47BB2c8dEad0d) |

Moving a position from one mode to another means withdrawing from one
vault and depositing into the other (two separate transactions, plus
the USDC approval). Nothing blocks the user from holding positions in
several modes at once.

Within a vault, the AI rebalances the **whole vault**, not each user
individually. A rebalance only moves funds between "idle USDC" and
"supplied to Aave" inside the contract: it never touches anyone's
shares, and a withdrawal only burns the shares of the wallet that
requests it.

---

## Architecture

```
┌─────────────┐      EIP-712 signature   ┌──────────────────────┐
│  AI Agent   │ ───────────────────────▶│  Vault of the chosen   │
│  (Python)   │   (domain = that vault)   │  mode (ERC-4626)        │
└─────────────┘                          └──────────┬───────────┘
      ▲                                              │ supply/withdraw
      │ market data (of that vault)                  ▼
┌─────────────┐                          ┌──────────────────┐
│  API/Server │                          │   Aave V3 Pool     │
│  (FastAPI)  │                          │   (Arbitrum)        │
└─────────────┘                          └──────────────────┘
      ▲
      │ REST (protected by internal API key)
┌─────────────┐
│  Frontend    │  one global risk mode → one vault
│  (React)     │
└─────────────┘
```

Detailed diagram (Mermaid, interactive on GitHub): [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md)

**Why signatures instead of just a permissioned role:** anyone can
submit the execution transaction, but the contract only processes it
if the signature matches the AI agent's private key — this allows
cryptographic, on-chain verification that the signal truly came from
the AI and was not forged or altered.

**One signature per vault:** the EIP-712 domain includes the address of
the target vault (`verifyingContract`), so a signal signed for one mode
cannot be replayed on another. The same AI agent address is authorized
(`aiAgent`) in all three contracts. The backend decides which vault to
sign for from the requested mode, and rejects any `vault_address` that
does not match that mode.

---

## Repository Structure

```
ArbiAgent/
├── client/            # Frontend (React + Vite + TypeScript)
├── contracts/          # Smart contracts (Foundry)
│   ├── src/             # ArbiAgentVault.sol (Moderate),
│   │                    # ArbiAgentConservativeVault.sol,
│   │                    # ArbiAgentAggressiveVault.sol
│   ├── script/           # One deploy script per vault
│   └── test/             # Foundry tests (per vault + mode isolation)
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

Required variables in `server/.env` (see `server/.env.example`):

| Variable | Purpose |
|---|---|
| `AI_AGENT_ADDRESS` / `AI_AGENT_PRIVATE_KEY` | Agent that signs the signals (must be the `aiAgent` of all three vaults) |
| `VAULT_CONTRACT_ADDRESS` | Moderate vault |
| `VAULT_ADDRESS_CONSERVADOR` | Conservative vault |
| `VAULT_ADDRESS_AGRESIVO` | Aggressive vault |
| `INTERNAL_API_KEY` | Key expected in the `X-API-Key` header of `/api/v1/rebalance` |
| `GEMINI_API_KEYS` | Gemini key pool (comma-separated) |

If the vault of the requested mode is not configured, `/api/v1/rebalance`
answers `503`; if the request carries a `vault_address` that does not
match the mode, it answers `400`. All other endpoints are open
(read-only).

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

## Deployed Contracts

| Mode | Network | Address |
|---|---|---|
| Moderate | Arbitrum Sepolia | [`0x6Ab1F75e863730de07b68fF87B67717d36cA0Df8`](https://sepolia.arbiscan.io/address/0x6Ab1F75e863730de07b68fF87B67717d36cA0Df8) |
| Conservative | Arbitrum Sepolia | [`0xc4e031259cA7d2390408F10608fAE03982a47F39`](https://sepolia.arbiscan.io/address/0xc4e031259cA7d2390408F10608fAE03982a47F39) |
| Aggressive | Arbitrum Sepolia | [`0x1D48956912c301C0Da67A10F3bC47BB2c8dEad0d`](https://sepolia.arbiscan.io/address/0x1D48956912c301C0Da67A10F3bC47BB2c8dEad0d) |

Moderate deployment tx: [`0x70fa62c8...df833802`](https://sepolia.arbiscan.io/tx/0x70fa62c8ca687b0c181447f0e807e0aa7e22a66e59e6268323eab5a0df833802)

The Moderate vault is the version deployed for the hackathon submission,
including the on-chain rebalance cooldown and the fixes identified by
static analysis (see [Security & Testing](#security--testing) below).
The Conservative and Aggressive vaults were deployed afterwards with the
same logic and their own cooldown and exposure parameters.

---

## Security & Testing

- **Unit tests with Foundry** (`forge test -vv`) for each of the three
  vaults, covering deposits, AI signal execution, signature validation,
  nonce replay protection, admin access control, performance fee
  collection, just-in-time liquidity recovery on withdrawal, and the
  rebalance cooldown (tested explicitly: blocks immediately after
  execution, still blocks one second before the cooldown ends, and
  succeeds exactly when it elapses). A dedicated suite
  (`ArbiAgentModeIsolation.t.sol`) checks that the vaults are isolated
  from each other.
- **Static analysis with [Slither](https://github.com/crytic/slither)**
  was run against the Moderate contract; findings that applied to our
  own code (unused return values, local variable shadowing, a missing
  event on a setter) were fixed. Remaining findings are either
  informational (timestamp usage in `require` checks, which is the
  expected pattern for deadlines/cooldowns) or belong to OpenZeppelin's
  audited library code. Full report: [`docs/SLITHER_REPORT.txt`](docs/SLITHER_REPORT.txt)
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
- The backend never signs for an arbitrary contract address: the vault
  is derived from the requested mode on the server side.

---

## On-Chain Evidence (End-to-End Proof)

The complete flow — deposit, EIP-712 signature from the AI agent,
on-chain execution, and withdrawal with automatic liquidity recovery
from Aave — was executed with real transactions on Arbitrum Sepolia
against the Moderate vault
([`0x6Ab1F75e...A0Df8`](https://sepolia.arbiscan.io/address/0x6Ab1F75e863730de07b68fF87B67717d36cA0Df8)),
triggered from the live frontend:

| Step | What it proves | Transaction |
|---|---|---|
| 1. Deposit (12 USDC) | The user deposits USDC and receives vault shares (ERC-4626) | [`0x7b9edfc1...bef6481`](https://sepolia.arbiscan.io/tx/0x7b9edfc1486833e769da82009b2a589b6ab6a8cea624ac2e90fbe24dfbef6481) |
| 2. AI signal executed | The AI agent's EIP-712 signature is verified on-chain and the vault supplies 4.8 USDC to Aave V3 (`SignalExecuted`: supply 4,800,000, withdraw 0) | [`0x9849ff5f...a962dbb1`](https://sepolia.arbiscan.io/tx/0x9849ff5f2b33ff02926339a4185c0983e12705777393edfd071a07b2a962dbb1) |
| 3. Withdrawal with just-in-time liquidity | 30 USDC withdrawn while only ~27.2 USDC were liquid: the vault recovered the missing ~2.8 USDC from Aave (aToken burned) inside the same transaction | [`0x6de83200...742d9a8`](https://sepolia.arbiscan.io/tx/0x6de832002ebad1376f9274dfcfef2bc297bf293a93303eb394bea22ab742d9a8) |

All three transactions are publicly verifiable — anyone can inspect the
emitted events (`SignalExecuted`, Aave's `Supply`) and the token
movements directly on Arbiscan.

After step 2 the vault enters its 8-hour rebalance cooldown: a second
signal submitted right away is rejected on-chain with
`Cooldown activo`, which is the intended behavior.

---

## Relevant Design Decisions

- **ERC-4626**: industry standard for tokenized vaults, compatible
  with any tooling/library that already knows how to read it.
- **Single protocol (Aave V3)**: a deliberate decision given the
  hackathon timeframe — a real, solid integration with one protocol
  beats a shallow simulation of several. The AI agent is designed to
  evaluate multiple yield sources in the future, not coupled to a
  single protocol.
- **One independent vault per risk mode**: Conservative (24 h
  cooldown), Moderate (8 h) and Aggressive (2 h) are three separate
  contracts, each with its own isolated pool of funds, shares,
  cooldown and exposure limits, rather than a single shared vault with
  a selectable mode. This keeps each profile's risk limits enforced by
  its own contract and makes a bug or an unfavorable rebalance in one
  mode unable to affect the funds of another.
- **Mode is a choice of vault, not a setting on your money**: choosing
  a mode in the interface changes which vault the Vault, AI Strategy
  and Activity tabs read from and send transactions to. It does not
  reconfigure an existing position. To change mode with funds already
  deposited, the user withdraws from the current vault and deposits
  into the new one. There is no on-chain restriction on doing so, and
  the contracts allow positions in several modes at once.
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
  on `msg.sender`-based access control. The domain includes the vault
  address, so a signature is only valid for the vault it was issued for.
- **On-chain rebalance cooldown**: a fixed cooldown between
  `executeSignal()` calls (24 h / 8 h / 2 h depending on the vault) is
  enforced by the contract itself (not just shown in the UI), shared by
  the whole vault — not per user.
- **Event queries in block ranges**: the public Arbitrum Sepolia RPC
  rejects `eth_getLogs` queries spanning more than 10M blocks, so the
  frontend reads deposit, withdrawal and rebalance events in chunks
  starting from each vault's deployment block.
- **Displayed performance (PnL)**: calculated as current value minus
  net principal (deposits minus withdrawals of the connected wallet in
  that vault). It therefore includes yield that was already withdrawn
  earlier, and it is an approximation, not an accounting of realized
  and unrealized gains.

---

## Team and Roles

| Rol | Responsable |
|---|---|
| Contratos inteligentes / Integración on-chain | Jesús Alfaro |
| Agente de IA / Middleware | Dante Olivas |
| Frontend / UX / Wallets | Geraldin Nuñez / Dante Olivas |
| Producto / API de backend | Jesús Alfaro |

---

## Note on Demo Mode

This project runs on **testnet (Arbitrum Sepolia)** with test funds.
No real assets are handled. All operations shown in the interface
are verifiable on-chain via Arbiscan, but carry no real monetary
value.
