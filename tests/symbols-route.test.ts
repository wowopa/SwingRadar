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
import { resetSymbolMetaCacheForTests } from "@/lib/server/symbol-meta-cache";

describe("symbols route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSymbolMetaCacheForTests();
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
    expect(mocks.getAnalysis).toHaveBeenCalledTimes(1);
    expect(mocks.getRecommendations).toHaveBeenCalledTimes(1);
    expect(mocks.getDailyCandidates).toHaveBeenCalledTimes(1);
  });

  it("uses live candidate priority for default featured results", async () => {
    mocks.getAnalysis.mockResolvedValue({
      generatedAt: "2026-03-09T09:00:00.000Z",
      items: [
        {
          ticker: "005930",
          company: "Samsung Electronics",
          signalTone: "중립",
          score: 60,
          headline: "headline",
          invalidation: "60,000원 아래",
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
      items: [
        {
          ticker: "000660"
        }
      ],
      dailyScan: null
    });
    mocks.getDailyCandidates.mockResolvedValue({
      generatedAt: "2026-03-09T09:00:00.000Z",
      topCandidates: [
        {
          ticker: "068270"
        }
      ]
    });

    const response = await getSymbolsRoute(new Request("http://localhost/api/symbols?limit=3"));
    const payload = JSON.parse(await response.text()) as {
      items: Array<{ ticker: string }>;
      mode: "search" | "featured";
      description: string;
      limit: number;
    };

    expect(response.status).toBe(200);
    expect(payload.mode).toBe("featured");
    expect(payload.limit).toBe(3);
    expect(payload.description).toContain("오늘 후보");
    expect(payload.items.map((item) => item.ticker)).toEqual(["000660", "068270", "005930"]);
  });

  it("reuses cached symbol metadata across nearby requests", async () => {
    mocks.getAnalysis.mockResolvedValue({
      generatedAt: "2026-03-09T09:00:00.000Z",
      items: []
    });
    mocks.getRecommendations.mockResolvedValue({
      generatedAt: "2026-03-09T09:00:00.000Z",
      items: [],
      dailyScan: null
    });
    mocks.getDailyCandidates.mockResolvedValue(null);

    await getSymbolsRoute(new Request("http://localhost/api/symbols?q=000660&limit=5"));
    await getSymbolsRoute(new Request("http://localhost/api/symbols?q=005930&limit=5"));

    expect(mocks.getAnalysis).toHaveBeenCalledTimes(1);
    expect(mocks.getRecommendations).toHaveBeenCalledTimes(1);
    expect(mocks.getDailyCandidates).toHaveBeenCalledTimes(1);
  });
});
