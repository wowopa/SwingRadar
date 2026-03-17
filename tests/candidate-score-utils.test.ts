/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
import { describe, expect, it } from "vitest";

import {
  calculateCandidateScore,
  getLiquidityAdjustment,
  getValidationAdjustment,
  getVolumeRatioAdjustment
} from "../scripts/lib/candidate-score-utils.mjs";

describe("candidate score utils", () => {
  it("keeps ranking scores in an interpretable range for strong candidates", () => {
    const score = calculateCandidateScore({
      score: 22.5,
      validation: {
        hitRate: 62,
        avgReturn: 6.1,
        sampleSize: 18
      },
      validationBasis: "실측 기반",
      eventCoverage: "보강됨",
      averageTurnover20: 68_000_000_000,
      currentPrice: 187900,
      volumeRatio: 0.91,
      signalTone: "긍정"
    });

    expect(score).toBe(47.1);
  });

  it("penalizes overheated or low-quality candidates without collapsing the score", () => {
    const score = calculateCandidateScore({
      score: 18.1,
      validation: {
        hitRate: 38,
        avgReturn: -2,
        sampleSize: 1
      },
      validationBasis: "보수 계산",
      eventCoverage: "취약",
      averageTurnover20: 4_000_000_000,
      currentPrice: 1800,
      volumeRatio: 5.8,
      signalTone: "주의"
    });

    expect(score).toBe(0);
  });

  it("rewards stable liquidity and validation more than raw volume spikes", () => {
    expect(getLiquidityAdjustment(180_000_000_000)).toMatchObject({ score: 4, rating: "매우 풍부" });
    expect(getValidationAdjustment({ hitRate: 55, avgReturn: 3, sampleSize: 12 }, "공용 추적 참고")).toBe(11.1);
    expect(getVolumeRatioAdjustment(1.4)).toBe(2);
    expect(getVolumeRatioAdjustment(4.6)).toBe(-2);
  });
});
