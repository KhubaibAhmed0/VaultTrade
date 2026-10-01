# VaultTrade — Project Context & Architectural Specification (CONTEXT.md)

> **For AI Assistants & Developers:** This file is the single source of truth for the VaultTrade project. Read this before reading or modifying any code. It contains the business context, security invariants, design system, and technical specifications needed to work across different machines seamlessly.

---

## 1. Project Overview & Business Domain

* **Name:** VaultTrade
* **Purpose:** A high-trust, anti-scam peer-to-peer escrow platform tailored for the Pakistani gaming community (specifically Valorant account trading on Facebook groups).
* **Target Audience:** Pakistani gamers buying and selling accounts using local payment rails (Raast via SadaPay, NayaPay, and bank IBFT).
* **Payment Rails:** Raast P2P (instant, irrevocable).
* **Platform Fee:**
  * **200 PKR** on deals under 30,000 PKR.
  * **500 PKR** on deals 30,000 PKR and above.
  * **Minimum Deal:** 500 PKR.

---

## 2. Domain Vocabulary (Strict)

| Term | Meaning | Never Say |
| :--- | :--- | :--- |
| **Lobby** | A single private escrow deal room between 1 buyer and 1 seller | "room", "deal session", "trade" |
| **FE** | First Email — the original email used to create the Riot account | "OGE", "creation email" |
| **DOB** | Date of Birth used by Riot Games to verify original ownership | |
| **Riot ID** | In-game player identity formatted as `GameName#Tag` (e.g. `Reyna#1234`) | "username", "gamertag" |
| **Release Code** | Cryptographically hashed 4-digit code entered to disburse escrow | "OTP", "PIN" |
| **Auto-Release** | Automatic escrow disbursement to seller after 6-hour inspection timer | "timeout", "expiry" |
| **Evidence Clock** | 30-minute freeze window to upload video/screenshot proof during disputes | "dispute timer" |
| **Payout Hold** | 36-hour delay between deal completion and actual seller bank payout | "settlement delay" |

---

## 3. The 6 Non-Negotiable Security Invariants

These invariants were established by the initial architect and validated by the `hunter` security audit. **Never break or bypass them**:

1. **Invariant 1 (Buyer-Only Credential Access):**
   * Credentials (`riot_email`, `riot_password`, `first_email`, `date_of_birth`, socials) are strictly readable **only by the buyer** (`if (isBuyer)`).
   * Sellers and Admins must **never** be able to query or view raw credentials once submitted.
2. **Invariant 2 (Strict Unidirectional State Machine):**
   * Status transitions are server-enforced in `actions.ts` via `canTransitionLobby()`:
     `open` ➔ `awaiting_payment` ➔ `awaiting_credentials` ➔ `inspecting` ➔ `completed` / `disputed`
   * Cancel is only allowed from `open` or `awaiting_payment`.
3. **Invariant 3 (Cryptographic Release Code):**
   * Generated using secure PRNG `crypto.randomInt(1000, 10000)`.
   * Stored as a bcrypt hash (salt 10). Never returned in plaintext to the seller.
4. **Invariant 4 (Server-Side Message Sanitization):**
   * In-app chat strips Pakistani phone numbers (`03XX`, `+923XX`), emails, URLs, and evasion keywords (`WhatsApp`, `EasyPaisa`, `JazzCash`, `call me`).
   * Sanitization runs **on the server** inside `sendLobbyMessageAction`, not on the client.
5. **Invariant 5 (Anti-Double-Selling):**
   * Enforced at the DB level with a partial unique index:
     `CREATE UNIQUE INDEX unique_active_riot_id ON lobbies (riot_id) WHERE status NOT IN ('completed', 'refunded', 'cancelled');`
6. **Invariant 6 (Timelock Safety):**
   * 6-hour auto-release countdown protects sellers from silent/ghosting buyers.
   * 30-minute evidence deadline requires proof on dispute.
   * 36-hour hold on seller payouts prevents post-sale chargeback pullbacks.

---

## 4. Design System Tokens (Zero Gradients / Zero Neon)

**Philosophy:** Flat, serious, high-trust banking/gaming dashboard.
* ❌ NO gradients anywhere.
* ❌ NO neon or glowing colors.
* ❌ NO glassmorphism / backdrop blurs.
* ✅ Flat solid surfaces, 1px crisp borders, 4px/8px grid.

