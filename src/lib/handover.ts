/**
 * VaultRelay Handover Protocol Types and Verification Helpers
 * 
 * Invariant 1: Buyer-only credential access.
 * Invariant 6: Strict 15-minute OTP countdown prevents stalling while protecting funds under the 30-minute Evidence Clock.
 */

export type HandoverStatus = "pending" | "otp_relayed" | "unlinked" | "escalated_dispute";

export type OAuthService = "google" | "xbox" | "psn" | "twitch";

export interface OAuthUnlinkStatus {
  google_unlinked: boolean;
  xbox_unlinked: boolean;
  psn_unlinked: boolean;
  twitch_unlinked: boolean;
}

export interface HandoverProtocol extends OAuthUnlinkStatus {
  id: string;
  lobby_id: string;
  target_email: string;
  riot_otp: string | null;
  otp_requested_at: string;
  otp_expires_at: string;
  status: HandoverStatus;
  created_at: string;
}

export const OTP_REGEX = /^[0-9]{6}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const DEFAULT_OTP_TIMEOUT_MINUTES = 15;

/**
 * Validates whether the provided string is a valid 6-digit numeric Riot OTP.
 */
export function isValidRiotOtp(code: unknown): boolean {
  if (typeof code !== "string") return false;
  return OTP_REGEX.test(code.trim());
}

/**
 * Validates a buyer's target email address.
 */
export function isValidTargetEmail(email: unknown): boolean {
  if (typeof email !== "string") return false;
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Calculates the expiration timestamp for an OTP request.
 */
export function calculateOtpExpiry(
  fromTime: Date = new Date(),
  durationMinutes: number = DEFAULT_OTP_TIMEOUT_MINUTES
): Date {
  return new Date(fromTime.getTime() + durationMinutes * 60 * 1000);
}

/**
 * Checks whether an OTP has expired against a reference time.
 */
export function isOtpExpired(
  expiresAt: string | Date,
  currentTime: Date = new Date()
): boolean {
  const exp = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  return currentTime.getTime() >= exp.getTime();
}

/**
 * Computes remaining seconds for an OTP countdown, clamped to 0.
 */
export function getRemainingOtpSeconds(
  expiresAt: string | Date,
  currentTime: Date = new Date()
): number {
  const exp = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  const diffMs = exp.getTime() - currentTime.getTime();
  return Math.max(0, Math.floor(diffMs / 1000));
}

/**
 * Verifies if all 4 OAuth services have been unlinked.
 */
export function isOAuthChecklistComplete(status: OAuthUnlinkStatus): boolean {
  return Boolean(
    status &&
    status.google_unlinked &&
    status.xbox_unlinked &&
    status.psn_unlinked &&
    status.twitch_unlinked
  );
}
