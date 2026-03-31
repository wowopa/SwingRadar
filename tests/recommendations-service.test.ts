import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRecommendations: vi.fn(),
  getTracking: vi.fn(),
  getDailyCandidates: vi.fn(),
  listOpeningRecheckDecisions: vi.fn()
}));

vi.mock("@/lib/providers", () => ({
  getDataProvider: () => ({
    getRecommendations: mocks.getRecommendations,
    getTracking: mocks.getTracking
  })
}));

vi.mock("@/lib/repositories/daily-candidates", () => ({
  getDailyCandidates: mocks.getDailyCandidates
}));

vi.mock("@/lib/server/opening-recheck-board", () => ({
  listOpeningRecheckDecisions: mocks.listOpeningRecheckDecisions
}));

import { listRecommendations } from "@/lib/services/recommendations-service";

describe("listRecommendations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listOpeningRecheckDecisions.mockResolvedValue({});
    mocks.getTracking.mockResolvedValue({
      generatedAt: "2026-03-08T00:30:00.000Z",
      history: [],
      details: {}
    });
  });

  it("limits recommendation items to daily scan candidates and includes saved recheck status", async () => {
    mocks.getRecommendations.mockResolvedValue({
      generatedAt: "2026-03-08T00:00:00.000Z",
      items: [
        {
          ticker: "AAA001",
          company: "Alpha",
          sector: "Tech",
          signalTone: "긍정",
          score: 90,
          signalLabel: "High score",
          rationale: "Alpha setup",
          invalidation: "80,000원 이탈",
          invalidationDistance: -5,
          riskRewardRatio: "1 : 2",
          validationSummary: "Alpha validation",
          checkpoints: ["80,000원 지지", "92,000원 돌파", "98,000원 확인"],
          validation: { hitRate: 50, avgReturn: 1, sampleSize: 10, maxDrawdown: -2 },
          observationWindow: "5~10거래일",
          updatedAt: "2026-03-08 09:00"
        },
        {
          ticker: "BBB001",
          company: "Beta",
          sector: "Bio",
          signalTone: "긍정",
          score: 70,
          signalLabel: "Featured",
          rationale: "Beta setup",
          invalidation: "41,000원 이탈",
          invalidationDistance: -4,
          riskRewardRatio: "1 : 3",
          validationSummary: "Beta validation",
          checkpoints: ["41,000원 지지", "44,000원 돌파", "47,000원 확인"],
          validation: { hitRate: 60, avgReturn: 2, sampleSize: 11, maxDrawdown: -3 },
          observationWindow: "5~10거래일",
          updatedAt: "2026-03-08 09:00"
        }
      ]
    });

    mocks.getDailyCandidates.mockResolvedValue({
      generatedAt: "2026-03-08T01:00:00.000Z",
      batchSize: 20,
      concurrency: 2,
      topCandidatesLimit: 10,
      totalTickers: 100,
      totalBatches: 5,
      succeededBatches: 5,
      failedBatches: [],
      topCandidates: [
        {
          batch: 2,
          ticker: "BBB001",
          company: "Beta",
          sector: "Bio",
          signalTone: "긍정",
          score: 77,
          candidateScore: 97,
          activationScore: 73,
          currentPrice: 43_500,
          confirmationPrice: 44_000,
          expansionPrice: 47_000,
          invalidationPrice: 41_000,
          averageTurnover20: 1_500_000_000,
          liquidityRating: "양호",
          invalidation: "41,000원 이탈",
          validationSummary: "Beta validation",
          observationWindow: "5~10거래일",
          rationale: "Beta setup",
          eventCoverage: "보강 중"
        }
      ],
      batchSummaries: []
    });
    mocks.listOpeningRecheckDecisions.mockResolvedValue({
      BBB001: {
        status: "passed",
        updatedAt: "2026-03-08T01:05:00.000Z",
        updatedBy: "admin-editor"
      }
    });

    const result = await listRecommendations({ sort: "score_desc" });

    expect(mocks.listOpeningRecheckDecisions).toHaveBeenCalledWith("2026-03-08T01:00:00.000Z");
    expect(result.items.map((item) => item.ticker)).toEqual(["BBB001"]);
    expect(result.generatedAt).toBe("2026-03-08T01:00:00.000Z");
    expect(result.items[0]).toMatchObject({
      ticker: "BBB001",
      score: 77,
      featuredRank: 1,
      candidateScore: 97,
      eventCoverage: "보강 중",
      candidateBatch: 2,
      actionBucket: "buy_now"
    });
    expect(result.items[0]?.tradePlan?.entryLabel).toContain("43,500원");
    expect(result.dailyScan?.topCandidates[0]).toMatchObject({
      ticker: "BBB001",
      actionBucket: "buy_now",
      openingRecheck: {
        status: "passed",
        updatedAt: "2026-03-08T01:05:00.000Z",
        updatedBy: "admin-editor"
      }
    });
    expect(result.dailyScan?.topCandidates[0]?.tradePlan?.entryLabel).toContain("43,500원");
    expect(result.dailyScan?.topCandidates[0]?.tradePlan?.stopLabel).toBe("41,000원");
    expect(result.todaySummary?.bucketCounts.buy_now).toBe(1);
    expect(result.operatingWorkflow?.steps).toHaveLength(3);
    expect(result.operatingWorkflow?.steps[0]?.title).toBe("장전 후보");
    expect(result.operatingWorkflow?.openingChecklist[1]?.title).toContain("손절");
    expect(result.todayActionBoard?.summary.buyReviewCount).toBe(1);
    expect(result.todayActionBoard?.summary.remainingNewPositions).toBe(0);
    expect(result.todayActionBoard?.summary.activeHoldingCount).toBe(0);
    expect(result.todayActionBoard?.summary.remainingPortfolioSlots).toBe(4);
    expect(result.todayActionBoard?.sections[0]).toMatchObject({
      status: "buy_review",
      count: 1
    });
    expect(result.todayActionBoard?.sections[0]?.items[0]).toMatchObject({
      ticker: "BBB001",
      boardStatus: "buy_review"
    });
  });

  it("filters by signal tone and limit when no daily scan exists", async () => {
    mocks.getRecommendations.mockResolvedValue({
      generatedAt: "2026-03-08T00:00:00.000Z",
      items: [
        {
          ticker: "AAA001",
          company: "Alpha",
          sector: "Tech",
          signalTone: "긍정",
          score: 90,
          signalLabel: "A",
          rationale: "Alpha setup",
          invalidation: "80,000원 이탈",
          invalidationDistance: -5,
          riskRewardRatio: "1 : 2",
          validationSummary: "Alpha validation",
          checkpoints: ["80,000원 지지", "92,000원 돌파", "98,000원 확인"],
          validation: { hitRate: 50, avgReturn: 1, sampleSize: 10, maxDrawdown: -2 },
          observationWindow: "5~10거래일",
          updatedAt: "2026-03-08 09:00"
        },
        {
          ticker: "BBB001",
          company: "Beta",
          sector: "Bio",
          signalTone: "주의",
          score: 40,
          signalLabel: "B",
          rationale: "Beta setup",
          invalidation: "25,000원 이탈",
          invalidationDistance: -1,
          riskRewardRatio: "1 : 1",
          validationSummary: "Beta validation",
          checkpoints: ["25,000원 지지"],
          validation: { hitRate: 30, avgReturn: -1, sampleSize: 10, maxDrawdown: -6 },
          observationWindow: "5~10거래일",
          updatedAt: "2026-03-07 09:00"
        }
      ]
    });

    mocks.getDailyCandidates.mockResolvedValue(null);

    const result = await listRecommendations({ signalTone: "주의", limit: 1, sort: "updatedAt_desc" });

    expect(mocks.listOpeningRecheckDecisions).not.toHaveBeenCalled();
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.ticker).toBe("BBB001");
    expect(result.items[0]?.actionBucket).toBe("avoid");
    expect(result.todaySummary?.maxNewPositions).toBe(0);
  });

  it("downgrades passed candidates when the same sector is already full", async () => {
    mocks.getRecommendations.mockResolvedValue({
      generatedAt: "2026-03-08T00:00:00.000Z",
      items: [
        {
          ticker: "005930",
          company: "삼성전자",
          sector: "반도체",
          signalTone: "긍정",
          score: 75,
          signalLabel: "Held alpha",
          rationale: "Held alpha setup",
          invalidation: "70,000원 이탈",
          invalidationDistance: -4,
          riskRewardRatio: "1 : 2",
          validationSummary: "Held alpha validation",
          checkpoints: ["70,000원 지지", "73,000원 회복", "76,000원 확인"],
          validation: { hitRate: 55, avgReturn: 2, sampleSize: 12, maxDrawdown: -3 },
          observationWindow: "5~10거래일",
          updatedAt: "2026-03-08 09:00"
        },
        {
          ticker: "000660",
          company: "SK하이닉스",
          sector: "반도체",
          signalTone: "긍정",
          score: 74,
          signalLabel: "Held beta",
          rationale: "Held beta setup",
          invalidation: "180,000원 이탈",
          invalidationDistance: -4,
          riskRewardRatio: "1 : 2",
          validationSummary: "Held beta validation",
          checkpoints: ["180,000원 지지", "188,000원 회복", "194,000원 확인"],
          validation: { hitRate: 54, avgReturn: 2, sampleSize: 10, maxDrawdown: -3 },
          observationWindow: "5~10거래일",
          updatedAt: "2026-03-08 09:00"
        },
        {
          ticker: "BBB001",
          company: "Beta",
          sector: "반도체",
          signalTone: "긍정",
          score: 71,
          signalLabel: "Featured",
          rationale: "Beta setup",
          invalidation: "41,000원 이탈",
          invalidationDistance: -4,
          riskRewardRatio: "1 : 3",
          validationSummary: "Beta validation",
          checkpoints: ["41,000원 지지", "44,000원 돌파", "47,000원 확인"],
          validation: { hitRate: 60, avgReturn: 2, sampleSize: 11, maxDrawdown: -3 },
          observationWindow: "5~10거래일",
          updatedAt: "2026-03-08 09:00"
        }
      ]
    });
    mocks.getDailyCandidates.mockResolvedValue({
      generatedAt: "2026-03-08T01:00:00.000Z",
      batchSize: 20,
      concurrency: 2,
      topCandidatesLimit: 10,
      totalTickers: 100,
      totalBatches: 5,
      succeededBatches: 5,
      failedBatches: [],
      topCandidates: [
        {
          batch: 1,
          ticker: "BBB001",
          company: "Beta",
          sector: "반도체",
          signalTone: "긍정",
          score: 77,
          candidateScore: 97,
          activationScore: 73,
          currentPrice: 43_500,
          confirmationPrice: 44_000,
          expansionPrice: 47_000,
          invalidationPrice: 41_000,
          averageTurnover20: 1_500_000_000,
          liquidityRating: "양호",
          invalidation: "41,000원 이탈",
          validationSummary: "Beta validation",
          observationWindow: "5~10거래일",
          rationale: "Beta setup",
          eventCoverage: "보강 중"
        }
      ],
      batchSummaries: []
    });
    mocks.getTracking.mockResolvedValue({
      generatedAt: "2026-03-08T00:30:00.000Z",
      history: [
        {
          id: "h1",
          ticker: "005930",
          company: "삼성전자",
          signalDate: "2026-03-07",
          signalTone: "긍정",
          entryScore: 80,
          result: "진행중",
          mfe: 3,
          mae: -1,
          holdingDays: 5
        },
        {
          id: "h2",
          ticker: "000660",
          company: "SK하이닉스",
          signalDate: "2026-03-07",
          signalTone: "긍정",
          entryScore: 78,
          result: "진행중",
          mfe: 2,
          mae: -1,
          holdingDays: 4
        }
      ],
      details: {}
    });
    mocks.listOpeningRecheckDecisions.mockResolvedValue({
      BBB001: {
        status: "passed",
        updatedAt: "2026-03-08T01:05:00.000Z",
        updatedBy: "admin-editor"
      }
    });

    const result = await listRecommendations({ sort: "score_desc" });

    expect(result.todayActionBoard?.summary.activeHoldingCount).toBe(2);
    expect(result.todayActionBoard?.summary.crowdedSectors).toEqual([{ sector: "반도체", count: 2 }]);
    expect(result.todayActionBoard?.summary.buyReviewCount).toBe(0);
    expect(result.todayActionBoard?.sections[1]).toMatchObject({
      status: "watch",
      count: 1
    });
    expect(result.todayActionBoard?.sections[1]?.items[0]).toMatchObject({
      ticker: "BBB001",
      boardStatus: "watch",
      portfolioNote: "섹터 한도 2개"
    });
    expect(result.todayActionBoard?.sections[1]?.items[0]?.boardReason).toContain("섹터 한도");
  });
});
