"use server";

import { createClient } from "@/lib/supabase/server";
import {
  isValidRiotOtp,
  isValidTargetEmail,
  calculateOtpExpiry,
  isOtpExpired,
  getRemainingOtpSeconds,
  isOAuthChecklistComplete,
  OAuthService,
} from "@/lib/handover";
import { canTransitionLobby } from "@/lib/state-machine";
import { revalidatePath } from "next/cache";

/**
 * Fetches the active handover protocol for a lobby.
 */
export async function getHandoverProtocolAction(lobbyId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated.");
  }

  const { data: protocol } = await supabase
    .from("handover_protocols")
    .select("*")
    .eq("lobby_id", lobbyId)
    .maybeSingle();

  return { protocol };
}

/**
 * Buyer requests Riot Email change to a new target email.
 * Initiates the strict 15-minute OTP countdown.
 */
export async function requestRiotEmailOtcAction(lobbyId: string, buyerNewEmail: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated.");
  }

  const { data: lobby } = await supabase
    .from("lobbies")
    .select("id, buyer_id, seller_id, status")
    .eq("id", lobbyId)
    .single();

  if (!lobby) {
    throw new Error("Lobby not found.");
  }

  if (lobby.buyer_id !== user.id) {
    throw new Error("Only the buyer can request a Riot Email Change OTC.");
  }

  if (lobby.status !== "inspecting") {
    throw new Error("Email handover is only available during the inspection period.");
  }

  const cleanEmail = buyerNewEmail.trim();
  if (!isValidTargetEmail(cleanEmail)) {
    throw new Error("Please provide a valid target email address.");
  }

  const { data: existing } = await supabase
    .from("handover_protocols")
    .select("id, status")
    .eq("lobby_id", lobbyId)
    .maybeSingle();

  if (existing?.status === "escalated_dispute") {
    throw new Error("Handover protocol has been escalated to dispute and cannot be modified.");
  }

  const now = new Date();
  const expiresAt = calculateOtpExpiry(now, 15);

  if (existing) {
    const { error: updateError } = await supabase
      .from("handover_protocols")
      .update({
        target_email: cleanEmail,
        riot_otp: null,
        otp_requested_at: now.toISOString(),
        otp_expires_at: expiresAt.toISOString(),
        status: "pending",
      })
      .eq("lobby_id", lobbyId);

    if (updateError) throw new Error(updateError.message);
  } else {
    const { error: insertError } = await supabase
      .from("handover_protocols")
      .insert({
        lobby_id: lobbyId,
        target_email: cleanEmail,
        riot_otp: null,
        otp_requested_at: now.toISOString(),
        otp_expires_at: expiresAt.toISOString(),
        status: "pending",
      });

    if (insertError) throw new Error(insertError.message);
  }

  // Audit trail message (sanitization-safe)
  await supabase.from("lobby_messages").insert({
    lobby_id: lobbyId,
    sender_id: user.id,
    content: "[VaultRelay] Buyer requested Riot Email Change OTC. Seller has 15 minutes to relay the 6-digit code via the VaultRelay panel.",
  });

  revalidatePath(`/lobby/${lobbyId}`);
  return { success: true };
}

/**
 * Seller relays the 6-digit Riot OTP code.
 * Bypasses chat sanitization safely via isolated typed channel.
 */
export async function relayRiotEmailOtcAction(lobbyId: string, otpCode: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated.");
  }

  const { data: lobby } = await supabase
    .from("lobbies")
    .select("id, buyer_id, seller_id, status")
    .eq("id", lobbyId)
    .single();

  if (!lobby) {
    throw new Error("Lobby not found.");
  }

  if (lobby.seller_id !== user.id) {
    throw new Error("Only the seller can relay the Riot Email OTC.");
  }

  if (lobby.status !== "inspecting") {
    throw new Error("Lobby is not in inspecting status.");
  }

  const cleanOtp = otpCode.trim();
  if (!isValidRiotOtp(cleanOtp)) {
    throw new Error("Invalid OTC code. Must be exactly 6 numeric digits (e.g. 123456).");
  }

  const { data: protocol } = await supabase
    .from("handover_protocols")
    .select("*")
    .eq("lobby_id", lobbyId)
    .single();

  if (!protocol) {
    throw new Error("No active Riot OTC request found for this lobby.");
  }

  // Invariant 6: Strict 15-minute countdown check
  if (isOtpExpired(protocol.otp_expires_at)) {
    await checkOtcTimeoutAction(lobbyId);
    throw new Error("The 15-minute OTC window has expired. Lobby has been escalated to dispute.");
  }

  const { error: updateError } = await supabase
    .from("handover_protocols")
    .update({
      riot_otp: cleanOtp,
      status: "otp_relayed",
    })
    .eq("lobby_id", lobbyId);

  if (updateError) throw new Error(updateError.message);

  // System audit log
  await supabase.from("lobby_messages").insert({
    lobby_id: lobbyId,
    sender_id: user.id,
    content: "[VaultRelay] Seller relayed the 6-digit Riot OTC code. Buyer can now complete the email verification on account.riotgames.com.",
  });

  revalidatePath(`/lobby/${lobbyId}`);
  return { success: true };
}

