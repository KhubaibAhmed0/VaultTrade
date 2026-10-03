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
| **PUUID** | Riot Games globally unique immutable player UUID (immune to 30-day renames) | "account ID", "player number" |
| **Release Code** | Cryptographically hashed 4-digit code entered to disburse escrow | "OTP", "PIN" |
| **VaultRelay** | Dedicated synchronous OTC gateway for Riot email change OTP and OAuth unlinking | "chat transfer", "email change" |
| **Auto-Release** | Automatic escrow disbursement to seller after 6-hour inspection timer | "timeout", "expiry" |
| **Evidence Clock** | 90-minute freeze window (buffered for Pakistani load-shedding) to upload video proof | "dispute timer", "30-min clock" |
| **Payout Hold** | 36-hour delay between deal completion and actual seller bank payout | "settlement delay" |

---

## 3. The 6 Non-Negotiable Security Invariants

These invariants were established by the initial architect and validated by the security audit. **Never break or bypass them**:

1. **Invariant 1 (Buyer-Only Credential Access):**
   * Credentials (`riot_email`, `riot_password`, `first_email`, `date_of_birth`, socials) are strictly readable **only by the buyer** (`if (isBuyer)`).
   * Sellers and Admins must **never** be able to query or view raw credentials once submitted.
2. **Invariant 2 (Strict Unidirectional State Machine):**
   * Status transitions are server-enforced in `actions.ts` via `canTransitionLobby()`:
     `open` ➔ `awaiting_payment` ➔ `awaiting_credentials` ➔ `inspecting` ➔ `completed` / `disputed`
   * Cancel is only allowed from `open` (seller) or `awaiting_payment` (buyer/seller before payment lock).
3. **Invariant 3 (Cryptographic Release Code & Rate-Limiting):**
   * Generated using secure PRNG `crypto.randomInt(1000, 10000)`.
   * Stored as a bcrypt hash (salt 10). Revealed in a secure one-time copyable modal to the seller during credential deposition.
   * **Rate-Limited Verification**: Maximum of 5 attempts on code entry. On the 5th failed attempt, code verification is frozen for 15 minutes (`release_attempt_lockout_until`) and a security alert is posted to `lobby_messages`.
4. **Invariant 4 (Server-Side Message Sanitization & Roman Urdu Defenses):**
   * In-app chat strips Pakistani phone numbers (`03XX`, `+923XX`), emails, URLs, and evasion keywords (`WhatsApp`, `waatsap`, `watsap`, `EasyPaisa`, `JazzCash`, `dm kro`, `call me`).
   * **Roman Urdu Digit Sequence Defense**: Redacts sequences of 4 or more spelled-out numbers (`zero`, `sifar`, `aik`, `do`, `teen`, `chaar`, `panch`, `chhay`, `saat`, `aath`, `nau`) used to leak phone numbers off-platform.
   * Sanitization runs **strictly on the server** inside `sendLobbyMessageAction`, not on the client.
5. **Invariant 5 (Anti-Double-Selling Unique DB Index):**
   * Enforced at the DB level with a partial unique index on both `puuid` and `riot_id`:
     `CREATE UNIQUE INDEX unique_active_puuid ON lobbies (puuid) WHERE status NOT IN ('completed', 'refunded', 'cancelled');`
     `CREATE UNIQUE INDEX unique_active_riot_id ON lobbies (riot_id) WHERE status NOT IN ('completed', 'refunded', 'cancelled');`
6. **Invariant 6 (Timelock Safety & Handover Deferral):**
   * **6-hour auto-release countdown** protects sellers from silent/ghosting buyers.
   * **90-minute evidence deadline** on dispute accommodates Pakistani electricity load-shedding and mobile network drops.
   * **VaultRelay Handover Guard**: Auto-release is safely deferred if a 15-minute Riot email OTC handover is actively pending.
   * **36-hour hold on seller payouts** prevents post-sale chargeback pullbacks.

---

## 4. Key Subsystems & Implemented Features

### Feature 1: Pre-Escrow Riot Shard & Asset Lock
* **Location:** `src/lib/riot/verifier.ts`, `supabase/migrations/005_riot_puuid_shard.sql`, `src/components/lobby/RiotPassportCard.tsx`
* **Capabilities:**
  * Pre-creation format validation and normalization of Riot IDs.
  * Shard compatibility checking: Asia-Pacific (AP / Mumbai / Bahrain) receives a green verified passport badge; Non-AP (NA/EU) receives an alert warning of 160ms+ latency for Pakistani gamers.
  * Immutable `puuid` binding preventing the 30-day Riot ID rename exploit.
  * RFC 8785 canonical SHA-256 snapshot hashing of account rank, level, and region metadata.

### Feature 3: VaultRelay Synchronous Handover Protocol
* **Location:** `src/lib/handover.ts`, `src/app/lobby/[id]/handover-actions.ts`, `src/components/lobby/VaultRelayHandover.tsx`, `supabase/migrations/004_vaultrelay_handover.sql`
* **Capabilities:**
  * Isolated, typed channel for relaying Riot 6-digit email change confirmation codes without triggering chat filters.
  * Strict 15-minute countdown timer: auto-escalates to `disputed` if the seller fails to relay the OTP.
  * 4-point OAuth unlinking checklist: mandates verification that Google, Xbox Game Pass, PSN, and Twitch accounts are unlinked before release.

