import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRecommendations: vi.fn(),
  getDailyCandidates: vi.fn(),
  listOpeningRecheckDecisions: vi.fn()
}));

vi.mock("@/lib/providers", () => ({
  getDataProvider: () => ({
    getRecommendations: mocks.getRecommendations
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
});
