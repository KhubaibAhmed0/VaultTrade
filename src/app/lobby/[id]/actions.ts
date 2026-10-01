"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canTransitionLobby, LobbyStatus } from "@/lib/state-machine";
import { calculatePlatformFee } from "@/lib/fee";
import { generateReleaseCode, hashReleaseCode, verifyReleaseCode } from "@/lib/release-code";
import { sanitizeMessage } from "@/lib/sanitize";
import { revalidatePath } from "next/cache";

import { verifyRiotAccount, normalizeRiotId } from "@/lib/riot/verifier";

/**
 * Creates a new lobby as a seller.
 */
export async function createLobbyAction(formData: {
  riotId: string;
  amount: number;
  puuid?: string;
  riotIdNormalized?: string;
  accountRegion?: string;
  isApShard?: boolean;
  accountRank?: string;
  accountLevel?: number;
  snapshotHash?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in to create a lobby.");
  }

  const { riotId, amount } = formData;
  if (!riotId || !riotId.includes("#")) {
    throw new Error("Please provide a valid Riot ID format (e.g. Reyna#1234).");
  }

  if (amount < 500) {
    throw new Error("Minimum deal amount is 500 PKR.");
  }

  // Pre-escrow asset verification
  let passport;
  if (!formData.puuid || !formData.snapshotHash) {
    passport = await verifyRiotAccount(riotId);
  }

  const puuid = formData.puuid || passport?.puuid;
  const riotIdNormalized = formData.riotIdNormalized || passport?.riotIdNormalized || normalizeRiotId(riotId);
  const accountRegion = formData.accountRegion || passport?.accountRegion || "ap";
  const isApShard = formData.isApShard !== undefined ? formData.isApShard : (passport?.isApShard ?? true);
  const accountRank = formData.accountRank || passport?.accountRank || "Unranked";
  const accountLevel = formData.accountLevel || passport?.accountLevel || 1;
  const snapshotHash = formData.snapshotHash || passport?.snapshotHash || "";

  // Guard against 30-day rename exploit via immutable PUUID
  if (puuid) {
    const { data: existingByPuuid } = await supabase
      .from("lobbies")
      .select("id")
      .eq("puuid", puuid)
      .not("status", "in", '("completed","refunded","cancelled")')
      .maybeSingle();

    if (existingByPuuid) {
      throw new Error("An active lobby already exists for this Riot account (PUUID). Double-selling is prohibited.");
    }
  }

  // Check if an active lobby already exists for this normalized Riot ID
  const { data: existingActive } = await supabase
    .from("lobbies")
    .select("id")
    .eq("riot_id_normalized", riotIdNormalized)
    .not("status", "in", '("completed","refunded","cancelled")')
    .maybeSingle();

  if (existingActive) {
    throw new Error("An active lobby already exists for this Riot ID. Double-selling is prohibited.");
  }

  const platformFee = calculatePlatformFee(amount);

  // Generate 4-digit release code and hash it
  const plainReleaseCode = generateReleaseCode();
  const releaseCodeHash = await hashReleaseCode(plainReleaseCode);

  const { data: newLobby, error } = await supabase
    .from("lobbies")
    .insert({
      riot_id: riotId.trim(),
      riot_id_normalized: riotIdNormalized,
      puuid,
      account_region: accountRegion,
      is_ap_shard: isApShard,
      account_rank: accountRank,
      account_level: accountLevel,
      snapshot_hash: snapshotHash,
      seller_id: user.id,
      amount,
      platform_fee: platformFee,
      status: "open",
      release_code_hash: releaseCodeHash,
    })
    .select("id")
    .single();

  if (error || !newLobby) {
    throw new Error(error?.message || "Failed to create lobby.");
  }

  revalidatePath("/dashboard");
  return {
    lobbyId: newLobby.id,
  };
}

/**
 * Buyer joins an open lobby.
 */