### Production Rails & Deployment Bundle
* **Location:** `supabase/migrations/production_bundle.sql`, `scripts/validate-env.mjs`, `vercel.json`, `docs/PRODUCTION_DEPLOYMENT.md`
* **Capabilities:**
  * Consolidated, idempotent SQL bundle configuring tables, RLS policies, RPC functions, and Realtime publications.
  * Automated environment validator (`npm run validate-env`) auditing production secrets.
  * Vercel cron configuration for 10-minute auto-release evaluations.

---

## 5. Design System Tokens (Zero Gradients / Zero Neon)

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

## 6. Codebase Map

```
vaulttrade/
├── docs/
│   └── PRODUCTION_DEPLOYMENT.md        # Step-by-step production setup runbook
├── scripts/
│   └── validate-env.mjs                # Production environment validator
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
│   │   │   ├── create/
│   │   │   │   ├── page.tsx            # Seller creates deal lobby with Riot passport
│   │   │   │   └── riot-actions.ts     # Pre-creation account verification action
│   │   │   └── [id]/
│   │   │       ├── page.tsx            # Server component (fetches lobby & creds)
│   │   │       ├── LobbyView.tsx       # 8-state interactive deal room
│   │   │       ├── actions.ts          # Core Server Actions (join, pay, creds, release, dispute, chat)
│   │   │       └── handover-actions.ts # VaultRelay OTP relay & OAuth unlinking actions
│   │   ├── admin/
│   │   │   ├── page.tsx                # Admin server component (is_admin check)
│   │   │   └── AdminDashboardView.tsx  # Raast verify, dispute review, payout ledger
│   │   └── api/
│   │       ├── auth/demo/route.ts      # Local demo session switcher (disabled in prod)
│   │       ├── cron/auto-release/      # 6h auto-release background worker
│   │       └── push/subscribe/         # Web Push subscription endpoint
│   ├── components/lobby/
│   │   ├── LobbyStatusBar.tsx          # Monospace countdown timer + status badge
│   │   ├── CredentialForm.tsx          # Seller credential input + copyable release code modal
│   │   ├── CredentialViewer.tsx        # Buyer copy-only protected viewer
│   │   ├── VerificationChecklist.tsx   # Mandatory 4-checkbox gate
│   │   ├── ReleaseCodeInput.tsx        # Rate-limited 4-digit code settlement input
│   │   ├── RiotPassportCard.tsx        # Riot account passport with AP shard check
│   │   ├── VaultRelayHandover.tsx      # 15-min OTC relay & 4-point OAuth checklist
│   │   ├── DisputePanel.tsx            # Freeze & 90-minute evidence proof upload
│   │   └── LobbyChat.tsx               # Real-time sanitized in-lobby chat
│   └── lib/
│       ├── sanitize.ts                 # Chat regex filter with Roman Urdu defenses (tested)
│       ├── release-code.ts             # 4-digit code hasher, verifier & rate-limiter (tested)
│       ├── handover.ts                 # VaultRelay validation & timer helpers (tested)
│       ├── riot/
│       │   └── verifier.ts             # Riot ID normalization, AP shard detector & snapshot hasher (tested)
│       ├── state-machine.ts            # Legal transition validator (tested)
│       ├── fee.ts                      # PKR fee tier calculator (tested)
│       ├── mock-data.ts                # Built-in demo data for offline testing
│       └── supabase/
│           ├── server.ts               # Server client with transparent mock proxy
│           ├── client.ts               # Browser client
│           └── admin.ts                # Service role client
├── supabase/migrations/
│   ├── 001_initial_schema.sql          # Core tables + active riot id index
│   ├── 002_rls_policies.sql            # RLS policies with WITH CHECK hardening
│   ├── 003_functions.sql               # Fee triggers, auto-release RPC, deal counter
│   ├── 004_vaultrelay_handover.sql     # handover_protocols table with 6-digit OTP constraint
│   ├── 005_riot_puuid_shard.sql        # PUUID, shard columns, and unique_active_puuid index
│   ├── 006_evidence_clock_and_release_limits.sql # 5-attempt lockout & 90m evidence deadline
│   └── production_bundle.sql           # Consolidated idempotent production migration
├── vercel.json                         # Security headers & 10-minute cron configuration
└── package.json
```

---

## 7. Local Development & Testing

* Local demo mode is supported out of the box with zero environment configuration.
* Navigate to `http://localhost:3000/login` and click **"Seller"**, **"Buyer"**, or **"Admin"**.
* Active demo lobby: `http://localhost:3000/lobby/demo-lobby-1`

### Commands
```bash
npm run dev          # Start local Next.js Turbopack dev server (port 3000)
npm test             # Run 42 automated Vitest tests across 6 test suites
npx tsc --noEmit     # TypeScript compilation check (0 errors required)
npm run lint         # ESLint check (0 errors, 0 warnings required)
npm run validate-env # Audit production environment variables
```