```css
/* Color Tokens */
--bg-base:       #0a0a0b;    /* Canvas background */
--bg-surface:    #111113;    /* Cards & panels */
--bg-elevated:   #1a1a1d;    /* Modals & dropdowns */
--bg-inset:      #08080a;    /* Input fields */

--border-subtle:  #1f1f23;
--border-default: #2a2a2f;
--border-focus:   #3b82f6;   /* Blue focus ring */

--text-primary:   #e4e4e7;
--text-secondary: #a1a1aa;
--text-muted:     #71717a;

--accent:         #3b82f6;   /* Primary button blue */
--accent-hover:   #2563eb;
--accent-muted:   #1e3a5f;

--success:        #22c55e;
--warning:        #eab308;
--danger:         #ef4444;
```

---

## 5. Codebase Map

```
vaulttrade/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Landing page with 3-step escrow explanation
│   │   ├── layout.tsx                  # Root layout with Inter & JetBrains Mono
│   │   ├── globals.css                 # Design system theme tokens
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx          # Mobile OTP login + 1-Click Demo buttons
│   │   │   └── setup/page.tsx          # Display name & Facebook profile setup
│   │   ├── dashboard/
│   │   │   ├── page.tsx                # Dashboard server component
│   │   │   └── DashboardView.tsx       # Active lobbies & deal history tabs
│   │   ├── lobby/
│   │   │   ├── create/page.tsx         # Seller creates deal lobby
│   │   │   └── [id]/
│   │   │       ├── page.tsx            # Server component (fetches lobby & creds)
│   │   │       ├── LobbyView.tsx       # 8-state interactive deal room
│   │   │       └── actions.ts          # Server Actions (create, join, pay, creds, release, dispute, chat)
│   │   ├── admin/
│   │   │   ├── page.tsx                # Admin server component (is_admin check)
│   │   │   └── AdminDashboardView.tsx  # Raast verify, dispute review, payout ledger
│   │   └── api/
│   │       ├── auth/demo/route.ts      # Local demo session switcher (disabled in prod)
│   │       ├── cron/auto-release/      # 6h auto-release background worker
│   │       └── push/subscribe/         # Web Push subscription endpoint
│   ├── components/lobby/
│   │   ├── LobbyStatusBar.tsx          # Monospace countdown timer + status badge
│   │   ├── CredentialForm.tsx          # Seller credential input
│   │   ├── CredentialViewer.tsx        # Buyer copy-only protected viewer
│   │   ├── VerificationChecklist.tsx   # Mandatory 4-checkbox gate
│   │   ├── ReleaseCodeInput.tsx        # 4-digit code settlement input
│   │   ├── DisputePanel.tsx            # Freeze & video proof upload
│   │   └── LobbyChat.tsx               # Real-time sanitized in-lobby chat
│   └── lib/
│       ├── sanitize.ts                 # Chat regex filter (tested)
│       ├── release-code.ts             # 4-digit bcrypt hasher & verifier (tested)
│       ├── state-machine.ts            # Legal transition validator (tested)
│       ├── fee.ts                      # PKR fee tier calculator (tested)
│       ├── mock-data.ts                # Built-in demo data for offline testing
│       └── supabase/
│           ├── server.ts               # Server client with transparent mock proxy
│           ├── client.ts               # Browser client
│           └── admin.ts                # Service role client
├── supabase/migrations/
│   ├── 001_initial_schema.sql          # 6 tables + unique active riot id index
│   ├── 002_rls_policies.sql            # RLS policies with WITH CHECK hardening
│   └── 003_functions.sql               # Fee triggers, auto-release RPC, deal counter
└── package.json
```

---

## 6. Local Development & Demo Mode

The project features a **zero-configuration local demo mode**:
* No live Supabase account is needed to develop or test.
* Navigate to `http://localhost:3000/login` and click **"Seller"**, **"Buyer"**, or **"Admin"** to instantly test the platform.
* Active demo lobby: `http://localhost:3000/lobby/demo-lobby-1`

### Commands
```bash
npm run dev          # Start local dev server (port 3000)
npx vitest run       # Run 14/14 automated unit tests
npx tsc --noEmit     # TypeScript compilation check
npm run build        # Production build verification
```
