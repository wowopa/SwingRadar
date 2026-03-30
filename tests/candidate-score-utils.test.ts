/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
import { describe, expect, it } from "vitest";

import {
  buildSwingCandidateProfile,
  calculateCandidateScore,
  calculateSwingDurabilityAdjustment,
  getLiquidityAdjustment,
  getValidationAdjustment,
  getVolumeRatioAdjustment
} from "../scripts/lib/candidate-score-utils.mjs";

describe("candidate score utils", () => {
  it("keeps ranking scores in an interpretable range for stable swing candidates", () => {
    const score = calculateCandidateScore({
      score: 22.5,
      validation: {
        hitRate: 62,
        avgReturn: 6.1,
        sampleSize: 18
      },
      validationBasis: "실측 기반",
      averageTurnover20: 68_000_000_000,
      currentPrice: 187_900,
      confirmationPrice: 186_500,
      expansionPrice: 201_000,
      invalidationPrice: 177_500,
      invalidationDistance: -5.5,
      observationWindow: "5~15거래일",
      volumeRatio: 0.91,
      signalTone: "긍정"
    });

    expect(score).toBeGreaterThan(45);
    expect(score).toBeLessThanOrEqual(60);
  });

  it("heavily penalizes overheated late-breakout candidates", () => {
    const stableScore = calculateCandidateScore({
      score: 24,
      validation: {
        hitRate: 58,
        avgReturn: 4.2,
        sampleSize: 14
      },
      validationBasis: "공용 추적 참고",
      averageTurnover20: 42_000_000_000,
      currentPrice: 51_000,
      confirmationPrice: 50_500,
      expansionPrice: 55_000,
      invalidationPrice: 48_000,
      invalidationDistance: -5.9,
      observationWindow: "3~10거래일",
      volumeRatio: 1.4,
      signalTone: "긍정"
    });
    const overheatedScore = calculateCandidateScore({
      score: 24,
      validation: {
        hitRate: 58,
        avgReturn: 4.2,
        sampleSize: 14
      },
      validationBasis: "공용 추적 참고",
      averageTurnover20: 42_000_000_000,
      currentPrice: 57_000,
      confirmationPrice: 50_500,
      expansionPrice: 58_000,
      invalidationPrice: 49_000,
      invalidationDistance: -14,
      observationWindow: "1~7거래일",
      volumeRatio: 5.8,
      signalTone: "긍정"
    });

    expect(overheatedScore).toBeLessThan(stableScore - 10);
  });

  it("builds a swing profile that identifies late entries and wide stops", () => {
    const profile = buildSwingCandidateProfile({
      currentPrice: 57_000,
      confirmationPrice: 50_500,
      expansionPrice: 58_000,
      invalidationPrice: 49_000,
      invalidationDistance: -14,
      observationWindow: "1~7거래일"
    }) as {
      flags: {
        isLateBreakout: boolean;
        isWideStop: boolean;
        isShortWindow: boolean;
      };
    };

    expect(profile.flags.isLateBreakout).toBe(true);
    expect(profile.flags.isWideStop).toBe(true);
    expect(profile.flags.isShortWindow).toBe(true);
    expect(calculateSwingDurabilityAdjustment(profile)).toBeLessThan(0);
  });

  it("rewards stable liquidity and validation more than raw volume spikes", () => {
    expect(getLiquidityAdjustment(180_000_000_000)).toMatchObject({ score: 4, rating: "매우 높음" });
    expect(getValidationAdjustment({ hitRate: 55, avgReturn: 3, sampleSize: 12 }, "공용 추적 참고")).toBe(11.1);
    expect(getVolumeRatioAdjustment(1.4)).toBe(2);
    expect(getVolumeRatioAdjustment(5.8)).toBe(-4);
  });
});
