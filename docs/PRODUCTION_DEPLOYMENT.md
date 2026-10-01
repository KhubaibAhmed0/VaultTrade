# VaultTrade — Production Deployment Runbook

> **Target Architecture:** Next.js (Vercel) + PostgreSQL / Realtime / Auth (Supabase) + Raast / SadaPay Escrow Rails + Web Push (VAPID).

---

## 📋 Table of Contents
1. [Pre-Flight Architecture & Security Overview](#1-pre-flight-architecture--security-overview)
2. [Step 1: Supabase Project Provisioning & Database Setup](#step-1-supabase-project-provisioning--database-setup)
3. [Step 2: SadaPay / Raast Business Escrow Setup](#step-2-sadapay--raast-business-escrow-setup)
4. [Step 3: Web Push API (VAPID) Key Generation](#step-3-web-push-api-vapid-key-generation)
5. [Step 4: 1-Click Vercel Deployment & Environment Matrix](#step-4-1-click-vercel-deployment--environment-matrix)
6. [Step 5: Pre-Flight Validation & Smoke Tests](#step-5-pre-flight-validation--smoke-tests)
7. [Operational Runbook & Dispute Resolution](#operational-runbook--dispute-resolution)

---

## 1. Pre-Flight Architecture & Security Overview

VaultTrade operates under 6 non-negotiable security invariants:
* **Invariant 1 (Buyer-Only Credential Access):** Only the assigned buyer can query account credentials (`public.credentials`). Sellers and Admins are locked out via Row Level Security (RLS).
* **Invariant 2 (State Machine Rigidity):** Transitions are strictly unidirectional: `open` ➔ `awaiting_payment` ➔ `awaiting_credentials` ➔ `inspecting` ➔ `completed` / `disputed`.
* **Invariant 3 (Release Code Hashing):** 4-digit code generated via CSPRNG `crypto.randomInt(1000, 10000)` and stored strictly as a bcrypt hash (salt rounds 10).
* **Invariant 4 (Server Sanitization):** Pakistani phone numbers (`03XX`, `+923XX`), emails, off-platform payment keywords (`EasyPaisa`, `JazzCash`), and external URLs are filtered server-side.
* **Invariant 5 (Anti-Double-Selling):** Partial unique database indexes enforce exactly 1 active lobby per Riot ID and per Riot PUUID.
* **Invariant 6 (Timelock Protection):** 6-hour auto-release countdown; 30-minute evidence deadline on dispute; 36-hour safety hold on payouts.

---

## Step 1: Supabase Project Provisioning & Database Setup

### 1.1 Provision Project
1. Log in to [Supabase Management Console](https://supabase.com/dashboard).
2. Click **New Project** and configure:
   * **Organization:** Your organization.
   * **Name:** `vaulttrade-production`
   * **Database Password:** Generate a secure 32-character password and store it safely in your password manager.
   * **Region:** Select **Singapore (`ap-southeast-1`)** for lowest latency to Pakistan (~45–65ms).
   * **Pricing Plan:** Pro Tier recommended for production (enables Point-in-Time Recovery and elevated compute).

### 1.2 Apply the Consolidated Production Migration Bundle
You can apply the idempotent migration via the Supabase Dashboard SQL Editor or via the Supabase CLI:

#### Method A: Supabase Dashboard SQL Editor
1. In your project dashboard, navigate to **SQL Editor** -> **+ New Query**.
2. Open `supabase/migrations/production_bundle.sql` from this repository.
3. Paste the entire SQL script into the query editor and click **Run**.
4. Confirm success: The query should execute with zero errors and create 8 tables, 11 indexes, 7 functions, 4 triggers, and configure RLS on all tables.

#### Method B: Supabase CLI
```bash
npx supabase login
npx supabase link --project-ref <your-supabase-project-ref>
npx supabase db execute --file supabase/migrations/production_bundle.sql
```

### 1.3 Verify Tables & Realtime Replication
1. Navigate to **Database** -> **Tables** and verify:
   * `public.profiles`
   * `public.lobbies`
   * `public.credentials`
   * `public.transactions`
   * `public.disputes`
   * `public.lobby_messages`
   * `public.push_subscriptions`
   * `public.handover_protocols`
2. Navigate to **Database** -> **Replication** and confirm `supabase_realtime` contains:
   * `lobbies`
   * `lobby_messages`
   * `transactions`
   * `disputes`
   * `handover_protocols`

### 1.4 Configure Supabase Authentication
1. Go to **Authentication** -> **URL Configuration**:
   * **Site URL:** `https://your-domain.com` (or your Vercel deployment URL)
   * **Redirect URLs:** Add `https://your-domain.com/**`
2. Go to **Authentication** -> **Providers** -> **Phone**:
   * Enable Phone authentication with SMS OTP (configure Twilio, MessageBird, or local gateway supporting Pakistani `+92` numbers).

### 1.5 Retrieve API Credentials
Navigate to **Project Settings** -> **API** and copy:
* **Project URL** (`https://<project-ref>.supabase.co`)
* **Project API Keys** -> `anon` (public key)
* **Project API Keys** -> `service_role` (secret key)

---

## Step 2: SadaPay / Raast Business Escrow Setup

VaultTrade uses Pakistan's **Raast (National Instant Payment System)** via a dedicated **SadaPay Business Account** to ensure instant, irreversible, low-fee P2P deposits.

### 2.1 SadaPay Business Onboarding
1. Download the SadaPay app and register for a **SadaPay Business / Freelancer Account**.
2. Complete Pakistani CNIC & biometric verification.
3. Note your dedicated Raast IBAN (24 characters, format: `PK<check_digits>SADA<16_digit_account_number>`).
4. Set the display title to your official brand (e.g. `VaultTrade Escrow`).

### 2.2 Raast Directory Registration
1. In SadaPay, link your Raast IBAN to your corporate mobile number (`03XXXXXXXXX`) or Raast ID alias for instant payer lookup.

### 2.3 Operational Admin Verification Protocol
When a buyer submits payment:
1. Buyer submits their 12-digit Raast Transaction Reference Number (TRN) and receipt screenshot.
2. The Platform Admin checks the SadaPay Business App for the matching incoming Raast credit alert.
3. Admin logs into `https://your-domain.com/admin` (must have `is_admin = TRUE` in `profiles`).
4. In the **Raast Payment Verification** ledger:
   * Click **Approve** once credit is confirmed in the bank ledger.
   * This atomically transitions the lobby to `awaiting_credentials` and triggers push notification to the seller.

---

## Step 3: Web Push API (VAPID) Key Generation

VaultTrade delivers instant push notifications to buyers and sellers when credentials are submitted, when payments are verified, or when the 6-hour auto-release timer is nearing expiry.

### 3.1 Generate VAPID Keypair
Run the following command in your terminal:
```bash
npx web-push generate-vapid-keys
```

Example output:
```text
=======================================
Public Key:
BEl62iUYgUivxIkv69yViEuiBIa... (87 chars)

Private Key:
a84jK82kd... (43 chars)
=======================================
```

### 3.2 Configure Environment Variables
* `NEXT_PUBLIC_VAPID_PUBLIC_KEY`: Insert Public Key.
* `VAPID_PRIVATE_KEY`: Insert Private Key.
* `VAPID_EMAIL`: `mailto:support@vaulttrade.pk`

---

## Step 4: 1-Click Vercel Deployment & Environment Matrix

### 4.1 Connect to Vercel
1. Push your repository to GitHub: `git push origin main`.
2. Open [Vercel Dashboard](https://vercel.com/new).
3. Import the `VaultTrade` repository.
4. Select Framework: **Next.js** (Root Directory: `./`).

### 4.2 Production Environment Variables Matrix
Add the following 8 mandatory environment variables under **Project Settings** -> **Environment Variables**:

| Variable Name | Environment | Required | Description | Example / Format |
| :--- | :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview | **YES** | Supabase REST / GraphQL endpoint | `https://xyzproject.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview | **YES** | Supabase public anonymous API key | `eyJhbGciOi...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Production | **YES** | Supabase admin secret key | `eyJhbGciOi...` |
| `PLATFORM_SADAPAY_IBAN` | Production, Preview | **YES** | Escrow Raast IBAN | `PK82SADA0000001234567890` |
| `PLATFORM_SADAPAY_TITLE` | Production, Preview | **YES** | Escrow account holder name | `VaultTrade Escrow` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Production, Preview | **YES** | Web Push VAPID public key | `BEl62iUY...` |
| `VAPID_PRIVATE_KEY` | Production | **YES** | Web Push VAPID secret key | `a84jK82...` |
| `CRON_SECRET` | Production | **YES** | Bearer secret for auto-release cron | 32-char hex string |
| `VAPID_EMAIL` | Production | Optional | Push service contact email | `admin@vaulttrade.pk` |
| `NODE_ENV` | Production | Optional | Vercel sets this automatically | `production` |

> [!IMPORTANT]
> Generate a strong `CRON_SECRET` before deploying:
> ```bash
> node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
> ```

### 4.3 Automated Cron Schedule (`vercel.json`)
The included `vercel.json` automatically registers:
* **Route:** `/api/cron/auto-release`
* **Schedule:** `*/10 * * * *` (Every 10 minutes)
* **Security:** Secured by `Authorization: Bearer <CRON_SECRET>` header. Vercel Cron automatically injects this authorization header when `CRON_SECRET` is configured in environment variables.

---

## Step 5: Pre-Flight Validation & Smoke Tests

### 5.1 Run Environment Validator Locally
Before deploying, verify your production credentials:
```bash
node scripts/validate-env.mjs --production
```

### 5.2 Post-Deployment Smoke Test Checklist
* [ ] **Home Page:** Access `https://your-domain.com`. Verify font rendering and theme tokens.
* [ ] **Demo Mode Disabled:** Navigate to `/api/auth/demo`. Confirm it returns 404 in production.
* [ ] **Security Headers:** Inspect response headers on `https://your-domain.com` using curl:
  ```bash
  curl -I https://your-domain.com
  ```
  Verify `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Strict-Transport-Security` are present.
* [ ] **Admin Account Bootstrap:** Sign up on the platform, then run in the Supabase SQL Editor:
  ```sql
  UPDATE public.profiles SET is_admin = TRUE WHERE phone = '+92300XXXXXXX';
  ```
* [ ] **Test Lobby Workflow:**
  1. Seller creates deal lobby with Valorant Riot ID.
  2. Buyer joins and receives Raast IBAN instructions.
  3. Buyer submits test TRN.
  4. Admin verifies TRN in Admin Dashboard.
  5. Seller inputs credentials (verified: buyer can view; seller/admin cannot view).
  6. Buyer checks all 4 checklist steps in `handover_protocols`.
  7. Buyer inputs 4-digit release code to disburse escrow.
  8. Lobby transitions to `completed` and initiates 36-hour payout timelock.