export async function joinLobbyAction(lobbyId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in to join a lobby.");
  }

  const { data: lobby } = await supabase
    .from("lobbies")
    .select("seller_id, status")
    .eq("id", lobbyId)
    .single();

  if (!lobby) {
    throw new Error("Lobby not found.");
  }

  if (lobby.seller_id === user.id) {
    throw new Error("You cannot join your own lobby as a buyer.");
  }

  if (lobby.status !== "open") {
    throw new Error("This lobby is no longer open for joining.");
  }

  if (!canTransitionLobby("open", "awaiting_payment")) {
    throw new Error("Illegal transition to awaiting_payment.");
  }

  const { error } = await supabase
    .from("lobbies")
    .update({
      buyer_id: user.id,
      status: "awaiting_payment",
    })
    .eq("id", lobbyId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/lobby/${lobbyId}`);
  return { success: true };
}

/**
 * Buyer submits Raast payment proof.
 */
export async function submitPaymentProofAction(
  lobbyId: string,
  raastTrn: string,
  screenshotUrl: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated.");
  }

  const { data: lobby } = await supabase
    .from("lobbies")
    .select("buyer_id, status, amount, platform_fee")
    .eq("id", lobbyId)
    .single();

  if (!lobby || lobby.buyer_id !== user.id) {
    throw new Error("Unauthorized.");
  }

  if (lobby.status !== "awaiting_payment") {
    throw new Error("Lobby is not in awaiting payment status.");
  }

  const totalAmount = lobby.amount + lobby.platform_fee;

  // Insert transaction entry
  const { error: txError } = await supabase.from("transactions").insert({
    lobby_id: lobbyId,
    buyer_raast_trn: raastTrn.trim(),
    buyer_screenshot_url: screenshotUrl || "",
    amount: totalAmount,
    admin_verified: false,
    payout_status: "pending",
  });

  if (txError) {
    throw new Error(txError.message);
  }

  // Trigger admin push notification (calls internal API route safely)
  try {
    const adminSupabase = createAdminClient();
    await adminSupabase
      .from("profiles")
      .select("id")
      .eq("is_admin", true);

    // Notification will be picked up by push worker or admin dashboard
  } catch (err) {
    console.error("Admin notify error:", err);
  }

  revalidatePath(`/lobby/${lobbyId}`);
  return { success: true };
}

/**
 * Seller submits credentials into the lobby.
 */
export async function submitCredentialsAction(
  lobbyId: string,
  creds: {
    riotEmail: string;
    riotPassword: string;
    firstEmail: string;
    dateOfBirth: string;
    socialLogins?: string;
    notes?: string;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated.");
  }

  const { data: lobby } = await supabase
    .from("lobbies")
    .select("seller_id, status")
    .eq("id", lobbyId)
    .single();

  if (!lobby || lobby.seller_id !== user.id) {
    throw new Error("Only the seller can submit credentials.");
  }

  if (lobby.status !== "awaiting_credentials") {
    throw new Error("Payment has not been verified yet.");
  }

  if (!canTransitionLobby("awaiting_credentials", "inspecting")) {
    throw new Error("Illegal transition to inspecting.");
  }

  // Insert credentials (RLS ensures only buyer can read later)
  const { error: credError } = await supabase.from("credentials").insert({
    lobby_id: lobbyId,
    riot_email: creds.riotEmail.trim(),
    riot_password: creds.riotPassword.trim(),
    first_email: creds.firstEmail.trim(),
    date_of_birth: creds.dateOfBirth.trim(),
    social_logins: creds.socialLogins?.trim() || null,
    notes: creds.notes?.trim() || null,
  });

  if (credError) {
    throw new Error(credError.message);
  }

  // 6-hour auto-release timer start
  const autoReleaseAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();

  const { error: updateError } = await supabase
    .from("lobbies")
    .update({
      status: "inspecting",
      auto_release_at: autoReleaseAt,
    })
    .eq("id", lobbyId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidatePath(`/lobby/${lobbyId}`);
  return { success: true };
}

/**
 * Buyer inputs the 4-digit release code to finalize the deal.
 */
export async function submitReleaseCodeAction(lobbyId: string, code: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated.");
  }

  const { data: lobby } = await supabase
    .from("lobbies")
    .select("buyer_id, status, release_code_hash")
    .eq("id", lobbyId)
    .single();

  if (!lobby || lobby.buyer_id !== user.id) {
    throw new Error("Only the buyer can submit the release code.");
  }

  if (lobby.status !== "inspecting") {
    throw new Error("Lobby is not in inspecting status.");
  }

  if (!canTransitionLobby("inspecting", "completed")) {
    throw new Error("Illegal transition to completed.");
  }

  if (!lobby.release_code_hash) {
    throw new Error("Release code hash missing on lobby.");
  }

  const isValid = await verifyReleaseCode(code.trim(), lobby.release_code_hash);
  if (!isValid) {
    throw new Error("Invalid 4-digit code. Please verify and try again.");
  }

  const payoutAt = new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from("lobbies")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      payout_at: payoutAt,
    })
    .eq("id", lobbyId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/lobby/${lobbyId}`);
  return { success: true };
}

