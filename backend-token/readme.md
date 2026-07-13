# `TORQ Token` — backend-folder
 
Solidity smart contract + Express/TypeScript API that powers the Torq (TQ) token mining/wallet platform. Handles on-chain minting ("mining"), on-chain transfers, custodial wallet creation, and transaction history — all backing the `frontend-token` React app.
 
## Architecture Overview
 
```
frontend-token  →  server (Express API)  →  TorqToken.sol (smart contract)
                         ↓
                    Supabase (auth, wallet key storage, transaction cache)
```
 
- **`TorqToken.sol`** — a real ERC-20 token (OpenZeppelin-based) with an on-chain `mine()` function that mints a pseudo-random reward (1–100 TQ) to the caller, subject to a 10-second per-wallet cooldown. Transfers use the standard `transfer()` — atomic by construction, so funds can never duplicate or vanish mid-transaction.
- **`server/`** — an Express API sitting between the frontend and the chain. It never exposes private keys to the client; instead, it holds each user's **encrypted** private key server-side and signs transactions on their behalf (a "custodial wallet" model).
- **Supabase** — used for: (1) user authentication, (2) storing each user's wallet address + AES-256-encrypted private key, (3) caching transaction history (see "Why transaction history isn't read from the chain" below).
## Tech Stack
 
- **Solidity 0.8.24** + **OpenZeppelin Contracts** (ERC20, Ownable)
- **Hardhat** — compile, test, deploy tooling
- **Express** + **TypeScript** — the API server
- **ethers.js v6** — all contract/wallet interaction
- **Supabase JS client** (service role) — auth verification + database access, bypassing RLS since the backend is a trusted context
- **Node crypto (AES-256-GCM)** — private key encryption at rest
## Folder Structure
 
```
backend-token/
├── contracts/
│   └── TorqToken.sol          # the token contract - mine(), transfer(), cooldown
├── scripts/
│   └── deploy.ts              # deploys TorqToken, auto-writes address to server/.env
├── test/
│   └── TorqToken.test.ts      # mining bounds, cooldown, atomic transfer tests
├── supabase/
│   └── migrations/
│       └── 0001_init.sql      # wallets + profiles tables, RLS policies, auto-profile trigger
├── server/
│   ├── src/
│   │   ├── index.ts           # Express app entrypoint, mounts all routes
│   │   ├── blockchain.ts      # all ethers.js logic: contract calls, key encryption, funding
│   │   ├── supabaseAdmin.ts   # Supabase client using the SERVICE ROLE key (server-only)
│   │   ├── middleware/
│   │   │   └── auth.ts        # verifies the Supabase JWT on every request
│   │   └── routes/
│   │       ├── wallet.ts      # POST /init (create+fund wallet), GET / (address+balance)
│   │       ├── mine.ts        # POST / - signs mine(), logs to transactions table
│   │       ├── send.ts        # POST / - signs transfer(), logs both sides to transactions table
│   │       └── history.ts     # GET / - reads transaction history from Supabase cache
│   ├── package.json
│   ├── tsconfig.json
│   └── .env                   # backend secrets - see below (not committed)
├── hardhat.config.ts           # networks: hardhat (local), localhost, sepolia, amoy
├── package.json
├── tsconfig.json
├── .env                        # deployer-side secrets (root project, for Hardhat deploys)
└── .gitignore
```
 
## The Smart Contract — `TorqToken.sol`
 
- **Standard:** ERC-20 (name: "Torq", symbol: "TQ", 18 decimals internally — the UI formats this down to 4 display decimals)
- **`mine()`** — anyone can call it. Mints a pseudo-random amount between `MIN_REWARD` (1 TQ) and `MAX_REWARD` (100 TQ) to `msg.sender`. Reverts with `MiningOnCooldown` if called again within `MINE_COOLDOWN` (10 seconds) of the last mine.
  - ⚠️ Randomness is derived from `block.prevrandao`/timestamp/sender/nonce — fine for a testnet demo, but technically front-runnable/predictable on a real mainnet with real value at stake. If this ever moves to production with real value, swap in a verifiable randomness source (e.g. Chainlink VRF).
