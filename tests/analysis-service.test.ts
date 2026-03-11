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
            sma20: 50000,
            sma60: 47000,
            ema20: 49800,
            rsi14: 58.2,
            macd: 120.4,
            macdSignal: 98.1,
            macdHistogram: 22.3,
            bollingerUpper: 54000,
            bollingerMiddle: 50000,
            bollingerLower: 46000,
            volumeRatio20: 1.12
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
  });

  it("uses today's candidate timestamp and score when available", async () => {
    mocks.getAnalysis.mockResolvedValue({
      generatedAt: "2026-03-09T08:00:00.000Z",
      items: [
        {
          ticker: "263750",
          company: "?꾩뼱鍮꾩뒪",
          signalTone: "以묐┰",
          score: 61.5,
          headline: "existing",
          invalidation: "49,203???꾨옒濡??대젮媛硫??ㅼ떆 遊낅땲??",
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
            volumeRatio20: null
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
          company: "?꾩뼱鍮꾩뒪",
          sector: "寃뚯엫",
          signalTone: "以묐┰",
          score: 69.1,
          candidateScore: 119.9,
          invalidation: "49,203???꾨옒濡??대젮媛硫??대쾲 ?먮쫫? ?ㅼ떆 遊먯빞 ?⑸땲??",
          validationSummary: "寃利??쒕낯???꾩쭅 ?곸뼱 李멸퀬?⑹엯?덈떎.",
          observationWindow: "3~10嫄곕옒??",
          rationale: "理쒓렐 寃뚯엫 ?좎옉 ?댁뒋瑜??④퍡 蹂닿퀬 ?덉뒿?덈떎.",
          eventCoverage: "?쒗븳??"
        }
      ]
    });

    const result = await resolveTickerAnalysis("263750");

    expect(result?.generatedAt).toBe("2026-03-09T09:10:00.000Z");
    expect(result?.item.score).toBe(69.1);
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
          signalLabel: "조금 더 확인해볼 만함",
          rationale: "가격 흐름과 거래 흐름이 함께 살아나는지 보고 있습니다.",
          invalidation: "49,203원 아래로 내려가면 이번 흐름은 다시 봐야 합니다.",
          invalidationDistance: -4.5,
          riskRewardRatio: "1 : 1.5",
          validationSummary: "비슷한 흐름 20건 기준 성공률 56%입니다.",
          checkpoints: ["49,203원 근처를 지키는지 보기", "53,000원을 넘는지 보기", "57,500원까지 힘이 이어지는지 보기"],
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
          invalidation: "49,203원 아래로 내려가면 이번 흐름은 다시 봐야 합니다.",
          validationSummary: "검증 표본이 아직 적어 참고용입니다.",
          observationWindow: "3~10거래일",
          rationale: "최근 게임 신작 이슈를 함께 보고 있습니다.",
          eventCoverage: "제한적"
        }
      ]
    });

    const result = await resolveTickerAnalysis("263750");

    expect(result?.generatedAt).toBe("2026-03-09T09:10:00.000Z");
    expect(result?.item.ticker).toBe("263750");
    expect(result?.item.headline).toContain("조금 더 확인해볼 만함");
    expect(result?.item.keyLevels[0]?.price).toBe("49,203원");
    expect(result?.item.technicalIndicators.rsi14).toBeNull();
    expect(result?.item.chartSeries).toEqual([]);
    expect(result?.item.dataQuality[0]?.note).toContain("분석 상세가 아직 없어서");
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
          signalLabel: "조금 더 확인해볼 만함",
          rationale: "가격 흐름과 거래 흐름이 함께 살아나는지 보고 있습니다.",
          invalidation: "49,203원 아래로 내려가면 이번 흐름은 다시 봐야 합니다.",
          invalidationDistance: -4.5,
          riskRewardRatio: "1 : 1.5",
          validationSummary: "비슷한 흐름 20건 기준 성공률 56%입니다.",
          checkpoints: ["49,203원 근처를 지키는지 보기", "53,000원을 넘는지 보기", "57,500원까지 힘이 이어지는지 보기"],
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
            volumeRatio20: null
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
