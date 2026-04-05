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
  listUserOpeningRecheckDecisions: vi.fn(),
  listUserOpeningRecheckScans: vi.fn(),
  listOpeningRecheckScans: vi.fn(),
  loadPortfolioCloseReviewsForUser: vi.fn(),
  loadPortfolioJournalForUser: vi.fn(),
  loadPortfolioPersonalRulesForUser: vi.fn(),
  loadPortfolioProfileDocument: vi.fn(),
  loadPortfolioProfileForUser: vi.fn(),
  isPortfolioProfileConfigured: vi.fn(),
  buildTodayCommunityStats: vi.fn(),
  getKrxMarketSessionStatus: vi.fn()
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
  listOpeningRecheckDecisions: mocks.listOpeningRecheckDecisions,
  listOpeningRecheckScans: mocks.listOpeningRecheckScans
}));

vi.mock("@/lib/server/user-opening-recheck-board", () => ({
  listUserOpeningRecheckDecisions: mocks.listUserOpeningRecheckDecisions,
  listUserOpeningRecheckScans: mocks.listUserOpeningRecheckScans
}));

vi.mock("@/lib/server/portfolio-close-reviews", () => ({
  loadPortfolioCloseReviewsForUser: mocks.loadPortfolioCloseReviewsForUser
}));

vi.mock("@/lib/server/portfolio-journal", () => ({
  loadPortfolioJournalForUser: mocks.loadPortfolioJournalForUser
}));

vi.mock("@/lib/server/portfolio-personal-rules", () => ({
  loadPortfolioPersonalRulesForUser: mocks.loadPortfolioPersonalRulesForUser
}));

vi.mock("@/lib/server/portfolio-profile", () => ({
  loadPortfolioProfileDocument: mocks.loadPortfolioProfileDocument,
  loadPortfolioProfileForUser: mocks.loadPortfolioProfileForUser,
  isPortfolioProfileConfigured: mocks.isPortfolioProfileConfigured
}));

vi.mock("@/lib/server/today-community-stats", () => ({
  buildTodayCommunityStats: mocks.buildTodayCommunityStats
}));

