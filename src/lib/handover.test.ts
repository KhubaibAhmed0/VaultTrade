import { describe, it, expect } from "vitest";
import {
  isValidRiotOtp,
  isValidTargetEmail,
  calculateOtpExpiry,
  isOtpExpired,
  getRemainingOtpSeconds,
  isOAuthChecklistComplete,
} from "./handover";

describe("VaultRelay Handover Validation & Helpers", () => {
  describe("6-Digit Riot OTP Validation", () => {
    it("accepts valid 6-digit numeric codes", () => {
      expect(isValidRiotOtp("123456")).toBe(true);
      expect(isValidRiotOtp("000000")).toBe(true);
      expect(isValidRiotOtp("999999")).toBe(true);
      expect(isValidRiotOtp("048291")).toBe(true);
    });

    it("trims whitespace before validating", () => {
      expect(isValidRiotOtp("  654321  ")).toBe(true);
    });

    it("rejects codes with fewer than 6 digits", () => {
      expect(isValidRiotOtp("12345")).toBe(false);
      expect(isValidRiotOtp("1")).toBe(false);
      expect(isValidRiotOtp("")).toBe(false);
    });

    it("rejects codes with more than 6 digits", () => {
      expect(isValidRiotOtp("1234567")).toBe(false);
      expect(isValidRiotOtp("123456789")).toBe(false);
    });

    it("rejects codes containing alphabets or special characters", () => {
      expect(isValidRiotOtp("12345a")).toBe(false);
      expect(isValidRiotOtp("abcdef")).toBe(false);
      expect(isValidRiotOtp("12-345")).toBe(false);
      expect(isValidRiotOtp("12 345")).toBe(false);
    });

    it("handles non-string types safely", () => {
      expect(isValidRiotOtp(null)).toBe(false);
      expect(isValidRiotOtp(undefined)).toBe(false);
      expect(isValidRiotOtp(123456)).toBe(false);
    });
  });

  describe("Target Email Validation", () => {
    it("accepts valid email formats", () => {
      expect(isValidTargetEmail("buyer@example.com")).toBe(true);
      expect(isValidTargetEmail("gamer_pro@gmail.com")).toBe(true);
      expect(isValidTargetEmail("user.name+val@domain.co.pk")).toBe(true);
    });

    it("rejects invalid emails", () => {
      expect(isValidTargetEmail("not-an-email")).toBe(false);
      expect(isValidTargetEmail("@missinguser.com")).toBe(false);
      expect(isValidTargetEmail("missingdomain@")).toBe(false);
      expect(isValidTargetEmail("")).toBe(false);
      expect(isValidTargetEmail(null)).toBe(false);
    });
  });

  describe("15-Minute Timeout Calculation", () => {
    it("calculates expiry timestamp exactly 15 minutes in the future", () => {
      const fixedBaseTime = new Date("2026-10-01T12:00:00.000Z");
      const expiry = calculateOtpExpiry(fixedBaseTime, 15);
      
      const diffMs = expiry.getTime() - fixedBaseTime.getTime();
      expect(diffMs).toBe(15 * 60 * 1000);
      expect(expiry.toISOString()).toBe("2026-10-01T12:15:00.000Z");
    });

    it("detects expired vs active countdowns correctly", () => {
      const expiry = new Date("2026-10-01T12:15:00.000Z");

      // Before expiry
      const before = new Date("2026-10-01T12:14:59.000Z");
      expect(isOtpExpired(expiry, before)).toBe(false);

      // At expiry
      expect(isOtpExpired(expiry, expiry)).toBe(true);

      // Past expiry
      const after = new Date("2026-10-01T12:15:01.000Z");
      expect(isOtpExpired(expiry, after)).toBe(true);
    });

    it("calculates remaining seconds accurately and clamps to 0", () => {
      const expiry = new Date("2026-10-01T12:15:00.000Z");

      // 5 minutes remaining
      const fiveMinBefore = new Date("2026-10-01T12:10:00.000Z");
      expect(getRemainingOtpSeconds(expiry, fiveMinBefore)).toBe(300);

      // 10 seconds remaining
      const tenSecBefore = new Date("2026-10-01T12:14:50.000Z");
      expect(getRemainingOtpSeconds(expiry, tenSecBefore)).toBe(10);

      // Expired by 2 minutes
      const twoMinAfter = new Date("2026-10-01T12:17:00.000Z");
      expect(getRemainingOtpSeconds(expiry, twoMinAfter)).toBe(0);
    });
  });

  describe("4-Point OAuth Checklist Completeness", () => {
    it("returns true only when all 4 providers are unlinked", () => {
      expect(
        isOAuthChecklistComplete({
          google_unlinked: true,
          xbox_unlinked: true,
          psn_unlinked: true,
          twitch_unlinked: true,
        })
      ).toBe(true);
    });

    it("returns false if any single provider is still linked", () => {
      expect(
        isOAuthChecklistComplete({
          google_unlinked: false,
          xbox_unlinked: true,
          psn_unlinked: true,
          twitch_unlinked: true,
        })
      ).toBe(false);

      expect(
        isOAuthChecklistComplete({
          google_unlinked: true,
          xbox_unlinked: false,
          psn_unlinked: true,
          twitch_unlinked: true,
        })
      ).toBe(false);

      expect(
        isOAuthChecklistComplete({
          google_unlinked: true,
          xbox_unlinked: true,
          psn_unlinked: false,
          twitch_unlinked: true,
        })
      ).toBe(false);

      expect(
        isOAuthChecklistComplete({
          google_unlinked: true,
          xbox_unlinked: true,
          psn_unlinked: true,
          twitch_unlinked: false,
        })
      ).toBe(false);
    });

    it("returns false if all providers are unlinked = false", () => {
      expect(
        isOAuthChecklistComplete({
          google_unlinked: false,
          xbox_unlinked: false,
          psn_unlinked: false,
          twitch_unlinked: false,
        })
      ).toBe(false);
    });
  });
});
