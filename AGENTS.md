# AGENTS.md — Instructions for AI Coding Assistants (Antigravity)

Welcome! This repository contains **VaultTrade**, a secure peer-to-peer escrow platform for Valorant account trading with Pakistani Raast / SadaPay / NayaPay payment rails.

---

## 🧭 Getting Context Instantly
1. **Always read [`CONTEXT.md`](file:///./CONTEXT.md)** first. It contains the domain vocabulary, architectural invariants, design tokens, and codebase map.
2. **Current state:** The MVP is 100% built, tested (14/14 Vitest tests passing), and audited by the `hunter` agent. A built-in local demo mode exists so you can test all features without a live database.

---

## ⚡ Non-Negotiable Invariants
* **Invariant 1:** Credentials (`credentials` table) are **ONLY** readable by the buyer (`isBuyer`). Sellers and Admins must NEVER see raw credentials once submitted.
* **Invariant 2:** State machine transitions must be strictly enforced via `canTransitionLobby()` in `src/app/lobby/[id]/actions.ts`.
* **Invariant 3:** Release codes must be generated with `crypto.randomInt` and stored as bcrypt hashes. Never return plaintext code to the seller.
* **Invariant 4:** Chat messages must be sanitized **on the server** via `sanitizeMessage` in `sendLobbyMessageAction`.
* **Invariant 5:** 1 active deal lobby per Riot ID (enforced via database partial unique index).
* **Invariant 6:** Design System: **ZERO gradients**, **ZERO neon colors**, flat dark theme (`#0a0a0b` base, `#111113` surface).

---

## 🛠️ Verification Commands
Before declaring any task or edit complete, always run:
```powershell
npx vitest run      # Must pass 14/14 tests
npx tsc --noEmit    # Must have 0 TypeScript errors
```

---

## 📋 Outstanding Roadmap
1. Deploy to Vercel (push to GitHub `main` triggers auto-deploy).
2. Live Supabase database setup (execute migrations `001`, `002`, `003` in `supabase/migrations/`).
3. Wire live VAPID keys and production Raast IBAN.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
