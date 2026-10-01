export const MIN_DEAL_AMOUNT = 500;
export const FEE_TIER_THRESHOLD = 30000;
export const FEE_LOW_TIER = 200;
export const FEE_HIGH_TIER = 500;

/**
 * Calculates VaultTrade platform fee in PKR.
 * - Minimum deal: 500 PKR
 * - Deals < 30,000 PKR: 200 PKR
 * - Deals >= 30,000 PKR: 500 PKR
 */
export function calculatePlatformFee(dealAmount: number): number {
  if (dealAmount < MIN_DEAL_AMOUNT) {
    throw new Error(`Minimum deal amount is ${MIN_DEAL_AMOUNT} PKR`);
  }

  if (dealAmount < FEE_TIER_THRESHOLD) {
    return FEE_LOW_TIER;
  }

  return FEE_HIGH_TIER;
}
