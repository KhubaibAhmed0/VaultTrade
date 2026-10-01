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
