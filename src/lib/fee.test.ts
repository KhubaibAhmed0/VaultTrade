import { describe, it, expect } from "vitest";
import { calculatePlatformFee, MIN_DEAL_AMOUNT } from "./fee";

describe("Platform Fee Calculation", () => {
  it("enforces minimum deal amount of 500 PKR", () => {
    expect(MIN_DEAL_AMOUNT).toBe(500);
    expect(() => calculatePlatformFee(499)).toThrow("Minimum deal amount is 500 PKR");
  });

  it("calculates 200 PKR fee for deals under 30,000 PKR", () => {
    expect(calculatePlatformFee(500)).toBe(200);
    expect(calculatePlatformFee(15000)).toBe(200);
    expect(calculatePlatformFee(29999)).toBe(200);
  });

  it("calculates 500 PKR fee for deals 30,000 PKR or above", () => {
    expect(calculatePlatformFee(30000)).toBe(500);
    expect(calculatePlatformFee(50000)).toBe(500);
    expect(calculatePlatformFee(100000)).toBe(500);
  });
});
