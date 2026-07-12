# `TORQ Token` — Frontend part
 
React + TypeScript + Vite + Tailwind CSS frontend for the Torq (TQ) token mining/wallet platform. Talks to Supabase for authentication and to the `backend-token/server` Express API for all on-chain actions (wallet creation, mining, sending tokens, transaction history).
 
## Tech Stack
 
- **React 18** + **TypeScript**
- **Vite** — dev server & build tool
- **Tailwind CSS** — utility-first styling, custom charcoal/purple/metal palette
- **Supabase JS client** — auth only (sign up/in/out, session management, profile display data)
- No routing library — the app is a single conditional render (`Login` vs `Dashboard`) based on auth state; there are no real URL routes
## Prerequisites
 
- Node.js installed
- The backend (`backend-token/server`) running on `http://localhost:4000` — this frontend cannot function on its own; every wallet/mine/send/history action is a call to that API
- A Supabase project already set up with the `wallets` and `profiles` tables (see `backend-token`'s README/migration for schema)
## Folder Structure
 
```
frontend-token/
├── public/
│   └── tq-token.png          # transparent 3D coin image, used across the app
├── src/
│   ├── lib/
│   │   ├── supabase.ts       # Supabase client + profile get/update
│   │   └── api.ts            # backend API client (wallet/mine/send/history)
│   ├── context/
│   │   └── AuthContext.tsx   # session state, sign in/up/out, auto wallet-init on login
│   ├── components/
│   │   ├── Header.tsx        # sticky top bar: logo, balance, profile avatar button
│   │   ├── ProfileModal.tsx  # slide-up panel: display name, wallet address, logout
│   │   ├── MineTokens.tsx    # mining UI, cooldown timer, calls /api/mine
│   │   ├── SendTokens.tsx    # send form, calls /api/send (real on-chain transfer)
│   │   ├── TransactionHistory.tsx  # mobile-safe list, calls /api/history
│   │   └── TokenBackground.tsx     # scattered floating coin + sparkle background
│   ├── pages/
│   │   ├── Login.tsx         # email/password sign in/up
│   │   └── Dashboard.tsx     # balance card + tab switcher (mine/send/history)
│   ├── App.tsx                # renders Login or Dashboard based on session
│   ├── main.tsx                # React root, wraps App in AuthProvider
│   └── index.css               # global styles: gradient background, glass-card,
│                                # token-coin, btn-metallic, safe-area utilities
├── index.html                  # includes viewport-fit=cover (required for safe-area insets)
├── tailwind.config.js           # charcoal/metal/accent color palette, float/twinkle animations
├── postcss.config.js            # REQUIRED for Tailwind to actually compile - do not delete
├── vite.config.ts
├── tsconfig.json
├── package.json
└── .env                         
```
 
## Environment Variables
 
Create `.env` in this folder's root (copy from `.env.example`):
 
```dotenv
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...          # the ANON/public key only - never the service_role key here
VITE_API_URL=http://localhost:4000
```
 
Notes:
- Vite only exposes env vars prefixed with `VITE_` to client-side code — this is intentional and required.
- Vite reads `.env` once at dev-server **startup**. If you edit `.env` while `npm run dev` is running, restart it (`Ctrl+C` then `npm run dev` again) — changes won't hot-reload.
- Never put the Supabase `service_role` key here — that belongs only in the backend's `.env`. This frontend should only ever hold the `anon` key, which is safe to expose publicly since it's restricted by Row Level Security.
## Installation & Running
 
```powershell
npm install
npm run dev
```
 
Opens on `http://localhost:5173` by default. Requires the backend (`backend-token/server`) and a local Hardhat node to already be running for any wallet/mine/send/history action to work — see `backend-token`'s README for that setup.
 
## Available Scripts
 
| Script | What it does |
|---|---|
| `npm run dev` | Starts the Vite dev server with hot reload |
| `npm run build` | Type-checks (`tsc`) then builds a production bundle to `dist/` |
| `npm run preview` | Serves the production build locally, to sanity-check before deploying |
 
## Key Concepts
 
**No local wallet state.** Balance, wallet address, and transaction history are never stored in frontend state permanently — they're fetched fresh from `/api/wallet` and `/api/history` on load, and updated in-place after a successful mine/send response. The blockchain (via the backend) is the single source of truth.
 
**Auth flow (`AuthContext.tsx`):** on every session change, it automatically calls `POST /api/wallet/init` — idempotent, so it's safe to call on every login; it only actually creates a wallet the first time.
 
**Styling system (`index.css`):**
- `.glass-card` — the semi-transparent blurred panel style used for the balance card, tab switcher, and all three main panels
- `.token-coin` — individual scattered background coin (used by `TokenBackground.tsx`), transparent PNG, no clipping needed
- `.token-logo` — the crisp small coin used as the header logo and mining panel icon
- `.btn-metallic` — brushed-aluminum button style (Start Mining button): diagonal silver gradient + animated light sweep
- `.safe-top` / `.safe-bottom` / `.safe-x` — real device safe-area-inset padding (notches, home indicators) — applied to the header, main content, and modals; requires `viewport-fit=cover` in `index.html`'s meta viewport tag to function at all
## Troubleshooting
 
**Background looks flat black instead of purple gradient:** check the root `<div>` in `Login.tsx`/`Dashboard.tsx` has no plain `bg-charcoal-950` class (only `bg-charcoal-950/20` as a light overlay is expected) — a solid class there blocks the body's gradient entirely.
 
**Tailwind classes have no effect at all (unstyled HTML):** `postcss.config.js` is missing or was deleted. Without it, Vite never runs Tailwind's compiler and all `@tailwind` directives in `index.css` silently do nothing.
 
**Coins show a visible square edge:** the PNG at `public/tq-token.png` isn't transparent — must be a background-removed version, not the original square render.
 
**`npm install` pulls in hundreds of unrelated packages (e.g. n8n, mongodb):** you're running the command in the wrong directory — always `cd` into `frontend-token` specifically before installing, never a parent folder.
 
**Wallet address / balance never loads:** this is almost always a backend-side issue, not frontend — check `backend-token/server`'s terminal for errors, and confirm the Hardhat node + deployed contract are current (Hardhat's local chain resets on every restart, invalidating the old contract address).
