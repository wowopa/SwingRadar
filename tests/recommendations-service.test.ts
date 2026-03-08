import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRecommendations: vi.fn(),
  getDailyCandidates: vi.fn()
}));

vi.mock("@/lib/providers", () => ({
  getDataProvider: () => ({
    getRecommendations: mocks.getRecommendations
  })
}));

vi.mock("@/lib/repositories/daily-candidates", () => ({
  getDailyCandidates: mocks.getDailyCandidates
}));

import { listRecommendations } from "@/lib/services/recommendations-service";

describe("listRecommendations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prioritizes daily scan candidates ahead of raw score order", async () => {
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
          rationale: "A",
          invalidation: "A",
          invalidationDistance: -5,
          riskRewardRatio: "1:2",
          validationSummary: "A",
          checkpoints: [],
          validation: { hitRate: 50, avgReturn: 1, sampleSize: 10, maxDrawdown: -2 },
          observationWindow: "5d",
          updatedAt: "2026-03-08 09:00"
        },
        {
          ticker: "BBB001",
          company: "Beta",
          sector: "Bio",
          signalTone: "긍정",
          score: 70,
          signalLabel: "Featured",
          rationale: "B",
          invalidation: "B",
          invalidationDistance: -4,
          riskRewardRatio: "1:3",
          validationSummary: "B",
          checkpoints: [],
          validation: { hitRate: 60, avgReturn: 2, sampleSize: 11, maxDrawdown: -3 },
          observationWindow: "5d",
          updatedAt: "2026-03-08 09:00"
        }
      ],
      dailyScan: null
    });

    mocks.getDailyCandidates.mockResolvedValue({
      generatedAt: "2026-03-08T01:00:00.000Z",
      batchSize: 20,
      totalTickers: 100,
      totalBatches: 5,
      succeededBatches: 5,
      failedBatches: [],
      topCandidates: [
        {
          ticker: "BBB001",
          company: "Beta",
          candidateScore: 97,
          eventCoverage: 4,
          batch: 2
        }
      ]
    });

    const result = await listRecommendations({ sort: "score_desc" });

    expect(result.items.map((item) => item.ticker)).toEqual(["BBB001", "AAA001"]);
    expect(result.items[0]).toMatchObject({ featuredRank: 1, candidateScore: 97, eventCoverage: 4, candidateBatch: 2 });
  });

  it("filters by signal tone and limit", async () => {
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
          rationale: "A",
          invalidation: "A",
          invalidationDistance: -5,
          riskRewardRatio: "1:2",
          validationSummary: "A",
          checkpoints: [],
          validation: { hitRate: 50, avgReturn: 1, sampleSize: 10, maxDrawdown: -2 },
          observationWindow: "5d",
          updatedAt: "2026-03-08 09:00"
        },
        {
          ticker: "BBB001",
          company: "Beta",
          sector: "Bio",
          signalTone: "주의",
          score: 40,
          signalLabel: "B",
          rationale: "B",
          invalidation: "B",
          invalidationDistance: -1,
          riskRewardRatio: "1:1",
          validationSummary: "B",
          checkpoints: [],
          validation: { hitRate: 30, avgReturn: -1, sampleSize: 10, maxDrawdown: -6 },
          observationWindow: "5d",
          updatedAt: "2026-03-07 09:00"
        }
      ],
      dailyScan: null
    });

    mocks.getDailyCandidates.mockResolvedValue(null);

    const result = await listRecommendations({ signalTone: "주의", limit: 1, sort: "updatedAt_desc" });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.ticker).toBe("BBB001");
  });
});