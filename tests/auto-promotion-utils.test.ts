/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { describe, expect, it } from "vitest";

import {
  buildPromotionMetrics,
  evaluateAutoPromotionCandidate,
  getAutoPromotionPolicy
} from "../scripts/lib/auto-promotion-utils.mjs";

describe("auto promotion policy", () => {
  it("uses tight swing defaults for one-month review", () => {
    const policy = getAutoPromotionPolicy({});

    expect(policy).toMatchObject({
      enabled: false,
      lookbackRuns: 30,
      minHistoryRuns: 20,
      minAppearances: 5,
      minConsecutiveAppearances: 2,
      maxAverageRank: 18,
      minBestRank: 10,
      minAverageCandidateScore: 28,
      minCurrentCandidateScore: 30,
      minAverageTurnover20: 30_000_000_000,
      minCurrentPrice: 5000,
      minAverageVolumeRatio: 1.05,
      minCurrentVolumeRatio: 1.2,
      maxPromotionsPerRun: 1
    });
  });

  it("qualifies only stable upper-ranked swing candidates", () => {
    const runs = [
      {
        generatedAt: "2026-03-10T00:00:00.000Z",
        topCandidates: [
          { ticker: "005930", candidateScore: 33.4, averageTurnover20: 42_000_000_000, volumeRatio: 1.35, currentPrice: 172200, signalTone: "긍정" }
        ]
      },
      {
        generatedAt: "2026-03-09T00:00:00.000Z",
        topCandidates: [
          { ticker: "005930", candidateScore: 32.8, averageTurnover20: 39_000_000_000, volumeRatio: 1.21, currentPrice: 170100, signalTone: "긍정" }
        ]
      },
      {
        generatedAt: "2026-03-08T00:00:00.000Z",
        topCandidates: [
          { ticker: "005930", candidateScore: 31.7, averageTurnover20: 34_000_000_000, volumeRatio: 1.12, currentPrice: 168900, signalTone: "중립" }
        ]
      },
      {
        generatedAt: "2026-03-07T00:00:00.000Z",
        topCandidates: [
          { ticker: "005930", candidateScore: 30.8, averageTurnover20: 33_000_000_000, volumeRatio: 1.08, currentPrice: 166500, signalTone: "중립" }
        ]
      },
      {
        generatedAt: "2026-03-06T00:00:00.000Z",
        topCandidates: [
          { ticker: "005930", candidateScore: 30.1, averageTurnover20: 31_000_000_000, volumeRatio: 1.05, currentPrice: 165300, signalTone: "중립" }
        ]
      }
    ];

    const metrics = buildPromotionMetrics(runs, "005930");
    const policy = getAutoPromotionPolicy({
      SWING_RADAR_AUTO_PROMOTION_MIN_HISTORY_RUNS: "5"
    });

    const evaluation = evaluateAutoPromotionCandidate(
      {
        ticker: "005930",
        signalTone: "긍정",
        candidateScore: 33.4,
        averageTurnover20: 42_000_000_000,
        currentPrice: 172200,
        volumeRatio: 1.35
      },
      metrics,
      policy
    );

    expect(metrics).toMatchObject({
      appearanceCount: 5,
      consecutiveRecentAppearances: 5,
      bestRank: 1
    });
    expect(evaluation).toMatchObject({ qualifies: true, reasons: [] });
  });

  it("rejects weak or overheated candidates", () => {
    const runs = [
      {
        generatedAt: "2026-03-10T00:00:00.000Z",
        topCandidates: [
          { ticker: "014530", candidateScore: 29.5, averageTurnover20: 12_000_000_000, volumeRatio: 3.8, currentPrice: 4200, signalTone: "주의" }
        ]
      },
      {
        generatedAt: "2026-03-09T00:00:00.000Z",
        topCandidates: []
      }
    ];

    const metrics = buildPromotionMetrics(runs, "014530");
    const policy = getAutoPromotionPolicy({
      SWING_RADAR_AUTO_PROMOTION_MIN_HISTORY_RUNS: "2",
      SWING_RADAR_AUTO_PROMOTION_MIN_APPEARANCES: "1",
      SWING_RADAR_AUTO_PROMOTION_MIN_CONSECUTIVE_APPEARANCES: "1"
    });

    const evaluation = evaluateAutoPromotionCandidate(
      {
        ticker: "014530",
        signalTone: "주의",
        candidateScore: 29.5,
        averageTurnover20: 12_000_000_000,
        currentPrice: 4200,
        volumeRatio: 3.8
      },
      metrics,
      policy
    );

    expect(evaluation.qualifies).toBe(false);
    expect(evaluation.reasons).toEqual(
      expect.arrayContaining([
        expect.stringContaining("허용 범위"),
        expect.stringContaining("거래대금"),
        expect.stringContaining("최소 가격")
      ])
    );
  });
});
