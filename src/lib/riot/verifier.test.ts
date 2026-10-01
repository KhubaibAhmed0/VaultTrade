import { describe, it, expect } from "vitest";
import {
  validateRiotId,
  isValidRiotId,
  normalizeRiotId,
  isApShard,
  canonicalizeJson,
  computeSnapshotHash,
  verifyRiotAccountMock,
} from "./verifier";

describe("Feature 1: Pre-Escrow Riot Shard & Asset Lock Verifier", () => {
  describe("Riot ID Validation", () => {
    it("accepts valid Riot IDs formatted as GameName#Tag", () => {
      expect(isValidRiotId("Reyna#KUR")).toBe(true);
      expect(isValidRiotId("TenZ#NA1")).toBe(true);
      expect(isValidRiotId("ScreaM#EDit")).toBe(true);
      expect(isValidRiotId("Hamza Gamer#PK1")).toBe(true);
      expect(isValidRiotId("Player_1.V2#9999")).toBe(true);
    });

    it("rejects invalid Riot IDs with clear reasons", () => {
      expect(validateRiotId("").valid).toBe(false);
      expect(validateRiotId("ReynaNoTag").valid).toBe(false);
      expect(validateRiotId("Reyna#").valid).toBe(false);
      expect(validateRiotId("#KUR").valid).toBe(false);
      expect(validateRiotId("A#1").valid).toBe(false); // Too short name & tag
      expect(validateRiotId("Reyna#TooLongTagline").valid).toBe(false);
      expect(validateRiotId("Reyna#KUR#EXTRA").valid).toBe(false);
    });
  });

  describe("Riot ID Normalization", () => {
    it("normalizes case and trims whitespace", () => {
      expect(normalizeRiotId("  Reyna#KUR  ")).toBe("reyna#kur");
      expect(normalizeRiotId("TenZ#NA1")).toBe("tenz#na1");
      expect(normalizeRiotId("ScreaM#EDit")).toBe("scream#edit");
      expect(normalizeRiotId("HAMZA#PK1")).toBe("hamza#pk1");
    });
  });

  describe("AP Shard Compatibility Detection", () => {
    it("identifies Asia-Pacific, Mumbai, and Bahrain shards as AP compatible", () => {
      expect(isApShard("ap")).toBe(true);
      expect(isApShard("AP")).toBe(true);
      expect(isApShard("mumbai")).toBe(true);
      expect(isApShard("bahrain")).toBe(true);
      expect(isApShard("apac")).toBe(true);
      expect(isApShard("ap-southeast")).toBe(true);
    });

    it("rejects Non-AP shards (NA, EU, KR, LATAM, BR)", () => {
      expect(isApShard("na")).toBe(false);
      expect(isApShard("eu")).toBe(false);
      expect(isApShard("kr")).toBe(false);
      expect(isApShard("latam")).toBe(false);
      expect(isApShard("br")).toBe(false);
    });
  });

  describe("RFC 8785 Canonical JSON & SHA-256 Snapshot Hash", () => {
    it("canonicalizes JSON keys in deterministic lexicographical order", () => {
      const objA = { z: 1, a: 2, m: 3 };
      const objB = { a: 2, m: 3, z: 1 };
      expect(canonicalizeJson(objA)).toBe('{"a":2,"m":3,"z":1}');
      expect(canonicalizeJson(objB)).toBe('{"a":2,"m":3,"z":1}');
      expect(canonicalizeJson(objA)).toBe(canonicalizeJson(objB));
    });

    it("computes identical SHA-256 hash regardless of object key insertion order", () => {
      const payload1 = {
        puuid: "puuid-12345",
        account_rank: "Diamond 3",
        account_level: 142,
        account_region: "ap",
        is_ap_shard: true,
        riot_id_normalized: "reyna#kur",
      };

      const payload2 = {
        riot_id_normalized: "reyna#kur",
        is_ap_shard: true,
        account_region: "ap",
        account_level: 142,
        account_rank: "Diamond 3",
        puuid: "puuid-12345",
      };

      const hash1 = computeSnapshotHash(payload1);
      const hash2 = computeSnapshotHash(payload2);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    it("produces a different hash when account attributes change", () => {
      const payloadBase = {
        puuid: "puuid-12345",
        account_rank: "Diamond 3",
        account_level: 142,
        account_region: "ap",
        is_ap_shard: true,
        riot_id_normalized: "reyna#kur",
      };

      const payloadTampered = {
        ...payloadBase,
        account_rank: "Gold 1", // Rank dropped
      };

      expect(computeSnapshotHash(payloadBase)).not.toBe(computeSnapshotHash(payloadTampered));
    });
  });

  describe("Deterministic Mock Verifier", () => {
    it("returns identical passport data for the same Riot ID across queries", () => {
      const passport1 = verifyRiotAccountMock("Reyna#KUR");
      const passport2 = verifyRiotAccountMock("Reyna#KUR");

      expect(passport1.puuid).toBe(passport2.puuid);
      expect(passport1.snapshotHash).toBe(passport2.snapshotHash);
      expect(passport1.accountRank).toBe(passport2.accountRank);
      expect(passport1.accountLevel).toBe(passport2.accountLevel);
      expect(passport1.isApShard).toBe(true);
      expect(passport1.accountRegion).toBe("ap");
    });

    it("flags non-AP accounts with isApShard: false and displays warning shard", () => {
      const naPassport = verifyRiotAccountMock("TenZ#NA1");
      expect(naPassport.isApShard).toBe(false);
      expect(naPassport.accountRegion).toBe("na");

      const euPassport = verifyRiotAccountMock("ScreaM#EUW");
      expect(euPassport.isApShard).toBe(false);
      expect(euPassport.accountRegion).toBe("eu");
    });

    it("generates distinct PUUIDs for different Riot accounts", () => {
      const p1 = verifyRiotAccountMock("Reyna#KUR");
      const p2 = verifyRiotAccountMock("TenZ#NA1");
      expect(p1.puuid).not.toBe(p2.puuid);
      expect(p1.snapshotHash).not.toBe(p2.snapshotHash);
    });
  });
});
