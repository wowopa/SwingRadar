import { beforeEach, describe, expect, it, vi } from "vitest";

const POSITIVE = "\uAE0D\uC815";
const CAUTION = "\uC8FC\uC758";
const IN_PROGRESS = "\uC9C4\uD589\uC911";

const mocks = vi.hoisted(() => ({
  getRecommendations: vi.fn(),
  getAnalysis: vi.fn(),
  getTracking: vi.fn(),
  getDailyCandidates: vi.fn(),
  listOpeningRecheckDecisions: vi.fn(),
  loadPortfolioProfileDocument: vi.fn(),
  loadPortfolioProfileForUser: vi.fn(),
  isPortfolioProfileConfigured: vi.fn()
}));

vi.mock("@/lib/providers", () => ({
  getDataProvider: () => ({
    getRecommendations: mocks.getRecommendations,
    getAnalysis: mocks.getAnalysis,
    getTracking: mocks.getTracking
  })
}));

vi.mock("@/lib/repositories/daily-candidates", () => ({
  getDailyCandidates: mocks.getDailyCandidates
}));

vi.mock("@/lib/server/opening-recheck-board", () => ({
  listOpeningRecheckDecisions: mocks.listOpeningRecheckDecisions
}));

vi.mock("@/lib/server/portfolio-profile", () => ({
  loadPortfolioProfileDocument: mocks.loadPortfolioProfileDocument,
  loadPortfolioProfileForUser: mocks.loadPortfolioProfileForUser,
  isPortfolioProfileConfigured: mocks.isPortfolioProfileConfigured
}));

import { listRecommendations } from "@/lib/services/recommendations-service";

function createRecommendation(overrides: Record<string, unknown>) {
  return {
    ticker: "AAA001",
    company: "Alpha",
    sector: "Tech",
    signalTone: POSITIVE,
    score: 70,
    signalLabel: "Base setup",
    rationale: "Base rationale",
    invalidation: "41,000 below",
    invalidationDistance: -4,
    riskRewardRatio: "1 : 2",
    validationSummary: "Measured validation",
    checkpoints: ["41,000 support", "44,000 confirm", "47,000 target"],
    validation: { hitRate: 55, avgReturn: 2, sampleSize: 11, maxDrawdown: -3 },
    observationWindow: "5~10 days",
    updatedAt: "2026-03-08 09:00",
    ...overrides
  };
}

function createCandidate(overrides: Record<string, unknown>) {
  return {
    batch: 1,
    ticker: "AAA001",
    company: "Alpha",
    sector: "Tech",
    signalTone: POSITIVE,
    score: 77,
    candidateScore: 97,
    activationScore: 73,
    currentPrice: 43_500,
    confirmationPrice: 44_000,
    expansionPrice: 47_000,
    invalidationPrice: 41_000,
    averageTurnover20: 1_500_000_000,
    liquidityRating: "good",
    invalidation: "41,000 below",
    validationSummary: "Measured validation",
    observationWindow: "5~10 days",
    rationale: "Candidate rationale",
    eventCoverage: "earnings due",
    ...overrides
  };
}

function createAnalysis(overrides: Record<string, unknown>) {
  return {
    ticker: "AAA001",
    company: "Alpha",
    signalTone: POSITIVE,
    score: 72,
    headline: "Alpha analysis",
    invalidation: "41,000 below",
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
    dataQuality: [],
    ...overrides
  };
}

function createEmptyProfile() {
  return {
    name: "Default profile",
    totalCapital: 0,
    availableCash: 0,
    maxRiskPerTradePercent: 0.8,
    maxConcurrentPositions: 4,
    sectorLimit: 2,
    positions: [],
    updatedAt: "1970-01-01T00:00:00.000Z",
    updatedBy: "system"
  };
}

