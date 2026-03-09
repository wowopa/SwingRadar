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

import { GET as getSymbolsRoute } from "@/app/api/symbols/route";

describe("symbols route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks symbols as ready when live analysis exists", async () => {
    mocks.getAnalysis.mockResolvedValue({
      generatedAt: "2026-03-09T09:00:00.000Z",
      items: [
        {
          ticker: "000660",
          company: "SK hynix",
          signalTone: "중립",
          score: 61.2,
          headline: "headline",
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
      generatedAt: "2026-03-09T09:00:00.000Z",
      items: [],
      dailyScan: null
    });
    mocks.getDailyCandidates.mockResolvedValue(null);

    const response = await getSymbolsRoute(new Request("http://localhost/api/symbols?q=000660&limit=5"));
    const payload = JSON.parse(await response.text()) as {
      items: Array<{ ticker: string; status: "ready" | "pending" }>;
    };

    expect(response.status).toBe(200);
    expect(payload.items[0]?.ticker).toBe("000660");
    expect(payload.items[0]?.status).toBe("ready");
  });
});