/**
 * Confirms unlinking of a 3rd-party OAuth connection.
 */
export async function confirmOAuthUnlinkAction(
  lobbyId: string,
  service: OAuthService
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
    .select("id, buyer_id, seller_id, status")
    .eq("id", lobbyId)
    .single();

  if (!lobby) {
    throw new Error("Lobby not found.");
  }

  const isParticipant = lobby.seller_id === user.id || lobby.buyer_id === user.id;
  if (!isParticipant) {
    throw new Error("Only lobby participants can update OAuth unlinking.");
  }

  if (lobby.status !== "inspecting") {
    throw new Error("Handover checklist is only available during the inspection period.");
  }

  if (!["google", "xbox", "psn", "twitch"].includes(service)) {
    throw new Error("Invalid OAuth service specified.");
  }

  const { data: protocol } = await supabase
    .from("handover_protocols")
    .select("*")
    .eq("lobby_id", lobbyId)
    .single();

  if (!protocol) {
    throw new Error("No handover protocol initialized. Buyer must first initiate the request.");
  }

  const fieldKey = `${service}_unlinked` as const;
  const updatedChecklist = {
    google_unlinked: protocol.google_unlinked,
    xbox_unlinked: protocol.xbox_unlinked,
    psn_unlinked: protocol.psn_unlinked,
    twitch_unlinked: protocol.twitch_unlinked,
    [fieldKey]: true,
  };

  const allUnlinked = isOAuthChecklistComplete(updatedChecklist);
  const nextStatus = allUnlinked && protocol.status === "otp_relayed" ? "unlinked" : protocol.status;

  const { error } = await supabase
    .from("handover_protocols")
    .update({
      [fieldKey]: true,
      status: nextStatus,
    })
    .eq("lobby_id", lobbyId);

  if (error) throw new Error(error.message);

  revalidatePath(`/lobby/${lobbyId}`);
  return { success: true, allUnlinked };
}

/**
 * Checks if the 15-minute OTC timer has expired without seller submission.
 * If expired: auto-escalates to 'disputed' to freeze funds under Invariant 6 and starts 30m Evidence Clock.
 */
export async function checkOtcTimeoutAction(lobbyId: string) {
  const supabase = await createClient();

  const { data: protocol } = await supabase
    .from("handover_protocols")
    .select("*")
    .eq("lobby_id", lobbyId)
    .maybeSingle();

  if (!protocol || protocol.status !== "pending") {
    return { timedOut: false };
  }

  if (isOtpExpired(protocol.otp_expires_at) && !protocol.riot_otp) {
    const { data: lobby } = await supabase
      .from("lobbies")
      .select("id, status, buyer_id, seller_id")
      .eq("id", lobbyId)
      .single();

    if (lobby && lobby.status === "inspecting" && canTransitionLobby("inspecting", "disputed")) {
      const evidenceDeadline = new Date(Date.now() + 90 * 60 * 1000).toISOString();

      // 1. Escalate handover protocol
      await supabase
        .from("handover_protocols")
        .update({ status: "escalated_dispute" })
        .eq("lobby_id", lobbyId);

      // 2. Freeze funds & transition lobby to disputed
      await supabase
        .from("lobbies")
        .update({
          status: "disputed",
          evidence_deadline: evidenceDeadline,
        })
        .eq("id", lobbyId);

      // 3. Create dispute record
      await supabase.from("disputes").insert({
        lobby_id: lobbyId,
        raised_by: lobby.buyer_id,
        reason: "VaultRelay: Seller failed to relay Riot Email OTC within the mandatory 15-minute window. Funds frozen under Invariant 6.",
        resolution: "pending",
      });

      // 4. Post audit warning
      await supabase.from("lobby_messages").insert({
        lobby_id: lobbyId,
        sender_id: lobby.buyer_id,
        content: "[VaultRelay Alert] The 15-minute Riot Email OTC window has expired without seller response. Lobby auto-escalated to DISPUTED to freeze escrow funds. 90-minute Evidence Clock initiated (extended for load-shedding buffer).",
      });


      revalidatePath(`/lobby/${lobbyId}`);
      return { timedOut: true, escalated: true };
    }
  }

  return {
    timedOut: false,
    remainingSeconds: getRemainingOtpSeconds(protocol.otp_expires_at),
  };
}