describe("listRecommendations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAnalysis.mockResolvedValue({
      generatedAt: "2026-03-08T00:00:00.000Z",
      items: []
    });
    mocks.getTracking.mockResolvedValue({
      generatedAt: "2026-03-08T00:30:00.000Z",
      history: [],
      details: {}
    });
    mocks.getDailyCandidates.mockResolvedValue(null);
    mocks.listOpeningRecheckDecisions.mockResolvedValue({});
    mocks.loadPortfolioProfileDocument.mockResolvedValue(createEmptyProfile());
    mocks.loadPortfolioProfileForUser.mockResolvedValue(createEmptyProfile());
    mocks.isPortfolioProfileConfigured.mockReturnValue(false);
  });

  it("limits items to daily scan candidates and includes saved recheck state", async () => {
    mocks.getRecommendations.mockResolvedValue({
      generatedAt: "2026-03-08T00:00:00.000Z",
      items: [
        createRecommendation({ ticker: "AAA001", company: "Alpha", sector: "Tech", score: 90 }),
        createRecommendation({
          ticker: "BBB001",
          company: "Beta",
          sector: "Bio",
          score: 70,
          signalLabel: "Featured",
          rationale: "Beta setup",
          riskRewardRatio: "1 : 3"
        })
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
      topCandidates: [createCandidate({ ticker: "BBB001", company: "Beta", sector: "Bio" })],
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

    expect(result.items.map((item) => item.ticker)).toEqual(["BBB001"]);
    expect(result.dailyScan?.topCandidates[0]).toMatchObject({
      ticker: "BBB001",
      openingRecheck: {
        status: "passed",
        updatedBy: "admin-editor"
      }
    });
    expect(result.todayActionBoard?.summary.buyReviewCount).toBe(1);
    expect(result.todayActionBoard?.sections[0]?.items[0]).toMatchObject({
      ticker: "BBB001",
      boardStatus: "buy_review"
    });
  });

  it("filters by signal tone and limit when no daily scan exists", async () => {
    mocks.getRecommendations.mockResolvedValue({
      generatedAt: "2026-03-08T00:00:00.000Z",
      items: [
        createRecommendation({ ticker: "AAA001", company: "Alpha", sector: "Tech", signalTone: POSITIVE, score: 90 }),
        createRecommendation({
          ticker: "BBB001",
          company: "Beta",
          sector: "Bio",
          signalTone: CAUTION,
          score: 40,
          signalLabel: "Caution",
          checkpoints: ["25,000 support"],
          invalidation: "25,000 below",
          invalidationDistance: -1,
          riskRewardRatio: "1 : 1",
          validation: { hitRate: 30, avgReturn: -1, sampleSize: 10, maxDrawdown: -6 },
          updatedAt: "2026-03-07 09:00"
        })
      ]
    });

    const result = await listRecommendations({ signalTone: CAUTION, limit: 1, sort: "updatedAt_desc" });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.ticker).toBe("BBB001");
    expect(result.items[0]?.actionBucket).toBe("avoid");
    expect(result.todaySummary?.maxNewPositions).toBe(0);
  });

  it("downgrades passed candidates when the same sector is already full", async () => {
    mocks.getRecommendations.mockResolvedValue({
      generatedAt: "2026-03-08T00:00:00.000Z",
      items: [
        createRecommendation({ ticker: "005930", company: "Samsung Electronics", sector: "Semiconductor", score: 75 }),
        createRecommendation({ ticker: "000660", company: "SK Hynix", sector: "Semiconductor", score: 74 }),
        createRecommendation({
          ticker: "BBB001",
          company: "Beta",
          sector: "Semiconductor",
          score: 71,
          signalLabel: "Featured",
          rationale: "Beta setup",
          riskRewardRatio: "1 : 3"
        })
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
      topCandidates: [createCandidate({ ticker: "BBB001", company: "Beta", sector: "Semiconductor" })],
      batchSummaries: []
    });
    mocks.getTracking.mockResolvedValue({
      generatedAt: "2026-03-08T00:30:00.000Z",
      history: [
        {
          id: "h1",
          ticker: "005930",
          company: "Samsung Electronics",
          signalDate: "2026-03-07",
          signalTone: POSITIVE,
          entryScore: 80,
          result: IN_PROGRESS,
          mfe: 3,
          mae: -1,
          holdingDays: 5
        },
        {
          id: "h2",
          ticker: "000660",
          company: "SK Hynix",
          signalDate: "2026-03-07",
          signalTone: POSITIVE,
          entryScore: 78,
          result: IN_PROGRESS,
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
    expect(result.todayActionBoard?.summary.crowdedSectors).toEqual([{ sector: "Semiconductor", count: 2 }]);
    expect(result.todayActionBoard?.summary.buyReviewCount).toBe(0);
    expect(result.todayActionBoard?.sections[1]?.items[0]?.boardStatus).toBe("watch");
  });

  it("prefers a configured portfolio profile and builds holding management", async () => {
    mocks.getRecommendations.mockResolvedValue({
      generatedAt: "2026-03-08T00:00:00.000Z",
      items: [
        createRecommendation({ ticker: "005930", company: "Samsung Electronics", sector: "Semiconductor", score: 75 }),
        createRecommendation({ ticker: "000660", company: "SK Hynix", sector: "Semiconductor", score: 74 }),
        createRecommendation({
          ticker: "BBB001",
          company: "Beta",
          sector: "Semiconductor",
          score: 71,
          signalLabel: "Featured",
          rationale: "Beta setup",
          riskRewardRatio: "1 : 3"
        })
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
      topCandidates: [createCandidate({ ticker: "BBB001", company: "Beta", sector: "Semiconductor" })],
      batchSummaries: []
    });
    mocks.listOpeningRecheckDecisions.mockResolvedValue({
      BBB001: {
        status: "passed",
        updatedAt: "2026-03-08T01:05:00.000Z",
        updatedBy: "admin-editor"
      }
    });
    mocks.getAnalysis.mockResolvedValue({
      generatedAt: "2026-03-08T00:20:00.000Z",
      items: [
        createAnalysis({
          ticker: "267260",
          company: "HD Hyundai Electric",
          tradePlan: {
            currentPrice: 374_000,
            currentPriceLabel: "374,000 won",
            entryPriceLow: 360_000,
            entryPriceHigh: 365_000,
            confirmationPrice: 365_000,
            entryLabel: "360,000 ~ 365,000",
            stopPrice: 348_000,
            stopLabel: "348,000",
            targetPrice: 390_000,
            targetLabel: "390,000",
            stretchTargetPrice: 405_000,
            stretchTargetLabel: "405,000",
            holdWindowLabel: "5~10 days",
            riskRewardLabel: "1 : 1.5",
            nextStep: "hold"
          }
        })
      ]
    });
    mocks.loadPortfolioProfileDocument.mockResolvedValue({
      name: "Real money",
      totalCapital: 50_000_000,
      availableCash: 12_000_000,
      maxRiskPerTradePercent: 0.8,
      maxConcurrentPositions: 3,
      sectorLimit: 2,
      positions: [
        {
          ticker: "267260",
          company: "HD Hyundai Electric",
          sector: "Power Equipment",
          quantity: 12,
          averagePrice: 350_000,
          enteredAt: "2026-03-03"
        }
      ],
      updatedAt: "2026-03-08T00:45:00.000Z",
      updatedBy: "admin-dashboard"
    });
    mocks.isPortfolioProfileConfigured.mockReturnValue(true);

    const result = await listRecommendations({ sort: "score_desc" });

    expect(result.todayActionBoard?.summary.activeHoldingCount).toBe(1);
    expect(result.todayActionBoard?.summary.buyReviewCount).toBe(1);
    expect(result.todayActionBoard?.summary.portfolioProfileName).toBe("Real money");
    expect(result.todayActionBoard?.sections[0]?.items[0]?.tradePlan?.positionSizing).toMatchObject({
      suggestedQuantity: 133,
      suggestedCapital: 5_852_000,
      maxLossAmount: 399_000
    });
    expect(result.holdingActionBoard?.summary.holdingCount).toBe(1);
    expect(result.holdingActionBoard?.summary.tightenStopCount).toBe(1);
    expect(result.holdingActionBoard?.sections[2]?.items[0]).toMatchObject({
      ticker: "267260",
      actionStatus: "tighten_stop",
      holdingDays: 6
    });
  });

  it("loads a user-specific portfolio profile when a user id is provided", async () => {
    mocks.getRecommendations.mockResolvedValue({
      generatedAt: "2026-03-08T00:00:00.000Z",
      items: [createRecommendation({ ticker: "AAA001", company: "Alpha", sector: "Tech", score: 82 })]
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
      topCandidates: [createCandidate({ ticker: "AAA001", company: "Alpha", sector: "Tech" })],
      batchSummaries: []
    });
    mocks.listOpeningRecheckDecisions.mockResolvedValue({
      AAA001: {
        status: "passed",
        updatedAt: "2026-03-08T01:05:00.000Z",
        updatedBy: "user-1"
      }
    });
    mocks.loadPortfolioProfileForUser.mockResolvedValue({
      name: "User profile",
      totalCapital: 10_000_000,
      availableCash: 3_000_000,
      maxRiskPerTradePercent: 1,
      maxConcurrentPositions: 2,
      sectorLimit: 1,
      positions: [],
      updatedAt: "2026-03-08T00:45:00.000Z",
      updatedBy: "user-1@example.com"
    });
    mocks.isPortfolioProfileConfigured.mockReturnValue(true);

    const result = await listRecommendations({ sort: "score_desc" }, { userId: "user-1" });

    expect(mocks.loadPortfolioProfileForUser).toHaveBeenCalledWith("user-1");
    expect(result.todayActionBoard?.summary.portfolioProfileName).toBe("User profile");
    expect(result.todayActionBoard?.summary.availableCash).toBe(3_000_000);
  });
});
