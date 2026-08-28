/**
 * Gold Jewellery Pricing Engine
 * ─────────────────────────────
 * All business calculations live here.
 * This module has ZERO UI dependencies and can be unit tested independently.
 */

export type MakingChargeType = "PER_GRAM" | "PERCENTAGE" | "FIXED";
export type WastageType = "WEIGHT_GRAMS" | "PERCENTAGE";

export interface ProductPricingInput {
  // Weights (grams)
  grossWeight: number;
  stoneWeight: number;

  // Wastage config
  wastageType: WastageType;
  wastageValue: number; // either grams or %

  // Gold rate (per gram for the selected purity)
  goldRatePerGram: number;

  // Making charge config
  makingChargeType: MakingChargeType;
  makingChargeValue: number;

  // Stone charges
  stoneChargeFixed: number; // flat stone/diamond charge

  // Discount
  discountType: "AMOUNT" | "PERCENTAGE";
  discountValue: number;

  // Tax
  cgstPercent: number; // default 1.5 for jewellery
  sgstPercent: number; // default 1.5 for jewellery
  igstPercent: number; // inter-state: 3%

  // Rounding
  roundToNearest: number; // e.g. 0 = no rounding, 1 = round to rupee, 10 = round to ten
}

export interface PricingBreakdown {
  // Weights
  grossWeight: number;
  stoneWeight: number;
  netGoldWeight: number; // grossWeight - stoneWeight
  wastageGrams: number;
  chargeableWeight: number; // netGoldWeight + wastageGrams

  // Values
  goldValue: number; // chargeableWeight × goldRatePerGram
  wastageValue: number; // wastageGrams × goldRatePerGram
  makingCharge: number;
  stoneCharge: number;

  // Sub-totals
  grossAmount: number; // goldValue + makingCharge + stoneCharge
  discountAmount: number;
  taxableAmount: number; // grossAmount - discountAmount

  // Tax
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTaxAmount: number;

  // Final
  netAmount: number; // taxableAmount + totalTaxAmount (before rounding)
  roundedAmount: number; // after rounding
  roundingDifference: number;
}

/**
 * Round a number to a given precision (decimal places).
 * Uses "round half away from zero" — consistent for currency.
 */
export function roundTo(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Round to nearest specified step (e.g. nearest 1 = rupee, nearest 10).
 */
function roundToNearest(value: number, step: number): number {
  if (step === 0) return roundTo(value, 2);
  return Math.round(value / step) * step;
}

/**
 * Core pricing calculation.
 * All monetary values in INR.
 */
export function calculatePricing(input: ProductPricingInput): PricingBreakdown {
  const {
    grossWeight,
    stoneWeight,
    wastageType,
    wastageValue,
    goldRatePerGram,
    makingChargeType,
    makingChargeValue,
    stoneChargeFixed,
    discountType,
    discountValue,
    cgstPercent,
    sgstPercent,
    igstPercent,
    roundToNearest: rounding,
  } = input;

  // 1. Net gold weight
  const netGoldWeight = roundTo(grossWeight - stoneWeight, 3);

  // 2. Wastage
  let wastageGrams: number;
  if (wastageType === "WEIGHT_GRAMS") {
    wastageGrams = roundTo(wastageValue, 3);
  } else {
    // PERCENTAGE of net gold weight
    wastageGrams = roundTo((netGoldWeight * wastageValue) / 100, 3);
  }

  const chargeableWeight = roundTo(netGoldWeight + wastageGrams, 3);

  // 3. Gold value
  const goldValue = roundTo(chargeableWeight * goldRatePerGram, 2);
  const wastageValue_ = roundTo(wastageGrams * goldRatePerGram, 2);

  // 4. Making charges
  let makingCharge: number;
  switch (makingChargeType) {
    case "PER_GRAM":
      makingCharge = roundTo(netGoldWeight * makingChargeValue, 2);
      break;
    case "PERCENTAGE":
      makingCharge = roundTo((goldValue * makingChargeValue) / 100, 2);
      break;
    case "FIXED":
    default:
      makingCharge = roundTo(makingChargeValue, 2);
      break;
  }

  // 5. Stone charges
  const stoneCharge = roundTo(stoneChargeFixed, 2);

  // 6. Gross amount
  const grossAmount = roundTo(goldValue + makingCharge + stoneCharge, 2);

  // 7. Discount
  let discountAmount: number;
  if (discountType === "PERCENTAGE") {
    discountAmount = roundTo((grossAmount * discountValue) / 100, 2);
  } else {
    discountAmount = roundTo(discountValue, 2);
  }
  // Discount cannot exceed gross amount
  discountAmount = Math.min(discountAmount, grossAmount);

  // 8. Taxable amount
  const taxableAmount = roundTo(grossAmount - discountAmount, 2);

  // 9. Tax
  const cgstAmount = roundTo((taxableAmount * cgstPercent) / 100, 2);
  const sgstAmount = roundTo((taxableAmount * sgstPercent) / 100, 2);
  const igstAmount = roundTo((taxableAmount * igstPercent) / 100, 2);
  const totalTaxAmount = roundTo(cgstAmount + sgstAmount + igstAmount, 2);

  // 10. Net amount
  const netAmount = roundTo(taxableAmount + totalTaxAmount, 2);

  // 11. Rounding
  const roundedAmount = roundToNearest(netAmount, rounding);
  const roundingDifference = roundTo(roundedAmount - netAmount, 2);

  return {
    grossWeight,
    stoneWeight,
    netGoldWeight,
    wastageGrams,
    chargeableWeight,
    goldValue,
    wastageValue: wastageValue_,
    makingCharge,
    stoneCharge,
    grossAmount,
    discountAmount,
    taxableAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalTaxAmount,
    netAmount,
    roundedAmount,
    roundingDifference,
  };
}

/**
 * Calculate old-gold valuation.
 */
export interface OldGoldInput {
  grossWeight: number;
  deductionGrams: number; // stones / impurities
  purityPercent: number; // e.g. 91.66 for 22K
  goldRatePerGram24K: number; // 24K rate
}

export interface OldGoldValuation {
  netWeight: number;
  equivalentPureGold: number;
  valuationAmount: number;
}

export function calculateOldGold(input: OldGoldInput): OldGoldValuation {
  const { grossWeight, deductionGrams, purityPercent, goldRatePerGram24K } = input;
  const netWeight = roundTo(grossWeight - deductionGrams, 3);
  const equivalentPureGold = roundTo((netWeight * purityPercent) / 100, 3);
  const valuationAmount = roundTo(equivalentPureGold * goldRatePerGram24K, 2);
  return { netWeight, equivalentPureGold, valuationAmount };
}

/**
 * Utility: Calculate effective gold rate for a given purity fineness.
 * e.g. 24K rate = 6000, 22K fineness = 0.9166 → 22K rate = 6000 * 0.9166 = 5499.6
 */
export function derivePurityRate(rate24K: number, fineness: number): number {
  return roundTo(rate24K * fineness, 2);
}
