#!/usr/bin/env node

/**
 * VaultTrade — Production Environment Configuration Validator
 *
 * Verifies all mandatory environment variables for production readiness,
 * enforces strict anti-placeholder invariants, verifies Pakistani Raast IBAN format,
 * checks cryptographic key lengths, and exits 0 on valid config or 1 on failure.
 *
 * Usage:
 *   node scripts/validate-env.mjs [--strict|--production]
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// Color codes for ANSI terminal output
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const GRAY = "\x1b[90m";

// Minimal self-contained .env parser to avoid runtime dependencies
function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const content = readFileSync(filePath, "utf-8");
  const parsed = {};
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    let val = line.slice(eqIdx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    parsed[key] = val;
  }
  return parsed;
}

// Load env files in priority order: process.env > .env.production > .env.local > .env
const cwd = process.cwd();
const localEnvs = {
  ...loadEnvFile(resolve(cwd, ".env")),
  ...loadEnvFile(resolve(cwd, ".env.local")),
  ...loadEnvFile(resolve(cwd, ".env.production")),
};

function getEnv(key) {
  return process.env[key] || localEnvs[key] || "";
}

const args = process.argv.slice(2);
const isStrict =
  args.includes("--strict") ||
  args.includes("--production") ||
  process.env.NODE_ENV === "production";

// Common placeholder substrings
const PLACEHOLDER_PATTERNS = [
  /placeholder/i,
  /example/i,
  /your-/i,
  /change-me/i,
  /dummy/i,
  /test_key/i,
  /PK00SADA0000001234567890/i,
  /placeholder-anon-key/i,
  /placeholder-service-role-key/i,
  /placeholder-vapid-public-key/i,
  /placeholder-vapid-private-key/i,
];

// Required Production Environment Variables
const REQUIRED_VARS = [
  {
    key: "NEXT_PUBLIC_SUPABASE_URL",
    description: "Supabase project URL",
    validate: (val) => {
      try {
        const url = new URL(val);
        return url.protocol === "https:";
      } catch {
        return false;
      }
    },
    hint: "Must be a valid HTTPS URL (e.g. https://<project>.supabase.co)",
    secret: false,
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    description: "Supabase anonymous public key",
    validate: (val) => val.length >= 30,
    hint: "Standard Supabase public anon JWT key",
    secret: false,
  },
  {
    key: "SUPABASE_SERVICE_ROLE_KEY",
    description: "Supabase service role secret (Server/Admin only)",
    validate: (val) => val.length >= 30,
    hint: "High-privilege admin JWT service key",
    secret: true,
  },
  {
    key: "PLATFORM_SADAPAY_IBAN",
    description: "SadaPay / Raast Platform Escrow IBAN",
    validate: (val) => {
      // 24 characters: PK + 2 check digits + 4 letter bank identifier (SADA) + 16 account digits
      const cleaned = val.replace(/\s+/g, "").toUpperCase();
      return /^PK\d{2}[A-Z]{4}\d{16}$/.test(cleaned);
    },
    hint: "Pakistani IBAN format (24 characters, e.g. PK00SADA0000001234567890)",
    secret: false,
  },
  {
    key: "PLATFORM_SADAPAY_TITLE",
    description: "SadaPay Escrow Account Title",
    validate: (val) => val.trim().length >= 3,
    hint: "Registered account holder title (e.g. VaultTrade Escrow)",
    secret: false,
  },
  {
    key: "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
    description: "Web Push VAPID Public Key",
    validate: (val) => val.length >= 60,
    hint: "Generate with: npx web-push generate-vapid-keys",
    secret: false,
  },
  {
    key: "VAPID_PRIVATE_KEY",
    description: "Web Push VAPID Private Key",
    validate: (val) => val.length >= 30,
    hint: "Generate with: npx web-push generate-vapid-keys",
    secret: true,
  },
  {
    key: "CRON_SECRET",
    description: "Vercel / External Cron Authorization Secret",
    validate: (val) => val.length >= 16,
    hint: "High entropy bearer token (min 16 chars) protecting /api/cron/auto-release",
    secret: true,
  },
];

const OPTIONAL_VARS = [
  {
    key: "VAPID_EMAIL",
    description: "VAPID Contact Email (mailto:)",
    validate: (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
    hint: "Email address for push service compliance",
  },
  {
    key: "NODE_ENV",
    description: "Runtime Environment Mode",
    validate: (val) => ["production", "development", "test"].includes(val),
    hint: "Typically 'production' on Vercel deployments",
  },
];

function maskValue(val, isSecret) {
  if (!val) return `${GRAY}(empty)${RESET}`;
  if (isSecret) {
    if (val.length <= 8) return "********";
    return `${val.slice(0, 4)}...${val.slice(-4)}`;
  }
  if (val.length > 36) {
    return `${val.slice(0, 18)}...${val.slice(-14)}`;
  }
  return val;
}

console.log(`\n${BOLD}${CYAN}====================================================${RESET}`);
console.log(`${BOLD}${CYAN}   VaultTrade Production Environment Validator      ${RESET}`);
console.log(`${BOLD}${CYAN}====================================================${RESET}`);
console.log(`${GRAY}Mode: ${isStrict ? RED + "STRICT / PRODUCTION" : YELLOW + "DEVELOPMENT / ADVISORY"}${RESET}\n`);

let hasErrors = false;
let hasWarnings = false;

const results = [];

for (const item of REQUIRED_VARS) {
  const val = getEnv(item.key);
  let status = "OK";
  let message = "";

  if (!val) {
    status = "MISSING";
    message = "Variable is missing from environment";
    hasErrors = true;
  } else if (PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(val))) {
    status = "PLACEHOLDER";
    message = "Detected placeholder or demo default value";
    if (isStrict) {
      hasErrors = true;
    } else {
      hasWarnings = true;
    }
  } else if (!item.validate(val)) {
    status = "INVALID";
    message = item.hint;
    hasErrors = true;
  }

  results.push({
    key: item.key,
    status,
    preview: maskValue(val, item.secret),
    message,
  });
}

// Print results table
for (const r of results) {
  let badge = `${GREEN}[✓ PASS]${RESET}`;
  if (r.status === "MISSING" || (r.status === "PLACEHOLDER" && isStrict) || r.status === "INVALID") {
    badge = `${RED}[✗ FAIL]${RESET}`;
  } else if (r.status === "PLACEHOLDER") {
    badge = `${YELLOW}[! WARN]${RESET}`;
  }

  console.log(`${badge} ${BOLD}${r.key.padEnd(32)}${RESET} ${r.preview}`);
  if (r.message) {
    console.log(`         ${GRAY}↳ ${r.message}${RESET}`);
  }
}

// Check optional vars
console.log(`\n${BOLD}Optional Configuration:${RESET}`);
for (const opt of OPTIONAL_VARS) {
  const val = getEnv(opt.key);
  if (!val) {
    console.log(`${GRAY}[ℹ OPTIONAL] ${opt.key.padEnd(28)} (not set — defaults will apply)${RESET}`);
  } else if (opt.validate && !opt.validate(val)) {
    console.log(`${YELLOW}[! NOTICE ] ${opt.key.padEnd(28)} Value '${val}' may be malformed (${opt.hint})${RESET}`);
  } else {
    console.log(`${GREEN}[✓ PASS    ] ${opt.key.padEnd(28)} ${val}${RESET}`);
  }
}

console.log(`\n${BOLD}Summary:${RESET}`);
if (hasErrors) {
  console.log(
    `${RED}${BOLD}Validation failed!${RESET} Production deployment is blocked until missing or placeholder variables are resolved.`
  );
  process.exit(1);
} else if (hasWarnings) {
  console.log(
    `${YELLOW}${BOLD}Validation passed with warnings.${RESET} Placeholder keys detected in non-strict mode. DO NOT deploy placeholders to production.`
  );
  process.exit(0);
} else {
  console.log(
    `${GREEN}${BOLD}Validation successful!${RESET} All production environment variables are present, properly formatted, and verified.`
  );
  process.exit(0);
}
