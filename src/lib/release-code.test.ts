import { describe, it, expect } from "vitest";
import {
  generateReleaseCode,
  hashReleaseCode,
  verifyReleaseCode,
  calculateRemainingAttempts,
  isVerificationLocked,
  calculateLockoutTime,
  calculateEvidenceDeadline,
} from "./release-code";

describe("release-code", () => {
  it("generates a 4-digit numeric string", () => {
    const code = generateReleaseCode();
    expect(code).toMatch(/^[0-9]{4}$/);
    expect(code.length).toBe(4);
  });

  it("hashes code and verifies valid match", async () => {
    const code = "7291";
    const hash = await hashReleaseCode(code);
    expect(hash).toBeDefined();
    expect(hash).not.toBe(code);

    const isValid = await verifyReleaseCode("7291", hash);
    expect(isValid).toBe(true);
  });

  it("rejects an invalid code match", async () => {
    const code = "7291";
    const hash = await hashReleaseCode(code);

    const isWrong = await verifyReleaseCode("9999", hash);
    expect(isWrong).toBe(false);
  });

  it("calculates rate limit attempts and freeze window", () => {
    expect(calculateRemainingAttempts(0, 5)).toBe(5);
    expect(calculateRemainingAttempts(3, 5)).toBe(2);
    expect(calculateRemainingAttempts(5, 5)).toBe(0);

    const past = new Date(Date.now() - 1000).toISOString();
    expect(isVerificationLocked(past)).toBe(false);

    const future = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    expect(isVerificationLocked(future)).toBe(true);

    const lockout = calculateLockoutTime(15);
    expect(new Date(lockout).getTime()).toBeGreaterThan(Date.now() + 14 * 60 * 1000);

    const evidence = calculateEvidenceDeadline(90);
    expect(new Date(evidence).getTime()).toBeGreaterThan(Date.now() + 89 * 60 * 1000);
  });
});

