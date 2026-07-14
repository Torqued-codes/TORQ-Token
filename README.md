# TORQ Token (TQ) — Full-Stack Token Mining & Wallet Platform
 
A crypto mining/wallet web app backed by a real ERC-20 smart contract on Polygon Amoy testnet. Users sign up with email/password, automatically get a custodial on-chain wallet, mine TQ tokens, send them to other users, and view transaction history — all backed by a genuine, deployed smart contract rather than simulated numbers in a database.
 
**Live:**
- Frontend: `https://torq-token.onrender.com/`
- Backend API: `https://torq-token-backend.onrender.com/`
## Architecture
 
```
┌─────────────────┐      ┌──────────────────┐      ┌───────────────────┐
│  frontend-token │ ───▶│  backend-token/  │ ───▶ │  TorqToken.sol    │
│  (React + Vite) │      │  server/         │      │  (Polygon Amoy)   │
│                 │      │  (Express API)   │      │                   │
└─────────────────┘      └──────────────────┘      └───────────────────┘
         │                           │
         └───────────┬───────────────┘
                     ▼
              ┌─────────────┐
              │  Supabase   │
              │  (auth,keys,│
              │  tx cache)  │
              └─────────────┘
```
 
- **Frontend** never talks to the blockchain or holds any private keys — it only calls the backend API and Supabase (for auth/profile only).
- **Backend** is the only component that signs blockchain transactions. It holds each user's encrypted private key and signs on their behalf (custodial wallet model), since end users never install a wallet extension themselves.
- **Smart contract** is the actual source of truth for token balances and mining logic — not a database.
- **Supabase** handles authentication, stores wallet address + encrypted private key + profile info, and caches transaction history (since free-tier RPC providers can't support live on-chain history scanning — see backend section below).

## Website Overview

## Repository Structure
 
```
TORQ-Token/
├── backend-token/            
│   ├── contracts/
│   │   └── TorqToken.sol
│   ├── scripts/
│   │   └── deploy.ts
│   ├── test/
│   │   └── TorqToken.test.ts
│   ├── supabase/
│   │   └── migrations/
│   │       └── 0001_init.sql
│   ├── server/               
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── blockchain.ts
│   │   │   ├── supabaseAdmin.ts
│   │   │   ├── middleware/auth.ts
│   │   │   └── routes/
│   │   │       ├── wallet.ts
│   │   │       ├── mine.ts
│   │   │       ├── send.ts
│   │   │       └── history.ts
│   │   ├── package.json
│   │   └── .env              
│   ├── hardhat.config.ts
│   ├── package.json
│   └── .env                    
│
└── frontend-token/            
    ├── public/
    │   └── tq-token.png        
    ├── src/
    │   ├── lib/
    │   │   ├── supabase.ts
    │   │   └── api.ts
    │   ├── context/
    │   │   └── AuthContext.tsx
    │   ├── components/
    │   │   ├── Header.tsx
    │   │   ├── ProfileModal.tsx
    │   │   ├── MineTokens.tsx
    │   │   ├── SendTokens.tsx
    │   │   ├── TransactionHistory.tsx
    │   │   └── TokenBackground.tsx
    │   ├── pages/
    │   │   ├── Login.tsx
    │   │   └── Dashboard.tsx
    │   ├── App.tsx
    │   ├── main.tsx
    │   ├── index.css
    │   └── vite-env.d.ts
    ├── index.html
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── vite.config.ts
    ├── tsconfig.json
    ├── package.json
    └── .env                     
```
 
## Tech Stack
 
| Layer | Technology |
|---|---|
| Smart contract | Solidity 0.8.24, OpenZeppelin (ERC20, Ownable), Hardhat |
| Blockchain network | Polygon Amoy (testnet) |
| Backend | Node.js, Express, TypeScript, ethers.js v6 |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Auth & database | Supabase (Postgres + Auth) |
| Hosting | Render (Web Service for backend, Static Site for frontend) |
 
## The Smart Contract — `TorqToken.sol`
 
- ERC-20 token, name "Torq", symbol "TQ", 18 decimals internally (UI displays 4 decimals).
- **`mine()`** — any wallet can call this to receive a pseudo-random reward (1–100 TQ), subject to a 10-second per-wallet cooldown (`MiningOnCooldown` error if called too soon).
- **`transfer(to, amount)`** — standard ERC-20 transfer, atomic by construction — a send either fully succeeds or fully reverts, so balances can never duplicate or vanish mid-transaction.
- No supply cap currently exists — minting is unlimited by design for this demo.
- Mining randomness is derived from block data — acceptable for a testnet demo, but not cryptographically secure/front-run-proof; would need a verifiable randomness source (e.g. Chainlink VRF) before any real-value deployment.
## The Custodial Wallet Model
 
Users only ever see email/password auth — no MetaMask required on their end. The backend generates a real EVM keypair per user on signup, encrypts the private key (AES-256-GCM) and stores it in Supabase, then decrypts it in-memory only for the moment it needs to sign a transaction on the user's behalf.
 
Every new wallet is automatically funded with a small amount of POL (Polygon's gas token) from a **funder wallet**, so users never need to acquire gas themselves. This funding is fully automatic (`fundNewWallet()` inside `POST /api/wallet/init`) — the only ongoing maintenance is keeping the funder wallet's own POL balance topped up.
 
## Why Transaction History Comes From Supabase, Not the Chain
 
Free-tier RPC providers heavily restrict `eth_getLogs` (Alchemy's free tier caps it at just 10 blocks per query), making live on-chain history scanning impractical. Instead, `mine.ts`/`send.ts` write a row into a `transactions` table in Supabase the instant each transaction succeeds — `history.ts` simply reads that back. Fast, reliable, and free of RPC limits, at the cost of only recording activity that flows through this specific backend.
 
## Supabase Schema
 
- **`wallets`** — `user_id`, `address`, `encrypted_private_key` (service-role-only), `created_at`
- **`profiles`** — `user_id`, `display_name`, `avatar_url` — auto-created via trigger on signup
- **`transactions`** — `wallet_address`, `type` (mined/sent/received), `amount`, `counterparty`, `tx_hash`, `created_at`
All tables have Row Level Security enabled, restricting reads to each user's own rows.
 
## Backend API
 
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | No | Liveness check |
| POST | `/api/wallet/init` | Yes | Create + auto-fund a custodial wallet (idempotent) |
| GET | `/api/wallet` | Yes | Address, live balance, mining cooldown |
| POST | `/api/mine` | Yes | Sign & submit `mine()`, log to history cache |
| POST | `/api/send` | Yes | Validate & sign `transfer()`, log both sides to history cache |
| GET | `/api/history` | Yes | Read transaction history from Supabase |
 
## Environment Variables
 
**`backend-token/.env`** (root, used by Hardhat):
```dotenv
RPC_URL=http://127.0.0.1:8545
SEPOLIA_RPC_URL=
DEPLOYER_PRIVATE_KEY=
```
 
**`backend-token/server/.env`:**
```dotenv
RPC_URL=
TORQ_CONTRACT_ADDRESS=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
ENCRYPTION_KEY=
FUNDER_PRIVATE_KEY=
FRONTEND_URL=
PORT=4000
```
 
**`frontend-token/.env`:**
```dotenv
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=
```
 
## Local Development
 
**1. Blockchain + backend:**
```powershell
cd backend-token
npx hardhat node                                    # Terminal 1, keep running
npx hardhat run scripts/deploy.ts --network localhost  # Terminal 2, redo on every node restart
cd server
npm install
npm run dev                                          # Terminal 2, keep running
```
 
**2. Frontend:**
```powershell
cd frontend-token
npm install
npm run dev                                          # Terminal 3, keep running
```

 
Or, to skip local Hardhat entirely and use the persistent Amoy testnet instead, point `server/.env`'s `RPC_URL`/`TORQ_CONTRACT_ADDRESS`/`FUNDER_PRIVATE_KEY` at Amoy (see backend deployment notes below) — no `npx hardhat node` needed on this path.
 
## Deployment (Render)
 
**Backend — Web Service:**
- Root directory: `backend-token/server`
- Build command: `npm install && npm run build`
- Start command: `npm start`
- Env vars: same as `server/.env` above, plus `FRONTEND_URL` set to the deployed frontend's URL (for CORS)
**Frontend — Static Site:**
- Root directory: `frontend-token`
- Build command: `npm install && npm run build`
- Publish directory: `dist`
- Env vars: same as `frontend-token/.env` above, with `VITE_API_URL` set to the deployed backend's URL
Both services need their env vars re-entered directly in Render's dashboard — local `.env` files are gitignored and never deployed. Vite env vars are baked in at build time, so changing `VITE_API_URL` requires a redeploy to take effect.
 
## Troubleshooting Highlights
 
- **`ERESOLVE` on `npm install`:** mismatched Hardhat-ecosystem versions — wipe `node_modules`/`package-lock.json`, reinstall with pinned compatible versions (Hardhat `^2.22.15`, toolbox `^5.0.0`, chai `^4.5.0`).
- **Backend "was listening, now connection refused":** an unhandled promise rejection silently killed the process — `index.ts`/`middleware/auth.ts` now log these instead of dying silently.
- **`could not decode result data (value="0x")`:** no contract at that address on the currently-configured network — usually means the local Hardhat chain was restarted, invalidating the old deployment. Redeploy.
- **`insufficient funds for intrinsic transaction cost`:** the wallet has 0 gas token — either it predates auto-funding, or the funder wallet itself is dry, or `FUNDER_PRIVATE_KEY` doesn't match the funded address.
- **`block range exceeds configured limit`:** free-tier RPC `eth_getLogs` restrictions — this is why history reads from Supabase instead of the chain directly.
- **`new row violates row-level security policy`:** backend is using the anon key instead of the service_role key in `SUPABASE_SERVICE_ROLE_KEY`.
- **TypeScript build fails on `import.meta.env` (`Property 'env' does not exist on type 'ImportMeta'`):** missing `src/vite-env.d.ts` with `/// <reference types="vite/client" />` — local `npm run dev` never runs `tsc` so this only surfaces during a production build (e.g. on Render).
- **CORS errors on the deployed site:** `FRONTEND_URL` on the backend doesn't match the frontend's actual live URL exactly (protocol, no trailing slash).
- **Render free-tier cold starts:** services spin down after inactivity; first request after idling can take 30–60 seconds — expected, not a bug.
## Security Notes
 
- `SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_KEY`, `FUNDER_PRIVATE_KEY`, `DEPLOYER_PRIVATE_KEY` are all highly sensitive — never commit them, log them, or expose them to frontend code. Confirm `.gitignore` excludes every `.env` file in both folders.
- The custodial model means the backend is a meaningful attack target — a leaked `ENCRYPTION_KEY` or service role key would expose every user's private key.
- Currently deployed to testnet only — tokens hold no real value. Before ever considering mainnet/real-value deployment, revisit: adding a supply cap to `TorqToken.sol`, replacing block-based mining randomness with verifiable randomness, and moving off a plain `.env`-stored funder/encryption key toward a proper secrets/key-management service.
