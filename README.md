# VaultTrade 🛡️

**VaultTrade** is a high-security peer-to-peer escrow protocol designed to eliminate scams in gaming account trading (specifically Valorant), with native integration for Pakistani payment systems (Raast, SadaPay, NayaPay).

---

## 🎯 The Problem Solved

Peer-to-peer gaming transactions on Facebook groups are filled with scams:
1. **Take-and-Run:** Buyer pays, seller vanishes.
2. **Fake Receipts:** Buyer sends fake SadaPay/NayaPay payment screenshots.
3. **Pullback / Account Recovery:** Seller surrenders credentials, but uses the First Email (FE/OGE) or Date of Birth (DOB) to recover the account through Riot Games support days later.

VaultTrade eliminates these vectors using a **3-step escrow state machine**, **cryptographic release code handshake**, and **First Email (FE) vaulting**.

---

## ⚡ Core Architecture & Security Invariants

* **Invariant 1 (Buyer-Only Credential Access):** Credentials (Riot login, password, FE, DOB) are strictly readable **only by the buyer** once escrow is vaulted. Admins and sellers cannot read back credentials.
* **Invariant 2 (State Machine Enforcement):** Unidirectional state flow:
  `open` ➔ `awaiting_payment` ➔ `awaiting_credentials` ➔ `inspecting` ➔ `completed` / `disputed`
* **Invariant 3 (Release Code Protection):** 4-digit numeric code hashed with bcrypt (salt 10).
* **Invariant 4 (Server-Side Sanitization):** In-app chat strips Pakistani phone numbers (`03XX`, `+923XX`), emails, URLs, and off-platform keywords (`WhatsApp`, `EasyPaisa`, `JazzCash`).
* **Invariant 5 (Sybil & Double-Sell Resistance):** Partial unique database index enforces exactly 1 active deal lobby per Riot ID.
* **Invariant 6 (Timelock Protection):** 6-hour auto-release timer protects the seller from silent buyers; 30-minute evidence clock handles disputes; 36-hour safety hold on payouts.

---

## 🛠️ Tech Stack

* **Framework:** Next.js 16 (App Router, Turbopack, TypeScript)
* **Styling:** Tailwind CSS (Custom flat dark palette, zero gradients, zero neon)
* **Database & Auth:** Supabase (PostgreSQL, Row Level Security, Realtime channels)
* **Testing:** Vitest (14/14 automated unit tests)
* **Push Notifications:** Web Push API (VAPID)
* **Payment Rails:** Raast (irrevocable P2P transfer) via SadaPay / NayaPay

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/KhubaibAhmed0/VaultTrade.git
cd VaultTrade
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

### 4. Run database migrations
Execute the scripts in `supabase/migrations/` in order:
1. `001_initial_schema.sql`
2. `002_rls_policies.sql`
3. `003_functions.sql`

### 5. Start the development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🧪 Testing

Run the automated test suite:
```bash
npx vitest run
```

---

## ⚖️ Legal Disclaimer

VaultTrade is an independent escrow technology protocol. It is not affiliated with, endorsed by, or sponsored by Riot Games, Inc. Account trading may violate Riot's Terms of Service. VaultTrade guarantees secure payment escrow between consenting peers.