- **`transfer(to, amount)`** — inherited standard ERC-20 transfer. No custom logic needed for atomicity; the EVM itself guarantees a transaction either fully succeeds or fully reverts.
- **`cooldownRemaining(address)`** — view function, seconds until that address can mine again.
- **Ownership (`Ownable`)** — inherited but not currently wired to any restricted function (e.g. there's no supply cap or pausability yet). Worth adding deliberately if TQ is ever meant to have real scarcity/value.
- **No supply cap currently exists** — minting via `mine()` is unlimited, forever, by design for this demo.
## The Custodial Wallet Model
 
Since the frontend only has email/password auth (no MetaMask/wallet-connect step for end users), the backend generates a **real EVM keypair** per user and holds the private key **encrypted** (AES-256-GCM, key from `ENCRYPTION_KEY` env var) in Supabase's `wallets` table. The backend decrypts it in-memory only for the duration of signing a transaction, then discards it.
 
**Trade-off to keep in mind:** this makes the server the custodian of real private keys — protect `ENCRYPTION_KEY` and `SUPABASE_SERVICE_ROLE_KEY` as maximally sensitive secrets, and never commit `.env` to git.
 
## Gas / Funding Model
 
Every on-chain action (`mine()`, `transfer()`) costs gas, even on a free testnet. Since users never touch a wallet UI themselves, the backend automatically funds every newly created custodial wallet with a small amount of native gas token (POL on Polygon Amoy / ETH on other networks), sent from a **funder wallet** — `FUNDER_PRIVATE_KEY` in `server/.env`.
 
- This happens automatically inside `POST /api/wallet/init` (see `fundNewWallet()` in `blockchain.ts`) — **no manual step per user.**
- The funder wallet's own balance is a real, ongoing operational cost that must be topped up periodically (from a faucet on testnet, or purchased on mainnet) — it is not something that scales for free.
- If you ever want a completely gas-free experience with zero blockchain involvement, that requires a different architecture entirely (off-chain balances in a database instead of a real smart contract) — not what's currently built.
## Why Transaction History Isn't Read From the Chain
 
The original design queried `eth_getLogs` directly against the RPC provider to reconstruct history from event logs. In practice, **free-tier RPC providers cap this heavily** (e.g. Alchemy's free tier allows only a 10-block range per query, public Polygon RPC endpoints similarly restrict it) — making live chain-scanning impractical for anything beyond the very latest few blocks.
 
**Current approach:** `mine.ts` and `send.ts` write a row into a `transactions` table in Supabase **at the moment each transaction succeeds** (the backend already knows the `txHash`, amount, and parties immediately). `history.ts` simply reads that table back — fast, reliable, no RPC limits involved.
 
**Trade-off:** any mining/sending done before this table existed, or via any path that bypasses this backend, won't show up in history — only actions that flow through this API are recorded.
 
## Environment Variables
 
### Root `.env` (used by Hardhat for compiling/deploying)
```dotenv
RPC_URL=http://127.0.0.1:8545          # local Hardhat node (dev only)
SEPOLIA_RPC_URL=                        # Alchemy Sepolia endpoint, if using Ethereum testnet
DEPLOYER_PRIVATE_KEY=                   # wallet used to deploy via `hardhat run --network sepolia`
```
 
### `server/.env` (the running API's secrets)
```dotenv
RPC_URL=                                # RPC endpoint the backend actually talks to at runtime
TORQ_CONTRACT_ADDRESS=                  # deployed contract address (auto-filled by deploy.ts)
 
SUPABASE_URL=                           # your Supabase project URL
SUPABASE_SERVICE_ROLE_KEY=              # SERVICE ROLE key - bypasses RLS, backend-only, never expose
 
ENCRYPTION_KEY=                         # 32-byte base64 key for AES-256 - generate with:
                                         #   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 
FUNDER_PRIVATE_KEY=                     # wallet that auto-funds new custodial wallets with gas token
 
PORT=4000
```
 
## Supabase Schema
 
**`wallets`** — one row per user: `user_id`, `address`, `encrypted_private_key` (never exposed to anon/authenticated roles — only the backend's service_role key can read it), `created_at`.
 
**`profiles`** — `user_id`, `display_name`, `avatar_url` — auto-created via a Postgres trigger on signup.
 
**`transactions`** — the history cache table: `wallet_address`, `type` (`mined`/`sent`/`received`), `amount`, `counterparty`, `tx_hash`, `created_at`. Written by the backend at the moment each transaction happens; read back by `GET /api/history`.
 
All tables have Row Level Security enabled — users can only ever read their own rows via `auth.uid()` matching.
 
## API Endpoints
 
| Method | Path | Auth required | Purpose |
|---|---|---|---|
| GET | `/health` | No | Basic liveness check |
| POST | `/api/wallet/init` | Yes | Creates + funds a custodial wallet for the user (idempotent) |
| GET | `/api/wallet` | Yes | Returns address, live on-chain balance, mining cooldown |
| POST | `/api/mine` | Yes | Signs and submits `mine()`, logs to transaction cache |
| POST | `/api/send` | Yes | Validates + signs `transfer()`, logs both sides to transaction cache |
| GET | `/api/history` | Yes | Reads transaction history from Supabase (not the chain) |
 
All authenticated routes expect `Authorization: Bearer <supabase_access_token>`.
 
## Local Development Setup (Hardhat local chain)
 
```powershell
# Terminal 1 - local blockchain, keep running
npx hardhat node
 
# Terminal 2 - deploy the contract onto it (auto-writes server/.env)
npx hardhat run scripts/deploy.ts --network localhost
 
# Terminal 2 (continued) - start the backend
cd server
npm install
npm run dev
```
 
⚠️ **Hardhat's local node is entirely in-memory.** Every restart wipes the chain, the deployed contract, and all balances. You must redeploy (`npx hardhat run scripts/deploy.ts --network localhost`) and re-fund any existing custodial wallets every single time you restart `npx hardhat node`.
 
## Testnet Setup (Polygon Amoy — persists across restarts)
 
Used instead of local Hardhat once you want a real, persistent chain without real money at risk.
 
1. Get an Alchemy account, create an app on **Polygon Amoy**, copy its HTTPS RPC URL.
2. Get a MetaMask wallet, switch to Amoy network, fund it with free POL from a faucet (e.g. `www.alchemy.com/faucets/polygon-amoy`).
3. Deploy the contract via **Remix IDE** (paste `TorqToken.sol`, compile with 0.8.24, deploy via "Injected Provider - MetaMask" with your Amoy-connected account) — or via Hardhat with a `sepolia`/`amoy` network block in `hardhat.config.ts` pointing at that RPC URL and using a `DEPLOYER_PRIVATE_KEY`.
4. Set `server/.env`:
```dotenv
   RPC_URL=https://polygon-amoy.g.alchemy.com/v2/<your-alchemy-key>
   TORQ_CONTRACT_ADDRESS=<deployed address>
   FUNDER_PRIVATE_KEY=<same MetaMask wallet's private key, holding POL>
```
5. No `npx hardhat node` needed at all on this path — the backend talks directly to the real Amoy network.
## Available Scripts
 
**Root (`backend-token/`):**
| Script | What it does |
|---|---|
| `npx hardhat compile` | Compiles the Solidity contract |
| `npx hardhat test` | Runs the contract test suite |
| `npx hardhat node` | Starts a local in-memory chain |
| `npx hardhat run scripts/deploy.ts --network <name>` | Deploys `TorqToken` to the given network |
 
**`server/`:**
| Script | What it does |
|---|---|
| `npm run dev` | Starts the API with hot reload (`ts-node-dev`) |
| `npm run build` | Compiles TypeScript to `dist/` |
| `npm start` | Runs the compiled build (for production) |
 
## Troubleshooting
 
**`ERESOLVE` errors on `npm install`:** almost always a mismatched set of Hardhat-ecosystem package versions (e.g. accidentally installing Hardhat 3.x alongside a toolbox built for Hardhat 2.x). Wipe `node_modules` + `package-lock.json` and reinstall from a `package.json` with known-compatible pinned versions (Hardhat `^2.22.15`, `@nomicfoundation/hardhat-toolbox` `^5.0.0`, chai `^4.5.0`).
 
**`npm run dev` fails with "Missing script":** you're in the wrong folder — the root project and `server/` have separate `package.json` files with different scripts. `dev` only exists inside `server/`.
 
**Server crashes silently (was "listening", now `ERR_CONNECTION_REFUSED`):** an unhandled promise rejection killed the Node process. `index.ts` and `middleware/auth.ts` now have defensive `try/catch`/global handlers specifically to surface these as visible terminal errors instead of silent death — check the terminal for a stack trace immediately after the crash.
 
**`could not decode result data (value="0x")` on any contract call:** there's no contract at that address on the network you're currently pointed at — almost always means the local Hardhat chain was restarted (wiping the old deployment) but `TORQ_CONTRACT_ADDRESS` still points at the old, now-empty address. Redeploy.
 
**`insufficient funds for intrinsic transaction cost` / "Mining failed":** the wallet attempting the transaction has 0 native gas token. Either it's a pre-existing wallet that was never auto-funded (created before switching networks), or the funder wallet itself ran dry, or `FUNDER_PRIVATE_KEY` doesn't actually correspond to the wallet you think it does (verify with `new ethers.Wallet(key).address` and compare against the funded address on a block explorer).
 
**`block range exceeds configured limit` / "Under the Free tier plan... 10 block range":** this is why transaction history no longer scans the chain directly — see the dedicated section above. If you see this, you're running an outdated `history.ts` that still tries to call `eth_getLogs`; replace it with the Supabase-cache version.
 
**`new row violates row-level security policy`:** the backend is using the wrong Supabase key. Double-check `SUPABASE_SERVICE_ROLE_KEY` in `server/.env` is the actual **service_role** secret key (Project Settings → API), not the anon/public key.
 
**`fetch failed` / `ConnectTimeoutError` reaching Supabase:** a network-level issue (firewall, VPN, DNS, temporary outage) between your machine and Supabase's auth servers — not an application bug. Test with `Test-NetConnection <your-project>.supabase.co -Port 443`.
 
## Security Notes
 
- `SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_KEY`, `FUNDER_PRIVATE_KEY`, and `DEPLOYER_PRIVATE_KEY` are all maximally sensitive — none should ever be committed to git, logged, or exposed to the frontend.
- Confirm `.env` is listed in `.gitignore` in both the root and `server/` folders.
- The custodial model means this backend is a real target — if `ENCRYPTION_KEY` or the service role key ever leaked, an attacker could decrypt every user's private key. Treat production deployment of this pattern with the same seriousness as a real financial system, even though the current tokens hold no real value on testnet.
- If TorqToken is ever deployed to mainnet with real value, revisit: adding a supply cap, replacing the pseudo-random mining mechanism with verifiable randomness, and seriously reconsidering the custodial key model (or moving to a proper key-management service instead of an `.env` variable).
 