vi.mock("@/lib/server/krx-market-calendar", () => ({
  getKrxMarketSessionStatus: mocks.getKrxMarketSessionStatus
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

function createEmptyJournal() {
  return {
    events: [],
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
    mocks.listUserOpeningRecheckDecisions.mockResolvedValue({});
    mocks.listUserOpeningRecheckScans.mockResolvedValue([]);
    mocks.listOpeningRecheckScans.mockResolvedValue([]);
    mocks.loadPortfolioCloseReviewsForUser.mockResolvedValue({});
    mocks.loadPortfolioJournalForUser.mockResolvedValue(createEmptyJournal());
    mocks.loadPortfolioPersonalRulesForUser.mockResolvedValue([]);
    mocks.loadPortfolioProfileDocument.mockResolvedValue(createEmptyProfile());
    mocks.loadPortfolioProfileForUser.mockResolvedValue(createEmptyProfile());
    mocks.isPortfolioProfileConfigured.mockReturnValue(false);
    mocks.buildTodayCommunityStats.mockResolvedValue(undefined);
    mocks.getKrxMarketSessionStatus.mockReturnValue({
      marketDate: "2026-04-03",
      isOpenDay: true,
      closureKind: "open",
      closureLabel: "개장일",
      headline: "오늘 장초 확인을 마친 뒤 실제 행동으로 이어가세요.",
      detail: "장초 확인 뒤 실제 행동으로 이어집니다."
    });
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
          validationBasis: "실측 기반",
          validationInsight: {
            level: "높음",
            basis: "실측 기반",
            headline: "직접 표본 28건으로 확인했습니다.",
            detail: "측정 표본이 충분합니다."
          },
          trackingDiagnostic: {
            stage: "진입 추적 가능",
            activationScore: 79,
            watchThreshold: 60,
            entryThreshold: 70,
            isWatchEligible: true,
            isEntryEligible: true,
            blockers: [],
            supports: ["장중 거래대금"]
          },
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
      boardStatus: "buy_review",
      validationBasis: "실측 기반",
      validation: {
        hitRate: 55,
        avgReturn: 2,
        sampleSize: 11,
        maxDrawdown: -3
      },
      trackingDiagnostic: {
        stage: "진입 추적 가능"
      }
    });
  });

  it("switches today into review mode on closed market days", async () => {
    mocks.getRecommendations.mockResolvedValue({
      generatedAt: "2026-03-08T00:00:00.000Z",
      items: [createRecommendation({ ticker: "AAA001", company: "Alpha" })]
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
      topCandidates: [createCandidate({ ticker: "AAA001", company: "Alpha" })],
      batchSummaries: []
    });
    mocks.getKrxMarketSessionStatus.mockReturnValue({
      marketDate: "2026-04-04",
      isOpenDay: false,
      closureKind: "weekend",
      closureLabel: "토요일 휴장",
      headline: "오늘은 지난 기록을 검토하고, 새로운 계획을 만들어보세요.",
      detail: "주말에는 장초 확인 대신 복기와 계획에 집중합니다."
    });

    const result = await listRecommendations({ sort: "score_desc" });

    expect(result.marketSession.isOpenDay).toBe(false);
    expect(result.todaySummary).toBeDefined();
    expect(result.todaySummary?.marketStanceLabel).toBe("복기·계획");
    expect(result.todaySummary?.summary).toBe("오늘은 지난 기록을 검토하고, 새로운 계획을 만들어보세요.");
    expect(result.todaySummary?.maxNewPositions).toBe(0);
    expect(result.dailyScan?.openingCheckLimit).toBe(0);
    expect(result.dailyScan?.openingCheckCandidates).toEqual([]);
    expect(result.todayActionBoard).toBeUndefined();
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

  it("keeps ranking candidates intact but limits opening check candidates with a dedicated env var", async () => {
    const previousLimit = process.env.SWING_RADAR_OPENING_CHECK_LIMIT;
    process.env.SWING_RADAR_OPENING_CHECK_LIMIT = "5";

    try {
      const tickers = ["AAA001", "BBB001", "CCC001", "DDD001", "EEE001", "FFF001", "GGG001", "HHH001"];

      mocks.getRecommendations.mockResolvedValue({
        generatedAt: "2026-03-08T00:00:00.000Z",
        items: tickers.map((ticker, index) =>
          createRecommendation({
            ticker,
            company: `Company ${index + 1}`,
            sector: "Tech",
            score: 90 - index
          })
        )
      });
      mocks.getDailyCandidates.mockResolvedValue({
        generatedAt: "2026-03-08T01:00:00.000Z",
        batchSize: 20,
        concurrency: 2,
        topCandidatesLimit: 20,
        totalTickers: 100,
        totalBatches: 5,
        succeededBatches: 5,
        failedBatches: [],
        topCandidates: tickers.map((ticker, index) =>
          createCandidate({
            ticker,
            company: `Company ${index + 1}`,
            sector: "Tech",
            score: 90 - index,
            candidateScore: 100 - index
          })
        ),
        batchSummaries: []
      });

      const result = await listRecommendations({ sort: "score_desc" });

      expect(result.dailyScan?.topCandidates).toHaveLength(8);
      expect(result.dailyScan?.openingCheckLimit).toBe(5);
      expect(result.dailyScan?.openingCheckCandidates?.map((item) => item.ticker)).toEqual(tickers.slice(0, 5));
      expect(result.todayActionBoard?.items.map((item) => item.ticker)).toEqual(tickers.slice(0, 5));
    } finally {
      if (previousLimit === undefined) {
        delete process.env.SWING_RADAR_OPENING_CHECK_LIMIT;
      } else {
        process.env.SWING_RADAR_OPENING_CHECK_LIMIT = previousLimit;
      }
    }
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

  it("prefers a user opening check while keeping the shared decision for reference", async () => {
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
        updatedBy: "shared-operator"
      }
    });
    mocks.listUserOpeningRecheckDecisions.mockResolvedValue({
      AAA001: {
        status: "watch",
        updatedAt: "2026-03-08T01:07:00.000Z",
        updatedBy: "user-1@example.com"
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

    expect(result.dailyScan?.topCandidates[0]).toMatchObject({
      ticker: "AAA001",
      openingRecheck: {
        status: "watch",
        updatedBy: "user-1@example.com"
      },
      sharedOpeningRecheck: {
        status: "passed",
        updatedBy: "shared-operator"
      }
    });
    expect(result.todayActionBoard?.summary.buyReviewCount).toBe(0);
    expect(result.todayActionBoard?.summary.watchCount).toBe(1);
  });

  it("builds a compact opening check learning insight from user review history", async () => {
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
    mocks.loadPortfolioJournalForUser.mockResolvedValue({
      events: [
        {
          id: "exit-1",
          ticker: "AAA001",
          company: "Alpha",
          sector: "Tech",
          type: "exit_full",
          quantity: 10,
          price: 42_500,
          fees: 0,
          tradedAt: "2026-03-11T00:40:00.000Z",
          note: "목표가 도달 후 종료",
          createdAt: "2026-03-11T00:40:00.000Z",
          createdBy: "user-1@example.com"
        },
        {
          id: "buy-1",
          ticker: "AAA001",
          company: "Alpha",
          sector: "Tech",
          type: "buy",
          quantity: 10,
          price: 40_000,
          fees: 0,
          tradedAt: "2026-03-08T00:40:00.000Z",
          note: "장초 확인 통과 후 첫 진입",
          createdAt: "2026-03-08T00:40:00.000Z",
          createdBy: "user-1@example.com"
        }
      ],
      updatedAt: "2026-03-11T00:40:00.000Z",
      updatedBy: "user-1@example.com"
    });
    mocks.listUserOpeningRecheckScans.mockResolvedValue([
      {
        scanKey: "2026-03-08T01:00:00.000Z",
        updatedAt: "2026-03-08T01:05:00.000Z",
        items: {
          AAA001: {
            ticker: "AAA001",
            status: "passed",
            updatedAt: "2026-03-08T01:05:00.000Z",
            updatedBy: "user-1@example.com",
            checklist: {
              gap: "normal",
              confirmation: "confirmed",
              action: "review"
            }
          }
        }
      }
    ]);

    const result = await listRecommendations({ sort: "score_desc" }, { userId: "user-1" });

    expect(result.openingCheckLearning).toBeDefined();
    expect(result.openingCheckLearning?.headline).toContain("통과");
    expect(result.openingCheckLearning?.primaryLesson).toContain("승률");
  });

  it("surfaces a recent strategy performance hint from closed journal tags", async () => {
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
    mocks.loadPortfolioJournalForUser.mockResolvedValue({
      events: [
        {
          id: "aaa-exit",
          ticker: "AAA001",
          company: "Alpha",
          sector: "Tech",
          type: "exit_full",
          quantity: 10,
          price: 42_500,
          fees: 0,
          tradedAt: "2026-03-11T00:40:00.000Z",
          note: "partial profit review",
          createdAt: "2026-03-11T00:40:00.000Z",
          createdBy: "user-1@example.com"
        },
        {
          id: "aaa-buy",
          ticker: "AAA001",
          company: "Alpha",
          sector: "Tech",
          type: "buy",
          quantity: 10,
          price: 40_000,
          fees: 0,
          tradedAt: "2026-03-08T00:40:00.000Z",
          note: "partial profit review",
          createdAt: "2026-03-08T00:40:00.000Z",
          createdBy: "user-1@example.com"
        },
        {
          id: "bbb-exit",
          ticker: "BBB001",
          company: "Beta",
          sector: "Tech",
          type: "exit_full",
          quantity: 8,
          price: 54_000,
          fees: 0,
          tradedAt: "2026-03-19T00:40:00.000Z",
          note: "partial profit review",
          createdAt: "2026-03-19T00:40:00.000Z",
          createdBy: "user-1@example.com"
        },
        {
          id: "bbb-buy",
          ticker: "BBB001",
          company: "Beta",
          sector: "Tech",
          type: "buy",
          quantity: 8,
          price: 50_000,
          fees: 0,
          tradedAt: "2026-03-15T00:40:00.000Z",
          note: "partial profit review",
          createdAt: "2026-03-15T00:40:00.000Z",
          createdBy: "user-1@example.com"
        }
      ],
      updatedAt: "2026-03-19T00:40:00.000Z",
      updatedBy: "user-1@example.com"
    });

    const result = await listRecommendations({ sort: "score_desc" }, { userId: "user-1" });

    expect(result.strategyPerformanceHint).toBeDefined();
    expect(result.strategyPerformanceHint?.count).toBe(2);
    expect(result.strategyPerformanceHint?.realizedPnl).toBeGreaterThan(0);
    expect(result.strategyPerformanceHint?.detail).toContain("승률");
  });

  it("surfaces personal rule reminders from saved close reviews", async () => {
    mocks.getRecommendations.mockResolvedValue({
      generatedAt: "2026-03-08T00:00:00.000Z",
      items: [createRecommendation({ ticker: "AAA001", company: "Alpha", sector: "Tech", score: 90 })]
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
    mocks.loadPortfolioCloseReviewsForUser.mockResolvedValue({
      "AAA001:2026-03-08T06:00:00.000Z": {
        positionKey: "AAA001:2026-03-08T06:00:00.000Z",
        ticker: "AAA001",
        closedAt: "2026-03-08T06:00:00.000Z",
        strengthsNote: "확인 가격 유지 후 진입",
        watchoutsNote: "손절을 늦추지 말기",
        nextRuleNote: "보류 상태에서는 진입 금지",
        updatedAt: "2026-03-08T08:00:00.000Z",
        updatedBy: "tester@example.com"
      },
      "BBB001:2026-03-07T06:00:00.000Z": {
        positionKey: "BBB001:2026-03-07T06:00:00.000Z",
        ticker: "BBB001",
        closedAt: "2026-03-07T06:00:00.000Z",
        watchoutsNote: "손절을 늦추지 말기",
        nextRuleNote: "확인 가격 실패면 당일 보류",
        updatedAt: "2026-03-07T08:00:00.000Z",
        updatedBy: "tester@example.com"
      }
    });

    const result = await listRecommendations({ sort: "score_desc" }, { userId: "user-1" });

    expect(result.personalRuleReminder).toMatchObject({
      primaryRule: "보류 상태에서는 진입 금지"
    });
    expect(result.personalRuleReminder?.secondaryRules).toContain("확인 가격 실패면 당일 보류");
  });
  it("prioritizes promoted personal rules in reminder copy", async () => {
    mocks.getRecommendations.mockResolvedValue({
      generatedAt: "2026-03-08T00:00:00.000Z",
      items: [createRecommendation({ ticker: "AAA001", company: "Alpha", sector: "Tech", score: 90 })]
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
    mocks.loadPortfolioCloseReviewsForUser.mockResolvedValue({});
    mocks.loadPortfolioPersonalRulesForUser.mockResolvedValue([
      {
        id: "next_rule:보류 상태에서는 당일 진입하지 않기",
        text: "보류 상태에서는 당일 진입하지 않기",
        sourceCategory: "next_rule",
        sourceLabel: "다음 규칙",
        isActive: true,
        createdAt: "2026-03-08T08:00:00.000Z",
        updatedAt: "2026-03-08T08:00:00.000Z",
        updatedBy: "tester@example.com"
      }
    ]);

    const result = await listRecommendations({ sort: "score_desc" }, { userId: "user-1" });

    expect(result.personalRuleReminder).toMatchObject({
      primaryRule: "보류 상태에서는 당일 진입하지 않기"
    });
  });

  it("ignores inactive personal rules in reminder copy", async () => {
    mocks.getRecommendations.mockResolvedValue({
      generatedAt: "2026-03-08T00:00:00.000Z",
      items: [createRecommendation({ ticker: "AAA001", company: "Alpha", sector: "Tech", score: 90 })]
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
    mocks.loadPortfolioCloseReviewsForUser.mockResolvedValue({});
    mocks.loadPortfolioPersonalRulesForUser.mockResolvedValue([
      {
        id: "next_rule:보류 상태에서는 당일 진입하지 않기",
        text: "보류 상태에서는 당일 진입하지 않기",
        sourceCategory: "next_rule",
        sourceLabel: "다음 규칙",
        isActive: false,
        createdAt: "2026-03-08T08:00:00.000Z",
        updatedAt: "2026-03-08T08:00:00.000Z",
        updatedBy: "tester@example.com"
      }
    ]);

    const result = await listRecommendations({ sort: "score_desc" }, { userId: "user-1" });

    expect(result.personalRuleReminder).toBeUndefined();
  });

  it("surfaces a stronger personal rule alert when avoided trades are repeatedly overridden", async () => {
    mocks.getRecommendations.mockResolvedValue({
      generatedAt: "2026-03-08T00:00:00.000Z",
      items: [
        createRecommendation({ ticker: "AAA001", company: "Alpha", sector: "Tech", score: 90 }),
        createRecommendation({ ticker: "BBB001", company: "Beta", sector: "Tech", score: 84 })
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
        createCandidate({ ticker: "AAA001", company: "Alpha", sector: "Tech" }),
        createCandidate({ ticker: "BBB001", company: "Beta", sector: "Tech" })
      ],
      batchSummaries: []
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
    mocks.loadPortfolioJournalForUser.mockResolvedValue({
      events: [
        {
          id: "aaa-exit",
          ticker: "AAA001",
          company: "Alpha",
          sector: "Tech",
          type: "stop_loss",
          quantity: 10,
          price: 38_200,
          fees: 0,
          tradedAt: "2026-03-11T00:40:00.000Z",
          note: "확인 가격 실패 후 강행",
          createdAt: "2026-03-11T00:40:00.000Z",
          createdBy: "user-1@example.com"
        },
        {
          id: "aaa-buy",
          ticker: "AAA001",
          company: "Alpha",
          sector: "Tech",
          type: "buy",
          quantity: 10,
          price: 40_000,
          fees: 0,
          tradedAt: "2026-03-08T00:40:00.000Z",
          note: "보류인데도 진입",
          createdAt: "2026-03-08T00:40:00.000Z",
          createdBy: "user-1@example.com"
        },
        {
          id: "bbb-exit",
          ticker: "BBB001",
          company: "Beta",
          sector: "Tech",
          type: "manual_exit",
          quantity: 8,
          price: 48_000,
          fees: 0,
          tradedAt: "2026-03-10T00:40:00.000Z",
          note: "장초 확인 보류 후 재진입",
          createdAt: "2026-03-10T00:40:00.000Z",
          createdBy: "user-1@example.com"
        },
        {
          id: "bbb-buy",
          ticker: "BBB001",
          company: "Beta",
          sector: "Tech",
          type: "buy",
          quantity: 8,
          price: 50_000,
          fees: 0,
          tradedAt: "2026-03-08T01:10:00.000Z",
          note: "보류 강행",
          createdAt: "2026-03-08T01:10:00.000Z",
          createdBy: "user-1@example.com"
        }
      ],
      updatedAt: "2026-03-11T00:40:00.000Z",
      updatedBy: "user-1@example.com"
    });
    mocks.listUserOpeningRecheckScans.mockResolvedValue([
      {
        scanKey: "2026-03-08T01:00:00.000Z",
        updatedAt: "2026-03-08T01:05:00.000Z",
        items: {
          AAA001: {
            ticker: "AAA001",
            status: "avoid",
            updatedAt: "2026-03-08T01:05:00.000Z",
            updatedBy: "user-1@example.com",
            checklist: {
              gap: "overheated",
              confirmation: "failed",
              action: "hold"
            }
          },
          BBB001: {
            ticker: "BBB001",
            status: "excluded",
            updatedAt: "2026-03-08T01:08:00.000Z",
            updatedBy: "user-1@example.com",
            checklist: {
              gap: "overheated",
              confirmation: "failed",
              action: "hold"
            }
          }
        }
      }
    ]);
    mocks.loadPortfolioCloseReviewsForUser.mockResolvedValue({
      "AAA001:2026-03-11T00:40:00.000Z": {
        positionKey: "AAA001:2026-03-11T00:40:00.000Z",
        ticker: "AAA001",
        closedAt: "2026-03-11T00:40:00.000Z",
        watchoutsNote: "확인 가격 실패 후 강행 금지",
        nextRuleNote: "보류 상태에서는 진입 금지",
        updatedAt: "2026-03-11T08:00:00.000Z",
        updatedBy: "tester@example.com"
      }
    });

    const result = await listRecommendations({ sort: "score_desc" }, { userId: "user-1" });

    expect(result.personalRuleAlert).toMatchObject({
      headline: "보류·제외 판단 강행 2건",
      ctaLabel: "장초 확인 먼저",
      ctaHref: "/opening-check"
    });
    expect(result.openingCheckRiskPatterns?.[0]).toMatchObject({
      id: "overheated:failed:hold",
      lossCount: 2
    });
    expect(result.personalRuleAlert?.detail).toContain("보류 상태에서는 진입 금지");
    expect(result.personalRuleAlert?.statLine).toContain("손실 종료 2건");
  });
});
