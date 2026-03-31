import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRecommendations: vi.fn(),
  getAnalysis: vi.fn(),
  getTracking: vi.fn(),
  getDailyCandidates: vi.fn(),
  listOpeningRecheckDecisions: vi.fn(),
  loadPortfolioProfileDocument: vi.fn(),
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
  isPortfolioProfileConfigured: mocks.isPortfolioProfileConfigured
}));

import { listRecommendations } from "@/lib/services/recommendations-service";

function createRecommendation(overrides: Record<string, unknown>) {
  return {
    ticker: "AAA001",
    company: "Alpha",
    sector: "Tech",
    signalTone: "긍정",
    score: 70,
    signalLabel: "Base setup",
    rationale: "Base rationale",
    invalidation: "41,000원 이탈",
    invalidationDistance: -4,
    riskRewardRatio: "1 : 2",
    validationSummary: "Measured validation",
    checkpoints: ["41,000원 지지", "44,000원 돌파", "47,000원 확인"],
    validation: { hitRate: 55, avgReturn: 2, sampleSize: 11, maxDrawdown: -3 },
    observationWindow: "5~10거래일",
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
    validationSummary: "Measured validation",
    observationWindow: "5~10거래일",
    rationale: "Candidate rationale",
    eventCoverage: "실적 대기",
    ...overrides
  };
}

