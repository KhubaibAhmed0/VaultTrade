import { describe, it, expect } from "vitest";
import { generateReleaseCode, hashReleaseCode, verifyReleaseCode } from "./release-code";

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
});
