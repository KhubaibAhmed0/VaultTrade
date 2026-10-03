import bcrypt from "bcryptjs";
import { randomInt } from "crypto";

/**
 * Generates a cryptographically secure random 4-digit numeric code (1000 - 9999).
 */
export function generateReleaseCode(): string {
  const code = randomInt(1000, 10000);
  return code.toString();
}

/**
 * Hashes a 4-digit code using bcrypt with 10 salt rounds.
 */
export async function hashReleaseCode(code: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(code, salt);
}

/**
 * Verifies a candidate code against the stored hash.
 */
export async function verifyReleaseCode(code: string, hash: string): Promise<boolean> {
  if (!code || !hash) return false;
  return bcrypt.compare(code, hash);
}

/**
 * Calculates remaining attempts before lockout.
 */
export function calculateRemainingAttempts(currentAttempts: number, maxAttempts: number = 5): number {
  return Math.max(0, maxAttempts - currentAttempts);
}

/**
 * Checks if code verification is currently frozen/locked out.
 */
export function isVerificationLocked(lockoutUntil: string | null | undefined): boolean {
  if (!lockoutUntil) return false;
  return new Date(lockoutUntil).getTime() > Date.now();
}

/**
 * Calculates lockout expiration timestamp (default: 15 minutes).
 */
export function calculateLockoutTime(durationMinutes: number = 15): string {
  return new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
}

/**
 * Calculates dispute evidence deadline (default: 90 minutes for Pakistani load-shedding buffer).
 */
export function calculateEvidenceDeadline(durationMinutes: number = 90): string {
  return new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
}