function createAnalysis(overrides: Record<string, unknown>) {
  return {
    ticker: "AAA001",
    company: "Alpha",
    signalTone: "湲띿젙",
    score: 72,
    headline: "Alpha analysis",
    invalidation: "41,000원 이탈",
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

describe("listRecommendations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listOpeningRecheckDecisions.mockResolvedValue({});
    mocks.getAnalysis.mockResolvedValue({
      generatedAt: "2026-03-08T00:00:00.000Z",
      items: []
    });
    mocks.loadPortfolioProfileDocument.mockResolvedValue({
      name: "기본 운용 프로필",
      totalCapital: 0,
      availableCash: 0,
      maxRiskPerTradePercent: 0.8,
      maxConcurrentPositions: 4,
      sectorLimit: 2,
      positions: [],
      updatedAt: "1970-01-01T00:00:00.000Z",
      updatedBy: "system"
    });
    mocks.isPortfolioProfileConfigured.mockReturnValue(false);
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
        createRecommendation({
          ticker: "AAA001",
          company: "Alpha",
          sector: "Tech",
          score: 90,
          signalLabel: "High score",
          rationale: "Alpha setup"
        }),
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
      topCandidates: [
        createCandidate({
          batch: 2,
          ticker: "BBB001",
          company: "Beta",
          sector: "Bio",
          rationale: "Beta setup",
          eventCoverage: "보강 중"
        })
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
    expect(result.operatingWorkflow?.steps[0]?.key).toBe("preopen_candidates");
    expect(result.operatingWorkflow?.openingChecklist[1]?.key).toBe("stop_buffer");
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
        createRecommendation({
          ticker: "AAA001",
          company: "Alpha",
          sector: "Tech",
          signalTone: "긍정",
          score: 90,
          signalLabel: "A"
        }),
        createRecommendation({
          ticker: "BBB001",
          company: "Beta",
          sector: "Bio",
          signalTone: "주의",
          score: 40,
          signalLabel: "B",
          checkpoints: ["25,000원 지지"],
          invalidation: "25,000원 이탈",
          invalidationDistance: -1,
          riskRewardRatio: "1 : 1",
          validation: { hitRate: 30, avgReturn: -1, sampleSize: 10, maxDrawdown: -6 },
          updatedAt: "2026-03-07 09:00"
        })
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
        createRecommendation({
          ticker: "005930",
          company: "Samsung Electronics",
          sector: "Semiconductor",
          score: 75,
          signalLabel: "Held alpha",
          rationale: "Held alpha setup"
        }),
        createRecommendation({
          ticker: "000660",
          company: "SK Hynix",
          sector: "Semiconductor",
          score: 74,
          signalLabel: "Held beta",
          rationale: "Held beta setup"
        }),
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
      topCandidates: [
        createCandidate({
          ticker: "BBB001",
          company: "Beta",
          sector: "Semiconductor"
        })
      ],
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
          company: "SK Hynix",
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
    expect(result.todayActionBoard?.summary.crowdedSectors).toEqual([{ sector: "Semiconductor", count: 2 }]);
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

  it("prefers a configured portfolio profile over tracking-derived holdings", async () => {
    mocks.getRecommendations.mockResolvedValue({
      generatedAt: "2026-03-08T00:00:00.000Z",
      items: [
        createRecommendation({
          ticker: "005930",
          company: "Samsung Electronics",
          sector: "Semiconductor",
          score: 75
        }),
        createRecommendation({
          ticker: "000660",
          company: "SK Hynix",
          sector: "Semiconductor",
          score: 74
        }),
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
      topCandidates: [
        createCandidate({
          ticker: "BBB001",
          company: "Beta",
          sector: "Semiconductor"
        })
      ],
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
          company: "SK Hynix",
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
    mocks.getAnalysis.mockResolvedValue({
      generatedAt: "2026-03-08T00:20:00.000Z",
      items: [
        createAnalysis({
          ticker: "267260",
          company: "HD Hyundai Electric",
          signalTone: "湲띿젙",
          tradePlan: {
            currentPrice: 374_000,
            currentPriceLabel: "374,000원",
            entryPriceLow: 360_000,
            entryPriceHigh: 365_000,
            confirmationPrice: 365_000,
            entryLabel: "360,000원 ~ 365,000원",
            stopPrice: 348_000,
            stopLabel: "348,000원",
            targetPrice: 390_000,
            targetLabel: "390,000원",
            stretchTargetPrice: 405_000,
            stretchTargetLabel: "405,000원",
            holdWindowLabel: "5~10거래일",
            riskRewardLabel: "1 : 1.5",
            nextStep: "보유"
          }
        })
      ]
    });
    mocks.loadPortfolioProfileDocument.mockResolvedValue({
      name: "실전 운용",
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
    expect(result.todayActionBoard?.summary.remainingPortfolioSlots).toBe(2);
    expect(result.todayActionBoard?.summary.crowdedSectors).toEqual([]);
    expect(result.todayActionBoard?.summary.buyReviewCount).toBe(1);
    expect(result.todayActionBoard?.summary.portfolioProfileName).toBe("실전 운용");
    expect(result.todayActionBoard?.summary.availableCash).toBe(12_000_000);
    expect(result.todayActionBoard?.summary.riskBudgetPerTrade).toBe(400_000);
    expect(result.todayActionBoard?.sections[0]).toMatchObject({
      status: "buy_review",
      count: 1
    });
    expect(result.todayActionBoard?.sections[0]?.items[0]).toMatchObject({
      ticker: "BBB001",
      boardStatus: "buy_review"
    });
    expect(result.todayActionBoard?.sections[0]?.items[0]?.tradePlan?.positionSizing).toMatchObject({
      suggestedQuantity: 133,
      suggestedCapital: 5_852_000,
      suggestedWeightPercent: 11.7,
      maxLossAmount: 399_000,
      limitSource: "risk_budget"
    });
    expect(result.holdingActionBoard?.summary.holdingCount).toBe(1);
    expect(result.holdingActionBoard?.summary.tightenStopCount).toBe(1);
    expect(result.holdingActionBoard?.sections[2]).toMatchObject({
      status: "tighten_stop",
      count: 1
    });
    expect(result.holdingActionBoard?.sections[2]?.items[0]).toMatchObject({
      ticker: "267260",
      actionStatus: "tighten_stop",
      holdingDays: 6
    });
  });
});
