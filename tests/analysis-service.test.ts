import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAnalysis: vi.fn(),
  getRecommendations: vi.fn(),
  getDailyCandidates: vi.fn()
}));

vi.mock("@/lib/providers", () => ({
  getDataProvider: () => ({
    getAnalysis: mocks.getAnalysis,
    getRecommendations: mocks.getRecommendations
  })
}));

vi.mock("@/lib/repositories/daily-candidates", () => ({
  getDailyCandidates: mocks.getDailyCandidates
}));

import { getTickerAnalysis } from "@/lib/services/analysis-service";
import { resolveTickerAnalysis } from "@/lib/services/analysis-resolver";

describe("analysis resolver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the stored analysis item when available", async () => {
    mocks.getAnalysis.mockResolvedValue({
      generatedAt: "2026-03-09T08:00:00.000Z",
      items: [
        {
          ticker: "263750",
          company: "펄어비스",
          signalTone: "중립",
          score: 69.1,
          headline: "existing",
          invalidation: "49,203원 아래로 내려가면 다시 봅니다.",
          analysisSummary: [],
          keyLevels: [],
          technicalIndicators: {
            sma20: 50_000,
            sma60: 47_000,
            ema20: 49_800,
            rsi14: 58.2,
            macd: 120.4,
            macdSignal: 98.1,
            macdHistogram: 22.3,
            bollingerUpper: 54_000,
            bollingerMiddle: 50_000,
            bollingerLower: 46_000,
            volumeRatio20: 1.12,
            atr14: null,
            natr14: null,
            adx14: null,
            plusDi14: null,
            minusDi14: null,
            stochasticK: null,
            stochasticD: null,
            mfi14: null,
            roc20: null,
            cci20: null,
            cmf20: null,
            marketRelativeStrength20: null,
            marketRelativeSpread20: null
          },
          chartSeries: [],
          decisionNotes: [],
          scoreBreakdown: [],
          scenarios: [],
          riskChecklist: [],
          newsImpact: [{ headline: "n1", impact: "중립", summary: "s", source: "naver", url: "", date: "2026-03-09", eventType: "news" }],
          dataQuality: [{ label: "품질", value: "양호", note: "ok" }]
        }
      ]
    });
    mocks.getRecommendations.mockResolvedValue({
      generatedAt: "2026-03-09T08:00:00.000Z",
      items: [],
      dailyScan: null
    });
    mocks.getDailyCandidates.mockResolvedValue(null);

    const result = await getTickerAnalysis("263750", {});

    expect(result.headline).toBe("existing");
    expect(result.newsImpact).toHaveLength(1);
    expect(result.tradePlan?.bucket).toBe("watch_only");
  });

  it("uses today's candidate timestamp and score when available", async () => {
    mocks.getAnalysis.mockResolvedValue({
      generatedAt: "2026-03-09T08:00:00.000Z",
      items: [
        {
          ticker: "263750",
          company: "펄어비스",
          signalTone: "중립",
          score: 61.5,
          headline: "existing",
          invalidation: "49,203원 아래로 내려가면 다시 봅니다.",
          analysisSummary: [],
          keyLevels: [],
          technicalIndicators: {
            sma20: null,
            sma60: null,
            ema20: null,
            rsi14: null,
            macd: null,
            macdSignal: null,
            macdHistogram: null,
            bollingerUpper: null,
            bollingerMiddle: null,
            bollingerLower: null,
            volumeRatio20: null,
            atr14: null,
            natr14: null,
            adx14: null,
            plusDi14: null,
            minusDi14: null,
            stochasticK: null,
            stochasticD: null,
            mfi14: null,
            roc20: null,
            cci20: null,
            cmf20: null,
            marketRelativeStrength20: null,
            marketRelativeSpread20: null
          },
          chartSeries: [],
          decisionNotes: [],
          scoreBreakdown: [],
          scenarios: [],
          riskChecklist: [],
          newsImpact: [],
          dataQuality: []
        }
      ]
    });
    mocks.getRecommendations.mockResolvedValue({
      generatedAt: "2026-03-09T08:00:00.000Z",
      items: [],
      dailyScan: null
    });
    mocks.getDailyCandidates.mockResolvedValue({
      generatedAt: "2026-03-09T09:10:00.000Z",
      batchSize: 20,
      totalTickers: 30,
      totalBatches: 2,
      succeededBatches: 2,
      failedBatches: [],
      topCandidates: [
        {
          batch: 1,
          ticker: "263750",
          company: "펄어비스",
          sector: "게임",
          signalTone: "중립",
          score: 69.1,
          candidateScore: 119.9,
          activationScore: 57,
          invalidation: "49,203원 아래로 내려가면 다시 봅니다.",
          validationSummary: "검증 표본은 아직 참고 수준입니다.",
          observationWindow: "3~10거래일",
          rationale: "최근 게임 신작 이슈를 함께 보고 있습니다.",
          eventCoverage: "제한적"
        }
      ]
    });

    const result = await resolveTickerAnalysis("263750");

    expect(result?.generatedAt).toBe("2026-03-09T09:10:00.000Z");
    expect(result?.item.score).toBe(69.1);
    expect(result?.item.tradePlan?.bucket).toBe("watch_only");
  });

  it("builds a fallback analysis item from recommendations when analysis snapshot is missing", async () => {
    mocks.getAnalysis.mockResolvedValue({
      generatedAt: "2026-03-09T08:00:00.000Z",
      items: []
    });
    mocks.getRecommendations.mockResolvedValue({
      generatedAt: "2026-03-09T09:00:00.000Z",
      items: [
        {
          ticker: "263750",
          company: "펄어비스",
          sector: "게임",
          signalTone: "중립",
          score: 69.1,
          signalLabel: "조금 더 확인이 필요함",
          rationale: "가격 흐름과 거래 흐름이 이어지는지 보고 있습니다.",
          invalidation: "49,203원 아래로 내려가면 이번 흐름은 다시 봐야 합니다.",
          invalidationDistance: -4.5,
          riskRewardRatio: "1 : 1.5",
          validationSummary: "비슷한 흐름 20건 기준 성공률은 56%입니다.",
          checkpoints: ["49,203원 지지 확인", "53,000원 돌파 확인", "57,500원 목표 확인"],
          validation: {
            hitRate: 56,
            avgReturn: 4.2,
            sampleSize: 20,
            maxDrawdown: -5.1
          },
          observationWindow: "3~10거래일",
          updatedAt: "2026-03-09 09:00"
        }
      ],
      dailyScan: null
    });
    mocks.getDailyCandidates.mockResolvedValue({
      generatedAt: "2026-03-09T09:10:00.000Z",
      batchSize: 20,
      totalTickers: 30,
      totalBatches: 2,
      succeededBatches: 2,
      failedBatches: [],
      topCandidates: [
        {
          batch: 1,
          ticker: "263750",
          company: "펄어비스",
          sector: "게임",
          signalTone: "중립",
          score: 69.1,
          candidateScore: 119.9,
          activationScore: 58,
          invalidation: "49,203원 아래로 내려가면 이번 흐름은 다시 봐야 합니다.",
          validationSummary: "검증 표본은 아직 참고 수준입니다.",
          observationWindow: "3~10거래일",
          rationale: "최근 게임 신작 이슈를 함께 보고 있습니다.",
          eventCoverage: "제한적"
        }
      ]
    });

    const result = await resolveTickerAnalysis("263750");

    expect(result?.generatedAt).toBe("2026-03-09T09:10:00.000Z");
    expect(result?.item.ticker).toBe("263750");
    expect(result?.item.headline).toContain("조금 더 확인이 필요함");
    expect(result?.item.keyLevels[0]?.price).toBe("49,203원");
    expect(result?.item.technicalIndicators.rsi14).toBeNull();
    expect(result?.item.chartSeries).toEqual([]);
    expect(result?.item.dataQuality[0]?.note).toContain("추천 데이터 기반");
    expect(result?.item.tradePlan?.bucket).toBe("watch_only");
  });

  it("applies query flags to synthesized analysis payloads", async () => {
    mocks.getAnalysis.mockResolvedValue({
      generatedAt: "2026-03-09T08:00:00.000Z",
      items: []
    });
    mocks.getRecommendations.mockResolvedValue({
      generatedAt: "2026-03-09T09:00:00.000Z",
      items: [
        {
          ticker: "263750",
          company: "펄어비스",
          sector: "게임",
          signalTone: "중립",
          score: 69.1,
          signalLabel: "조금 더 확인이 필요함",
          rationale: "가격 흐름과 거래 흐름이 이어지는지 보고 있습니다.",
          invalidation: "49,203원 아래로 내려가면 이번 흐름은 다시 봐야 합니다.",
          invalidationDistance: -4.5,
          riskRewardRatio: "1 : 1.5",
          validationSummary: "비슷한 흐름 20건 기준 성공률은 56%입니다.",
          checkpoints: ["49,203원 지지 확인", "53,000원 돌파 확인", "57,500원 목표 확인"],
          validation: {
            hitRate: 56,
            avgReturn: 4.2,
            sampleSize: 20,
            maxDrawdown: -5.1
          },
          observationWindow: "3~10거래일",
          updatedAt: "2026-03-09 09:00"
        }
      ],
      dailyScan: null
    });
    mocks.getDailyCandidates.mockResolvedValue(null);

    const result = await getTickerAnalysis("263750", {
      includeNews: "false",
      includeQuality: "false"
    });

    expect(result.newsImpact).toEqual([]);
    expect(result.dataQuality).toEqual([]);
    expect(result.tradePlan?.bucket).toBe("watch_only");
  });

  it("resolves legacy tickers to the current analysis symbol", async () => {
    mocks.getAnalysis.mockResolvedValue({
      generatedAt: "2026-03-09T08:00:00.000Z",
      items: [
        {
          ticker: "068270",
          company: "셀트리온",
          signalTone: "중립",
          score: 61.5,
          headline: "resolved",
          invalidation: "100,000원 아래",
          analysisSummary: [],
          keyLevels: [],
          technicalIndicators: {
            sma20: null,
            sma60: null,
            ema20: null,
            rsi14: null,
            macd: null,
            macdSignal: null,
            macdHistogram: null,
            bollingerUpper: null,
            bollingerMiddle: null,
            bollingerLower: null,
            volumeRatio20: null,
            atr14: null,
            natr14: null,
            adx14: null,
            plusDi14: null,
            minusDi14: null,
            stochasticK: null,
            stochasticD: null,
            mfi14: null,
            roc20: null,
            cci20: null,
            cmf20: null,
            marketRelativeStrength20: null,
            marketRelativeSpread20: null
          },
          chartSeries: [],
          decisionNotes: [],
          scoreBreakdown: [],
          scenarios: [],
          riskChecklist: [],
          newsImpact: [],
          dataQuality: []
        }
      ]
    });
    mocks.getRecommendations.mockResolvedValue({
      generatedAt: "2026-03-09T08:00:00.000Z",
      items: [],
      dailyScan: null
    });
    mocks.getDailyCandidates.mockResolvedValue(null);

    const result = await getTickerAnalysis("091990", {});

    expect(result.ticker).toBe("068270");
    expect(result.headline).toBe("resolved");
  });
});
