"use server";

import { createClient } from "@/lib/supabase/server";
import {
  verifyRiotAccount,
  normalizeRiotId,
  validateRiotId,
  RiotAccountPassport,
} from "@/lib/riot/verifier";

export type VerifyRiotActionResult =
  | { success: true; passport: RiotAccountPassport }
  | { success: false; error: string };

/**
 * Server Action to verify a Riot Account prior to lobby creation.
 * 1. Validates format.
 * 2. Queries public shard/rank info (Invariant 1: NEVER requests private credentials).
 * 3. Enforces Invariant 5 & anti-rename exploit: checks active lobbies by PUUID and normalized Riot ID.
 */
export async function verifyRiotAccountAction(
  riotId: string
): Promise<VerifyRiotActionResult> {
  const validation = validateRiotId(riotId);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error || "Please enter a valid Riot ID format (GameName#Tag).",
    };
  }

  try {
    const passport = await verifyRiotAccount(riotId);
    const normalized = normalizeRiotId(riotId);

    const supabase = await createClient();

    // Check if an active lobby already exists for this immutable PUUID
    const { data: existingPuuid } = await supabase
      .from("lobbies")
      .select("id")
      .eq("puuid", passport.puuid)
      .not("status", "in", '("completed","refunded","cancelled")')
      .maybeSingle();

    if (existingPuuid) {
      return {
        success: false,
        error:
          "An active deal lobby already exists for this Riot Account (PUUID match). Double-selling or rename exploit attempts are strictly blocked.",
      };
    }

    // Check if an active lobby exists for this normalized Riot ID
    const { data: existingRiotId } = await supabase
      .from("lobbies")
      .select("id")
      .eq("riot_id_normalized", normalized)
      .not("status", "in", '("completed","refunded","cancelled")')
      .maybeSingle();

    if (existingRiotId) {
      return {
        success: false,
        error:
          "An active deal lobby already exists for this Riot ID. Double-selling is strictly prohibited.",
      };
    }

    return {
      success: true,
      passport,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to verify Riot Account.",
    };
  }
}
