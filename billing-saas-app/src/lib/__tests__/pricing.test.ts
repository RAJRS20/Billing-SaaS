import test from "node:test";
import assert from "node:assert/strict";
import { calculatePricing, calculateOldGold, derivePurityRate } from "../pricing";

test("derivePurityRate calculates 22K rate correctly from 24K rate", () => {
  const rate24K = 6000;
  const fineness22K = 0.9166;
  const rate22K = derivePurityRate(rate24K, fineness22K);
  assert.equal(rate22K, 5499.6);
});

test("calculatePricing - normal 22K Gold Necklace billing with per gram making charge and GST", () => {
  const result = calculatePricing({
    grossWeight: 18.5,
    stoneWeight: 0.5,
    wastageType: "PERCENTAGE",
    wastageValue: 2, // 2% of net weight (18.0 * 0.02 = 0.36g)
    goldRatePerGram: 6000,
    makingChargeType: "PER_GRAM",
    makingChargeValue: 100, // 18.0 * 100 = 1800
    stoneChargeFixed: 500,
    discountType: "AMOUNT",
    discountValue: 1000,
    cgstPercent: 1.5,
    sgstPercent: 1.5,
    igstPercent: 0,
    roundToNearest: 1,
  });

  assert.equal(result.netGoldWeight, 18.0);
  assert.equal(result.wastageGrams, 0.36);
  assert.equal(result.chargeableWeight, 18.36);
  assert.equal(result.goldValue, 110160); // 18.36 * 6000
  assert.equal(result.makingCharge, 1800);
  assert.equal(result.stoneCharge, 500);
  assert.equal(result.grossAmount, 112460); // 110160 + 1800 + 500
  assert.equal(result.discountAmount, 1000);
  assert.equal(result.taxableAmount, 111460);
  assert.equal(result.cgstAmount, 1671.9); // 1.5% of 111460
  assert.equal(result.sgstAmount, 1671.9);
  assert.equal(result.totalTaxAmount, 3343.8);
  assert.equal(result.netAmount, 114803.8);
  assert.equal(result.roundedAmount, 114804); // Rounded to nearest 1
});

test("calculatePricing - wastage in fixed weight grams and percentage making charge", () => {
  const result = calculatePricing({
    grossWeight: 10,
    stoneWeight: 0,
    wastageType: "WEIGHT_GRAMS",
    wastageValue: 0.5,
    goldRatePerGram: 5000,
    makingChargeType: "PERCENTAGE",
    makingChargeValue: 10, // 10% of gold value
    stoneChargeFixed: 0,
    discountType: "PERCENTAGE",
    discountValue: 5,
    cgstPercent: 1.5,
    sgstPercent: 1.5,
    igstPercent: 0,
    roundToNearest: 1,
  });

  assert.equal(result.netGoldWeight, 10);
  assert.equal(result.wastageGrams, 0.5);
  assert.equal(result.chargeableWeight, 10.5);
  assert.equal(result.goldValue, 52500);
  assert.equal(result.makingCharge, 5250); // 10% of 52500
  assert.equal(result.grossAmount, 57750);
  assert.equal(result.discountAmount, 2887.5); // 5% of 57750
  assert.equal(result.taxableAmount, 54862.5);
});

test("calculateOldGold - valuation calculation", () => {
  const oldGold = calculateOldGold({
    grossWeight: 20,
    deductionGrams: 2, // net 18g
    purityPercent: 91.66, // 22K
    goldRatePerGram24K: 6500,
  });

  assert.equal(oldGold.netWeight, 18);
  assert.equal(oldGold.equivalentPureGold, 16.499);
  assert.equal(oldGold.valuationAmount, 107243.5);
});