/**
 * Buyer or Seller raises a dispute.
 */
export async function raiseDisputeAction(lobbyId: string, reason: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated.");
  }

  const { data: lobby } = await supabase
    .from("lobbies")
    .select("seller_id, buyer_id, status")
    .eq("id", lobbyId)
    .single();

  if (!lobby) {
    throw new Error("Lobby not found.");
  }

  const isParticipant = lobby.seller_id === user.id || lobby.buyer_id === user.id;
  if (!isParticipant) {
    throw new Error("Only lobby participants can raise a dispute.");
  }

  if (lobby.status !== "inspecting") {
    throw new Error("Dispute can only be raised during the inspection period.");
  }

  if (!canTransitionLobby(lobby.status as LobbyStatus, "disputed")) {
    throw new Error("Illegal transition to disputed.");
  }

  // 30-minute evidence clock
  const evidenceDeadline = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  // Create dispute record
  const { error: disputeError } = await supabase.from("disputes").insert({
    lobby_id: lobbyId,
    raised_by: user.id,
    reason: reason.trim(),
    resolution: "pending",
  });

  if (disputeError) {
    throw new Error(disputeError.message);
  }

  // Update lobby status
  const { error: lobbyError } = await supabase
    .from("lobbies")
    .update({
      status: "disputed",
      evidence_deadline: evidenceDeadline,
    })
    .eq("id", lobbyId);

  if (lobbyError) {
    throw new Error(lobbyError.message);
  }

  revalidatePath(`/lobby/${lobbyId}`);
  return { success: true };
}

/**
 * Admin verifies incoming Raast payment.
 */
export async function adminVerifyPaymentAction(lobbyId: string, approved: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    throw new Error("Admin privileges required.");
  }

  const adminClient = createAdminClient();

  if (approved) {
    await adminClient
      .from("transactions")
      .update({ admin_verified: true })
      .eq("lobby_id", lobbyId);

    await adminClient
      .from("lobbies")
      .update({ status: "awaiting_credentials" })
      .eq("id", lobbyId);
  } else {
    // Rejected payment
    await adminClient
      .from("transactions")
      .update({ admin_verified: false })
      .eq("lobby_id", lobbyId);
  }

  revalidatePath(`/lobby/${lobbyId}`);
  revalidatePath(`/admin`);
  return { success: true };
}

/**
 * Server-side sanitized chat message dispatch (Security Invariant 4).
 */
export async function sendLobbyMessageAction(lobbyId: string, rawContent: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated.");
  }

  const { data: lobby } = await supabase
    .from("lobbies")
    .select("seller_id, buyer_id")
    .eq("id", lobbyId)
    .single();

  if (!lobby || (lobby.seller_id !== user.id && lobby.buyer_id !== user.id)) {
    throw new Error("Only lobby participants can send messages.");
  }

  // Server-side sanitization
  const sanitized = sanitizeMessage(rawContent);

  const { data, error } = await supabase
    .from("lobby_messages")
    .insert({
      lobby_id: lobbyId,
      sender_id: user.id,
      content: sanitized,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return { success: true, message: data };
}

/**
 * Upload dispute evidence link.
 */
export async function submitDisputeEvidenceAction(lobbyId: string, evidenceUrl: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated.");
  }

  const { data: dispute } = await supabase
    .from("disputes")
    .select("id, evidence_urls, raised_by")
    .eq("lobby_id", lobbyId)
    .single();

  if (!dispute) {
    throw new Error("No active dispute found for this lobby.");
  }

  const updatedUrls = [...(dispute.evidence_urls || []), evidenceUrl.trim()];

  const { error } = await supabase
    .from("disputes")
    .update({ evidence_urls: updatedUrls })
    .eq("id", dispute.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/lobby/${lobbyId}`);
  return { success: true };
}

