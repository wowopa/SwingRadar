import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/server/api-error";

const mocks = vi.hoisted(() => ({
  assertAdminRequest: vi.fn(),
  loadSnapshotBundleFromDisk: vi.fn(),
  ingestSnapshotBundle: vi.fn(),
  listAuditLogs: vi.fn(),
  recordAuditLog: vi.fn(),
  getHealthReport: vi.fn(),
  loadOpsHealthCheckReport: vi.fn(),
  loadDailyCycleReport: vi.fn(),
  loadAutoHealReport: vi.fn(),
  loadNewsFetchReport: vi.fn(),
  loadSnapshotGenerationReport: vi.fn(),
  loadPostLaunchHistory: vi.fn(),
  appendPostLaunchHistoryEntry: vi.fn(),
  loadThresholdAdviceReport: vi.fn(),
  loadRuntimeStorageReport: vi.fn(),
  loadDatabaseStorageReport: vi.fn(),
  loadOpsVerificationDocument: vi.fn(),
  refetchTopCandidateMissingNews: vi.fn(),
  publishEditorialDraft: vi.fn(),
  rollbackPublishedSnapshot: vi.fn(),
  loadNewsCuration: vi.fn(),
  saveNewsCuration: vi.fn(),
  getDailyCandidates: vi.fn(),
  listUniverseCandidateReviews: vi.fn(),
  saveUniverseCandidateReview: vi.fn(),
  promoteUniverseCandidate: vi.fn(),
  listWatchlistEntries: vi.fn(),
  listWatchlistSyncStatuses: vi.fn(),
  addSymbolToWatchlist: vi.fn(),
  updateWatchlistEntry: vi.fn(),
  getFeaturedSymbols: vi.fn(),
  getSymbolSuggestionByTicker: vi.fn(),
  searchSymbols: vi.fn(),
  loadPortfolioProfileDocument: vi.fn(),
  savePortfolioProfileDocument: vi.fn()
}));

vi.mock("@/lib/server/admin-auth", () => ({
  assertAdminRequest: mocks.assertAdminRequest
}));

vi.mock("@/lib/server/postgres-ingest", () => ({
  loadSnapshotBundleFromDisk: mocks.loadSnapshotBundleFromDisk,
  ingestSnapshotBundle: mocks.ingestSnapshotBundle
}));

vi.mock("@/lib/server/audit-log", () => ({
  listAuditLogs: mocks.listAuditLogs,
  recordAuditLog: mocks.recordAuditLog
}));

vi.mock("@/lib/services/health-service", () => ({
  getHealthReport: mocks.getHealthReport
}));

vi.mock("@/lib/server/ops-reports", () => ({
  loadOpsHealthCheckReport: mocks.loadOpsHealthCheckReport,
  loadDailyCycleReport: mocks.loadDailyCycleReport,
  loadAutoHealReport: mocks.loadAutoHealReport,
  loadNewsFetchReport: mocks.loadNewsFetchReport,
  loadSnapshotGenerationReport: mocks.loadSnapshotGenerationReport,
  loadPostLaunchHistory: mocks.loadPostLaunchHistory,
  appendPostLaunchHistoryEntry: mocks.appendPostLaunchHistoryEntry,
  loadThresholdAdviceReport: mocks.loadThresholdAdviceReport,
  loadRuntimeStorageReport: mocks.loadRuntimeStorageReport
}));

vi.mock("@/lib/server/postgres-storage-report", () => ({
  loadDatabaseStorageReport: mocks.loadDatabaseStorageReport
}));

vi.mock("@/lib/server/ops-verification", async () => {
  const actual = await vi.importActual<typeof import("@/lib/server/ops-verification")>("@/lib/server/ops-verification");
  return {
    ...actual,
    loadOpsVerificationDocument: mocks.loadOpsVerificationDocument
  };
});

vi.mock("@/lib/server/admin-news-refetch", () => ({
  refetchTopCandidateMissingNews: mocks.refetchTopCandidateMissingNews
}));

vi.mock("@/lib/server/editorial-draft", () => ({
  publishEditorialDraft: mocks.publishEditorialDraft,
  rollbackPublishedSnapshot: mocks.rollbackPublishedSnapshot
}));

vi.mock("@/lib/server/news-curation", () => ({
  loadNewsCuration: mocks.loadNewsCuration,
  saveNewsCuration: mocks.saveNewsCuration
}));

vi.mock("@/lib/repositories/daily-candidates", () => ({
  getDailyCandidates: mocks.getDailyCandidates
}));

vi.mock("@/lib/server/universe-candidate-reviews", () => ({
  listUniverseCandidateReviews: mocks.listUniverseCandidateReviews,
  saveUniverseCandidateReview: mocks.saveUniverseCandidateReview
}));

vi.mock("@/lib/server/universe-promotion", () => ({
  promoteUniverseCandidate: mocks.promoteUniverseCandidate
}));

vi.mock("@/lib/server/watchlist-manager", () => ({
  listWatchlistEntries: mocks.listWatchlistEntries,
  addSymbolToWatchlist: mocks.addSymbolToWatchlist,
  updateWatchlistEntry: mocks.updateWatchlistEntry
}));

vi.mock("@/lib/server/watchlist-sync-status", () => ({
  listWatchlistSyncStatuses: mocks.listWatchlistSyncStatuses
}));

vi.mock("@/lib/server/runtime-symbol-master", () => ({
  getFeaturedSymbols: mocks.getFeaturedSymbols,
  getSymbolSuggestionByTicker: mocks.getSymbolSuggestionByTicker,
  searchSymbols: mocks.searchSymbols
}));

vi.mock("@/lib/server/portfolio-profile", () => ({
  loadPortfolioProfileDocument: mocks.loadPortfolioProfileDocument,
  savePortfolioProfileDocument: mocks.savePortfolioProfileDocument
}));

import { GET as getIngestRoute, POST as postIngestRoute } from "@/app/api/admin/ingest/route";
import { GET as getAuditRoute } from "@/app/api/admin/audit/route";
import { GET as getNewsCurationRoute, POST as postNewsCurationRoute } from "@/app/api/admin/news-curation/route";
import { POST as postNewsRefetchRoute } from "@/app/api/admin/news-refetch/route";
import { GET as getPortfolioProfileRoute, POST as postPortfolioProfileRoute } from "@/app/api/admin/portfolio-profile/route";
import { POST as postPublishRoute } from "@/app/api/admin/publish/route";
import { POST as postRollbackRoute } from "@/app/api/admin/rollback/route";
import { GET as getStatusRoute } from "@/app/api/admin/status/route";
import { GET as getUniverseRoute, POST as postUniverseRoute, PUT as putUniverseRoute } from "@/app/api/admin/universe/route";
import { GET as getWatchlistRoute, POST as postWatchlistRoute, PUT as putWatchlistRoute } from "@/app/api/admin/watchlist/route";

function createRequest(url: string, init?: RequestInit) {
  return new Request(url, {
    headers: {
      authorization: "Bearer test-token",
      "x-request-id": "req-test",
      ...(init?.headers ?? {})
    },
    ...init
  });
}

async function parseJson<T>(response: Response): Promise<T> {
  return JSON.parse(await response.text()) as T;
}

describe("admin routes", () => {
  let infoSpy: ReturnType<typeof vi.spyOn>;
  const originalAdminAuditLimit = process.env.SWING_RADAR_ADMIN_AUDIT_LIMIT;

  beforeEach(() => {
    vi.clearAllMocks();
    infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    process.env.SWING_RADAR_ADMIN_AUDIT_LIMIT = "12";

    mocks.assertAdminRequest.mockReturnValue(undefined);
    mocks.listAuditLogs.mockResolvedValue([]);
    mocks.recordAuditLog.mockResolvedValue(undefined);
    mocks.getHealthReport.mockResolvedValue({
      status: "ok",
      service: "swing-radar",
      timestamp: "2026-03-08T00:00:00.000Z",
      dataProvider: {
        configured: { provider: "postgresDataProvider", mode: "external" },
        fallback: { provider: "fileDataProvider", mode: "file" },
        lastUsed: { provider: "postgresDataProvider", mode: "external" },
        fallbackTriggered: false
      },
      freshness: [],
      warnings: [],
      recentAuditCount: 0
    });
    mocks.loadOpsHealthCheckReport.mockResolvedValue(null);
    mocks.loadDailyCycleReport.mockResolvedValue(null);
    mocks.loadAutoHealReport.mockResolvedValue(null);
    mocks.loadNewsFetchReport.mockResolvedValue(null);
    mocks.loadSnapshotGenerationReport.mockResolvedValue(null);
    mocks.loadPostLaunchHistory.mockResolvedValue([]);
    mocks.appendPostLaunchHistoryEntry.mockResolvedValue([]);
    mocks.loadThresholdAdviceReport.mockResolvedValue(null);
    mocks.loadRuntimeStorageReport.mockResolvedValue(null);
    mocks.loadDatabaseStorageReport.mockResolvedValue(null);
    mocks.loadOpsVerificationDocument.mockResolvedValue({
      scheduler: { checkedAt: "2026-03-08T00:00:00.000Z", checkedBy: "ops", note: "scheduler ok" },
      backup: { checkedAt: "2026-03-08T00:00:00.000Z", checkedBy: "ops", note: "backup ok" },
      restore: { checkedAt: "2026-03-01T00:00:00.000Z", checkedBy: "ops", note: "restore ok" },
      rollback: { checkedAt: "2026-03-01T00:00:00.000Z", checkedBy: "ops", note: "rollback ok" },
      smoke: { checkedAt: "2026-03-08T00:00:00.000Z", checkedBy: "ops", note: "smoke ok" },
      updatedAt: "2026-03-08T00:00:00.000Z",
      updatedBy: "ops"
    });
    mocks.refetchTopCandidateMissingNews.mockResolvedValue({
      scope: "top-candidate-missing",
      requestedTickers: ["005930"],
      missingTickersBefore: ["005930", "035420"],
      missingTickersAfter: ["035420"],
      resolvedTickers: ["005930"],
      scripts: [
        { name: "fetch-news-source.mjs", durationMs: 1200 },
        { name: "sync-external-raw.mjs", durationMs: 320 }
      ],
      reportStartedAt: "2026-03-08T00:10:00.000Z",
      reportCompletedAt: "2026-03-08T00:11:00.000Z",
      noop: false
    });
    mocks.loadSnapshotBundleFromDisk.mockResolvedValue({
      recommendations: { generatedAt: "2026-03-08T00:00:00.000Z", items: [], dailyScan: null },
      analysis: { generatedAt: "2026-03-08T00:00:00.000Z", items: [] },
      tracking: { generatedAt: "2026-03-08T00:00:00.000Z", history: [], details: {} }
    });
    mocks.loadNewsCuration.mockResolvedValue({
      updatedAt: "2026-03-08T00:00:00.000Z",
      updatedBy: "system",
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
    mocks.savePortfolioProfileDocument.mockImplementation((profile: Record<string, unknown>) => ({
      ...profile,
      positions: [
        {
          ticker: "005930",
          company: "Samsung Electronics",
          sector: "Semiconductor",
          quantity: 10,
          averagePrice: 71_000,
          enteredAt: "2026-03-20"
        }
      ]
    }));
    mocks.getDailyCandidates.mockResolvedValue(null);
    mocks.listUniverseCandidateReviews.mockResolvedValue({});
    mocks.saveUniverseCandidateReview.mockResolvedValue({
      ticker: "005930",
      status: "reviewing",
      note: "follow up",
      updatedAt: "2026-03-08T00:00:00.000Z",
      updatedBy: "admin-editor"
    });
    mocks.promoteUniverseCandidate.mockResolvedValue({
      review: {
        ticker: "005930",
        status: "promoted",
        note: "watchlist 편입 실행",
        updatedAt: "2026-03-08T00:00:00.000Z",
        updatedBy: "admin-editor"
      },
      watchlist: {
        added: true,
        entry: { ticker: "005930", company: "Samsung" },
        estimate: "ok",
        timings: { pipelineMs: 100, ingestMs: 40, totalMs: 140 }
      }
    });
    mocks.saveNewsCuration.mockResolvedValue({
      updatedAt: "2026-03-08T00:00:00.000Z",
      updatedBy: "admin-editor",
      items: []
    });
    mocks.listWatchlistSyncStatuses.mockResolvedValue({});
  });

  afterEach(() => {
    infoSpy.mockRestore();

    if (originalAdminAuditLimit === undefined) {
      delete process.env.SWING_RADAR_ADMIN_AUDIT_LIMIT;
    } else {
      process.env.SWING_RADAR_ADMIN_AUDIT_LIMIT = originalAdminAuditLimit;
    }
  });

  describe("admin ingest route", () => {
    it("loads snapshots from disk when POST body is empty", async () => {
      mocks.ingestSnapshotBundle.mockResolvedValue({ recommendations: 0, analysis: 0, tracking: 0 });

      const response = await postIngestRoute(createRequest("http://localhost/api/admin/ingest", { method: "POST" }));
      const payload = await parseJson<{
        ok: boolean;
        requestId: string;
        ingest: { recommendations: number; analysis: number; tracking: number };
      }>(response);

      expect(response.status).toBe(200);
      expect(mocks.loadSnapshotBundleFromDisk).toHaveBeenCalledTimes(1);
      expect(mocks.ingestSnapshotBundle).toHaveBeenCalledWith(
        {
          recommendations: { generatedAt: "2026-03-08T00:00:00.000Z", items: [], dailyScan: null },
          analysis: { generatedAt: "2026-03-08T00:00:00.000Z", items: [] },
          tracking: { generatedAt: "2026-03-08T00:00:00.000Z", history: [], details: {} }
        },
        {
          applySchema: false,
          requestId: "req-test",
          actor: "admin-api"
        }
      );
      expect(payload).toMatchObject({
        ok: true,
        requestId: "req-test",
        ingest: { recommendations: 0, analysis: 0, tracking: 0 }
      });
    });

    it("records a failed auth attempt on ingest GET", async () => {
      mocks.assertAdminRequest.mockImplementationOnce(() => {
        throw new ApiError(403, "ADMIN_FORBIDDEN", "Admin token validation failed");
      });

      const response = await getIngestRoute(createRequest("http://localhost/api/admin/ingest"));
      const payload = await parseJson<{ code: string; requestId: string }>(response);

      expect(response.status).toBe(403);
      expect(mocks.recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "admin_login_attempt",
          status: "failure",
          requestId: "req-test"
        })
      );
      expect(payload).toMatchObject({
        code: "ADMIN_FORBIDDEN",
        requestId: "req-test"
      });
    });
  });

  describe("admin news refetch route", () => {
    it("reruns top candidate news fetch for requested missing tickers", async () => {
      const response = await postNewsRefetchRoute(
        createRequest("http://localhost/api/admin/news-refetch", {
          method: "POST",
          body: JSON.stringify({ tickers: ["005930"] })
        })
      );
      const payload = await parseJson<{
        ok: boolean;
        requestId: string;
        result: {
          requestedTickers: string[];
          resolvedTickers: string[];
          missingTickersAfter: string[];
        };
      }>(response);

      expect(response.status).toBe(200);
      expect(mocks.refetchTopCandidateMissingNews).toHaveBeenCalledWith(["005930"]);
      expect(mocks.recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "admin_news_refetch",
          status: "success",
          requestId: "req-test"
        })
      );
      expect(payload.result).toMatchObject({
        requestedTickers: ["005930"],
        resolvedTickers: ["005930"],
        missingTickersAfter: ["035420"]
      });
    });
  });

  describe("admin status and audit routes", () => {
    it("returns the current health report on status GET", async () => {
      process.env.SWING_RADAR_DATA_PROVIDER = "postgres";
      mocks.getHealthReport.mockResolvedValue({
        status: "warning",
        service: "swing-radar",
        timestamp: "2026-03-08T00:00:00.000Z",
        dataProvider: {
          configured: { provider: "postgresDataProvider", mode: "external" },
          fallback: { provider: "fileDataProvider", mode: "file" },
          lastUsed: { provider: "fileDataProvider", mode: "file" },
          fallbackTriggered: true
        },
        freshness: [{ label: "analysis", stale: true, ageMinutes: 42, severity: "warning" }],
        warnings: ["analysis snapshot is 42 minutes old (warning)"],
        recentAuditCount: 3
      });

      const response = await getStatusRoute(createRequest("http://localhost/api/admin/status"));
      const payload = await parseJson<{
        ok: boolean;
        requestId: string;
        operationalMode: string;
        overallStatus: string;
        serviceReadiness: { status: string; failureCount: number; warningCount: number };
        health: { status: string; recentAuditCount: number; warnings: string[] };
        opsHealthReport: { finalHealth: { status: string } } | null;
        dailyCycleReport: { status: string; summary: { failedBatchCount: number } | null } | null;
        autoHealReport: { status: string; actions: Array<{ name: string }> } | null;
        newsFetchReport: { retryCount: number } | null;
        snapshotGenerationReport: { validationFallbackCount: number } | null;
        dataQualitySummary: { validationFallbackPercent: number | null; newsLiveFetchPercent: number | null } | null;
        postLaunchHistory: Array<{ overallStatus: string }>;
        thresholdAdviceReport: { sampleSize: number } | null;
        incidents: Array<{ id: string; severity: string }>;
      }>(response);

      expect(response.status).toBe(200);
      expect(mocks.getHealthReport).toHaveBeenCalledWith("req-test");
      expect(mocks.loadOpsHealthCheckReport).toHaveBeenCalledTimes(1);
      expect(mocks.loadDailyCycleReport).toHaveBeenCalledTimes(1);
      expect(mocks.loadAutoHealReport).toHaveBeenCalledTimes(1);
      expect(mocks.loadNewsFetchReport).toHaveBeenCalledTimes(1);
      expect(mocks.loadSnapshotGenerationReport).toHaveBeenCalledTimes(1);
      expect(mocks.loadPostLaunchHistory).toHaveBeenCalledTimes(1);
      expect(mocks.loadThresholdAdviceReport).toHaveBeenCalledTimes(1);
      expect(payload).toMatchObject({
        ok: true,
        requestId: "req-test",
        operationalMode: "postgres",
        overallStatus: "warning",
        serviceReadiness: {
          status: "blocked",
          failureCount: 3,
          warningCount: 3
        },
        health: {
          status: "warning",
          recentAuditCount: 3,
          warnings: ["analysis snapshot is 42 minutes old (warning)"]
        },
        opsHealthReport: null,
        dailyCycleReport: null,
        autoHealReport: null,
        newsFetchReport: null,
        snapshotGenerationReport: null,
        dataQualitySummary: {
          validationFallbackPercent: null,
          newsLiveFetchPercent: null
        },
        postLaunchHistory: [],
        thresholdAdviceReport: null,
        incidents: [
          {
            id: "health-analysis",
            severity: "warning"
          },
          {
            id: "provider-fallback",
            severity: "warning"
          }
        ]
      });
    });

    it("returns recent automation reports on status GET", async () => {
      mocks.loadOpsHealthCheckReport.mockResolvedValue({
        checkedAt: "2026-04-05T05:00:00.000Z",
        mode: "auto-recover",
        initialHealth: { status: "warning", warnings: ["analysis stale"] },
        recovery: {
          attempted: true,
          timings: { refreshExternalMs: 3200, ingestPostgresMs: 1200 }
        },
        finalHealth: { status: "ok", warnings: [] }
      });
      mocks.loadDailyCycleReport.mockResolvedValue({
        startedAt: "2026-04-05T05:10:00.000Z",
        completedAt: "2026-04-05T05:12:00.000Z",
        status: "warning",
        steps: [
          {
            name: "symbol-sync",
            status: "completed",
            startedAt: "2026-04-05T05:10:00.000Z",
            completedAt: "2026-04-05T05:10:30.000Z",
            durationMs: 30000,
            error: null
          },
          {
            name: "recommendations",
            status: "failed",
            startedAt: "2026-04-05T05:10:30.000Z",
            completedAt: "2026-04-05T05:12:00.000Z",
            durationMs: 90000,
            error: "Fallback exceeded threshold"
          }
        ],
        summary: {
          generatedAt: "2026-04-05T05:12:00.000Z",
          topCandidateCount: 5,
          totalBatches: 10,
          succeededBatches: 9,
          failedBatchCount: 1,
          batchSize: 20
        },
        error: null
      });
      mocks.loadAutoHealReport.mockResolvedValue({
        startedAt: "2026-04-05T05:15:00.000Z",
        completedAt: "2026-04-05T05:16:00.000Z",
        status: "ok",
        triggers: ["daily-cycle-warning"],
        actions: [
          {
            name: "daily-cycle-rerun",
            status: "completed",
            startedAt: "2026-04-05T05:15:00.000Z",
            completedAt: "2026-04-05T05:16:00.000Z",
            durationMs: 60000,
            detail: "daily universe cycle warning or failure",
            error: null
          }
        ],
        error: null
      });
      mocks.loadNewsFetchReport.mockResolvedValue({
        startedAt: "2026-04-05T04:40:00.000Z",
        completedAt: "2026-04-05T04:42:00.000Z",
        providerOrder: ["naver", "gnews"],
        requestedProvider: "naver",
        totalTickers: 20,
        configuredLiveFetchTickerLimit: 20,
        liveFetchTickers: 18,
        topCandidateLimit: 5,
        cacheFallbackTickers: 1,
        fileFallbackTickers: 1,
        retryCount: 3,
        providerFailures: [],
        totalItems: 62,
        topCandidateCoverage: {
          totalTickers: 5,
          liveFetchTickers: 5,
          cacheFallbackTickers: 0,
          fileFallbackTickers: 0,
          missingTickers: 0,
          totalItems: 24,
          tickers: [
            { rank: 1, ticker: "005930", company: "Samsung Electronics", source: "live", itemCount: 6, providers: ["naver"] },
            { rank: 2, ticker: "000660", company: "SK hynix", source: "live", itemCount: 5, providers: ["naver"] },
            { rank: 3, ticker: "035420", company: "NAVER", source: "live", itemCount: 4, providers: ["naver", "gnews"] },
            { rank: 4, ticker: "051910", company: "LG Chem", source: "live", itemCount: 5, providers: ["naver"] },
            { rank: 5, ticker: "005380", company: "Hyundai Motor", source: "live", itemCount: 4, providers: ["naver"] }
          ]
        }
      });
      mocks.loadSnapshotGenerationReport.mockResolvedValue({
        startedAt: "2026-04-05T04:42:10.000Z",
        completedAt: "2026-04-05T04:42:40.000Z",
        generatedAt: "2026-04-05T04:42:40.000Z",
        totalTickers: 20,
        recommendationCount: 20,
        analysisCount: 20,
        trackingHistoryCount: 9,
        validationFallbackCount: 1,
        validationFallbackTickers: ["000660"],
        validationFallbackDetails: [
          {
            ticker: "000660",
            basis: "보수 계산",
            sampleSize: 14
          }
        ],
        validationTrackingRecoveredCount: 2,
        validationTrackingRecoveredTickers: ["005930", "035420"]
      });
      mocks.loadPostLaunchHistory.mockResolvedValue([
        {
          checkedAt: "2026-04-05T05:00:00.000Z",
          healthStatus: "ok",
          overallStatus: "warning",
          dailyTaskRegistered: true,
          autoHealTaskRegistered: true,
          incidents: { criticalCount: 0, warningCount: 2 },
          audits: { total: 4, failureCount: 0, warningCount: 1 }
        }
      ]);
      mocks.appendPostLaunchHistoryEntry.mockResolvedValue([
        {
          checkedAt: "2026-04-05T05:00:00.000Z",
          healthStatus: "ok",
          overallStatus: "warning",
          dailyTaskRegistered: true,
          autoHealTaskRegistered: true,
          incidents: { criticalCount: 0, warningCount: 2 },
          audits: { total: 4, failureCount: 0, warningCount: 1 }
        }
      ]);
      mocks.loadThresholdAdviceReport.mockResolvedValue({
        generatedAt: "2026-04-05T05:05:00.000Z",
        sampleSize: 3,
        currentPolicy: {
          newsLiveFetchWarningPercent: 70,
          newsLiveFetchCriticalPercent: 40,
          validationFallbackWarningPercent: 50,
          validationFallbackCriticalPercent: 80
        },
        observations: {
          averageWarningIncidents: 1.3,
          averageCriticalIncidents: 0,
          averageAuditFailures: 0,
          latestLiveFetchPercent: 90,
          latestValidationFallbackCount: 1,
          latestValidationFallbackPercent: 5
        },
        recommendations: [
          {
            key: "newsLiveFetchWarningPercent",
            currentValue: 70,
            suggestedValue: 75,
            reason: "Recent live fetch quality stayed comfortably above the warning line without critical incidents."
          }
        ]
      });
      mocks.listAuditLogs.mockResolvedValue([
        {
          id: 4,
          eventType: "provider_fallback",
          actor: "system",
          status: "warning",
          requestId: "req-fallback",
          summary: "Provider fallback detected by health check",
          metadata: {},
          createdAt: "2026-03-08T18:00:00.000Z"
        }
      ]);

      const response = await getStatusRoute(createRequest("http://localhost/api/admin/status"));
      const payload = await parseJson<{
        overallStatus: string;
        serviceReadiness: { status: string; passCount: number; warningCount: number; failureCount: number };
        opsHealthReport: { finalHealth: { status: string } } | null;
        dailyCycleReport: { status: string; summary: { failedBatchCount: number } | null } | null;
        autoHealReport: { status: string; actions: Array<{ name: string }> } | null;
        newsFetchReport: { retryCount: number; liveFetchTickers: number } | null;
        snapshotGenerationReport: { validationFallbackCount: number } | null;
        dataQualitySummary: {
          validationFallbackPercent: number | null;
          validationTrackingRecoveredCount: number | null;
          newsLiveFetchPercent: number | null;
          failedBatchSteps: Array<{ name: string }> | null;
          runtimeSyncTrust: { status: string } | null;
        } | null;
        postLaunchHistory: Array<{ overallStatus: string; incidents: { criticalCount: number } }>;
        thresholdAdviceReport: { recommendations: Array<{ key: string }> } | null;
        incidents: Array<{ id: string; severity: string }>;
      }>(response);

      expect(response.status).toBe(200);
      expect(payload).toMatchObject({
        overallStatus: "warning",
        serviceReadiness: {
          status: "monitor",
          passCount: 3,
          warningCount: 3,
          failureCount: 0
        },
        opsHealthReport: {
          finalHealth: { status: "ok" }
        },
        dailyCycleReport: {
          status: "warning",
          summary: { failedBatchCount: 1 }
        },
        autoHealReport: {
          status: "ok",
          actions: [{ name: "daily-cycle-rerun" }]
        },
        newsFetchReport: {
          retryCount: 3,
          liveFetchTickers: 18
        },
        snapshotGenerationReport: {
          validationFallbackCount: 1
        },
        dataQualitySummary: {
          validationFallbackPercent: 5,
          validationTrackingRecoveredCount: 2,
          failedBatchSteps: [{ name: "recommendations" }],
          runtimeSyncTrust: { status: "watch" },
          newsLiveFetchPercent: 90,
          topCandidateNewsCoverage: {
            totalTickers: 5,
            liveFetchTickers: 5,
            missingTickers: 0
          }
        },
        postLaunchHistory: [
          {
            overallStatus: "warning",
            incidents: { criticalCount: 0 }
          }
        ],
        thresholdAdviceReport: {
          recommendations: [{ key: "newsLiveFetchWarningPercent" }]
        },
        incidents: [
          { id: "daily-cycle-warning", severity: "warning" },
          { id: "validation-fallback-warning", severity: "warning" }
        ]
      });
    });

    it("returns recent audit events on audit GET", async () => {
      mocks.listAuditLogs.mockResolvedValue([
        {
          id: 5,
          eventType: "admin_publish",
          actor: "admin-editor",
          status: "success",
          requestId: "req-publish",
          summary: "Editorial draft published",
          metadata: { diffCount: 1 },
          createdAt: "2026-03-08T00:00:00.000Z"
        }
      ]);

      const response = await getAuditRoute(createRequest("http://localhost/api/admin/audit"));
      const payload = await parseJson<{
        ok: boolean;
        requestId: string;
        items: Array<{ eventType: string; summary: string }>;
      }>(response);

      expect(response.status).toBe(200);
      expect(mocks.listAuditLogs).toHaveBeenCalledWith(12);
      expect(payload).toMatchObject({
        ok: true,
        requestId: "req-test",
        items: [{ eventType: "admin_publish", summary: "Editorial draft published" }]
      });
    });

    it("returns the latest universe daily candidates on universe GET", async () => {
      mocks.getDailyCandidates.mockResolvedValue({
        generatedAt: "2026-03-08T12:00:00.000Z",
        batchSize: 20,
        totalTickers: 100,
        totalBatches: 5,
        succeededBatches: 4,
        failedBatches: [{ ok: false, batch: 5, count: 20, errors: ["fetch-market-source.mjs: spawn EPERM"] }],
        topCandidates: [
          {
            batch: 2,
            ticker: "005930",
            company: "삼성전자",
            sector: "반도체",
            signalTone: "중립",
            score: 78,
            candidateScore: 88,
            invalidation: "60일선 이탈 시 재검토",
            validationSummary: "보통",
            observationWindow: "5d",
            rationale: "거래량 회복 여부 확인",
            eventCoverage: "제한적"
          }
        ],
        batchSummaries: [{ batch: 2, count: 20, generatedAt: "2026-03-08T12:00:00.000Z", topTicker: "005930", trackingRows: 12 }]
      });

      const response = await getUniverseRoute(createRequest("http://localhost/api/admin/universe"));
      const payload = await parseJson<{
        ok: boolean;
        requestId: string;
        dailyCandidates: { totalTickers: number; failedBatches: Array<{ batch: number }>; topCandidates: Array<{ ticker: string }> };
      }>(response);

      expect(response.status).toBe(200);
      expect(payload).toMatchObject({
        ok: true,
        requestId: "req-test",
        dailyCandidates: {
          totalTickers: 100,
          failedBatches: [{ batch: 5 }],
          topCandidates: [{ ticker: "005930" }]
        }
      });
    });

    it("merges saved universe reviews into candidate payloads", async () => {
      mocks.getDailyCandidates.mockResolvedValue({
        generatedAt: "2026-03-08T12:00:00.000Z",
        batchSize: 20,
        totalTickers: 100,
        totalBatches: 5,
        succeededBatches: 4,
        failedBatches: [],
        topCandidates: [
          {
            batch: 2,
            ticker: "005930",
            company: "Samsung Electronics",
            sector: "Semiconductor",
            signalTone: "중립",
            score: 78,
            candidateScore: 88,
            invalidation: "Break below support",
            validationSummary: "volume stable",
            observationWindow: "5d",
            rationale: "check follow-through",
            eventCoverage: "earnings"
          }
        ],
        batchSummaries: []
      });
      mocks.listUniverseCandidateReviews.mockResolvedValue({
        "005930": {
          ticker: "005930",
          status: "reviewing",
          note: "operator note",
          updatedAt: "2026-03-08T12:30:00.000Z",
          updatedBy: "admin-editor"
        }
      });

      const response = await getUniverseRoute(createRequest("http://localhost/api/admin/universe"));
      const payload = await parseJson<{
        dailyCandidates: { topCandidates: Array<{ ticker: string; review?: { status: string; note: string } }> };
      }>(response);

      expect(response.status).toBe(200);
      expect(mocks.listUniverseCandidateReviews).toHaveBeenCalledTimes(1);
      expect(payload.dailyCandidates.topCandidates[0]).toMatchObject({
        ticker: "005930",
        review: {
          status: "reviewing",
          note: "operator note"
        }
      });
    });

    it("saves universe review updates on PUT", async () => {
      mocks.saveUniverseCandidateReview.mockResolvedValueOnce({
        ticker: "005930",
        status: "hold",
        note: "wait for the next batch",
        updatedAt: "2026-03-08T12:45:00.000Z",
        updatedBy: "admin-editor"
      });

      const response = await putUniverseRoute(
        createRequest("http://localhost/api/admin/universe", {
          method: "PUT",
          body: JSON.stringify({
            ticker: "005930",
            status: "hold",
            note: "wait for the next batch"
          })
        })
      );
      const payload = await parseJson<{
        ok: boolean;
        requestId: string;
        review: { ticker: string; status: string; note: string };
      }>(response);

      expect(response.status).toBe(200);
      expect(mocks.saveUniverseCandidateReview).toHaveBeenCalledWith({
        ticker: "005930",
        status: "hold",
        note: "wait for the next batch",
        updatedBy: "admin-editor"
      });
      expect(mocks.recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "universe_review_update",
          status: "success",
          requestId: "req-test"
        })
      );
      expect(payload).toMatchObject({
        ok: true,
        requestId: "req-test",
        review: {
          ticker: "005930",
          status: "hold",
          note: "wait for the next batch"
        }
      });
    });

    it("promotes a universe candidate into the watchlist on POST", async () => {
      const response = await postUniverseRoute(
        createRequest("http://localhost/api/admin/universe", {
          method: "POST",
          body: JSON.stringify({
            ticker: "005930",
            note: "watchlist 편입 실행"
          })
        })
      );
      const payload = await parseJson<{
        ok: boolean;
        requestId: string;
        review: { ticker: string; status: string; note: string };
        watchlist: { added: boolean };
      }>(response);

      expect(response.status).toBe(200);
      expect(mocks.promoteUniverseCandidate).toHaveBeenCalledWith({
        ticker: "005930",
        note: "watchlist 편입 실행",
        updatedBy: "admin-editor"
      });
      expect(mocks.recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "universe_review_update",
          status: "success",
          requestId: "req-test"
        })
      );
      expect(mocks.recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "watchlist_add",
          status: "success",
          requestId: "req-test"
        })
      );
      expect(payload).toMatchObject({
        ok: true,
        requestId: "req-test",
        review: {
          ticker: "005930",
          status: "promoted",
          note: "watchlist 편입 실행"
        },
        watchlist: {
          added: true
        }
      });
    });
  });

  describe("admin publish and rollback routes", () => {
    it("passes publish options through to the editorial service", async () => {
      mocks.publishEditorialDraft.mockResolvedValue({
        id: "pub-1",
        publishedAt: "2026-03-08T00:00:00.000Z",
        diffCount: 2,
        tickers: 10,
        notes: ["005930: signalLabel"]
      });

      const response = await postPublishRoute(
        createRequest("http://localhost/api/admin/publish", {
          method: "POST",
          body: JSON.stringify({ ingestToPostgres: true, approvalStage: "risk_review" })
        })
      );
      const payload = await parseJson<{
        ok: boolean;
        requestId: string;
        publish: { id: string; diffCount: number };
      }>(response);

      expect(response.status).toBe(200);
      expect(mocks.publishEditorialDraft).toHaveBeenCalledWith({
        requestId: "req-test",
        actor: "admin-editor",
        ingestToPostgres: true,
        approvalStage: "risk_review"
      });
      expect(payload).toMatchObject({
        ok: true,
        requestId: "req-test",
        publish: { id: "pub-1", diffCount: 2 }
      });
    });

    it("passes rollback options through to the editorial service", async () => {
      mocks.rollbackPublishedSnapshot.mockResolvedValue({
        historyId: "hist-1",
        restoredPublishedAt: "2026-03-08T00:00:00.000Z",
        diffCount: 3,
        tickers: 11
      });

      const response = await postRollbackRoute(
        createRequest("http://localhost/api/admin/rollback", {
          method: "POST",
          body: JSON.stringify({
            historyId: "hist-1",
            ingestToPostgres: true,
            rollbackReason: "manual review"
          })
        })
      );
      const payload = await parseJson<{
        ok: boolean;
        requestId: string;
        rollback: { historyId: string; diffCount: number };
      }>(response);

      expect(response.status).toBe(200);
      expect(mocks.rollbackPublishedSnapshot).toHaveBeenCalledWith({
        historyId: "hist-1",
        requestId: "req-test",
        actor: "admin-editor",
        ingestToPostgres: true,
        rollbackReason: "manual review"
      });
      expect(payload).toMatchObject({
        ok: true,
        requestId: "req-test",
        rollback: { historyId: "hist-1", diffCount: 3 }
      });
    });
  });

  describe("admin news curation route", () => {
    it("returns the current curation document on GET", async () => {
      mocks.loadNewsCuration.mockResolvedValue({
        updatedAt: "2026-03-08T00:00:00.000Z",
        updatedBy: "admin-editor",
        items: [
          {
            id: "curated-1",
            ticker: "005930",
            headline: "\uC6B4\uC601 \uCCB4\uD06C",
            summary: "\uC694\uC57D \uBA54\uBAA8",
            source: "desk",
            url: "https://example.com/news",
            date: "2026-03-08",
            impact: "\uC8FC\uC758",
            pinned: true,
            operatorNote: "\uD655\uC778"
          }
        ]
      });

      const response = await getNewsCurationRoute(createRequest("http://localhost/api/admin/news-curation"));
      const payload = await parseJson<{
        document: {
          updatedBy: string;
          items: Array<{ headline: string; impact: string }>;
        };
      }>(response);

      expect(response.status).toBe(200);
      expect(payload.document.updatedBy).toBe("admin-editor");
      expect(payload.document.items[0]).toMatchObject({
        headline: "\uC6B4\uC601 \uCCB4\uD06C",
        impact: "\uC8FC\uC758"
      });
    });

    it("saves the curation document on POST", async () => {
      mocks.saveNewsCuration.mockResolvedValue({
        updatedAt: "2026-03-08T00:00:00.000Z",
        updatedBy: "admin-editor",
        items: [
          {
            id: "curated-1",
            ticker: "005930",
            headline: "\uC6B4\uC601 \uCCB4\uD06C",
            summary: "\uC694\uC57D",
            source: "desk",
            url: "https://example.com/news",
            date: "2026-03-08",
            impact: "\uC8FC\uC758",
            pinned: true,
            operatorNote: "\uD655\uC778"
          }
        ]
      });

      const response = await postNewsCurationRoute(
        createRequest("http://localhost/api/admin/news-curation", {
          method: "POST",
          body: JSON.stringify({
            updatedAt: "2026-03-08T00:00:00.000Z",
            updatedBy: "tester",
            items: [
              {
                id: "curated-1",
                ticker: "005930",
                headline: "\uC6B4\uC601 \uCCB4\uD06C",
                summary: "\uC694\uC57D \uBA54\uBAA8",
                source: "desk",
                url: "https://example.com/news",
                date: "2026-03-08",
                impact: "\uC8FC\uC758",
                pinned: true,
                operatorNote: "\uD655\uC778"
              }
            ]
          })
        })
      );
      const payload = await parseJson<{
        ok: boolean;
        requestId: string;
        document: { updatedBy: string; items: Array<{ impact: string }> };
      }>(response);

      expect(response.status).toBe(200);
      expect(mocks.saveNewsCuration).toHaveBeenCalledWith(
        {
          updatedAt: "2026-03-08T00:00:00.000Z",
          updatedBy: "tester",
          items: [
            {
              id: "curated-1",
              ticker: "005930",
              headline: "\uC6B4\uC601 \uCCB4\uD06C",
              summary: "\uC694\uC57D \uBA54\uBAA8",
              source: "desk",
              url: "https://example.com/news",
              date: "2026-03-08",
              impact: "\uC8FC\uC758",
              pinned: true,
              operatorNote: "\uD655\uC778"
            }
          ]
        },
        "admin-editor",
        "req-test"
      );
      expect(payload).toMatchObject({
        ok: true,
        requestId: "req-test",
        document: {
          updatedBy: "admin-editor",
          items: [{ impact: "\uC8FC\uC758" }]
        }
      });
    });
  });

  describe("admin portfolio profile route", () => {
    it("returns the current portfolio profile on GET", async () => {
      mocks.loadPortfolioProfileDocument.mockResolvedValue({
        name: "실전 운용",
        totalCapital: 50_000_000,
        availableCash: 12_000_000,
        maxRiskPerTradePercent: 0.8,
        maxConcurrentPositions: 4,
        sectorLimit: 2,
        positions: [
          {
            ticker: "005930",
            company: "Samsung Electronics",
            sector: "Semiconductor",
            quantity: 10,
            averagePrice: 71_000,
            enteredAt: "2026-03-20"
          }
        ],
        updatedAt: "2026-03-08T00:00:00.000Z",
        updatedBy: "admin-editor"
      });

      const response = await getPortfolioProfileRoute(createRequest("http://localhost/api/admin/portfolio-profile"));
      const payload = await parseJson<{
        ok: boolean;
        requestId: string;
        profile: { name: string; positions: Array<{ ticker: string; quantity: number }> };
      }>(response);

      expect(response.status).toBe(200);
      expect(mocks.loadPortfolioProfileDocument).toHaveBeenCalledTimes(1);
      expect(payload).toMatchObject({
        ok: true,
        requestId: "req-test",
        profile: {
          name: "실전 운용",
          positions: [{ ticker: "005930", quantity: 10 }]
        }
      });
    });

    it("normalizes and saves the portfolio profile on POST", async () => {
      mocks.savePortfolioProfileDocument.mockResolvedValue({
        name: "실전 운용",
        totalCapital: 50_000_000,
        availableCash: 12_000_000,
        maxRiskPerTradePercent: 0.8,
        maxConcurrentPositions: 4,
        sectorLimit: 2,
        positions: [
          {
            ticker: "005930",
            company: "Samsung Electronics",
            sector: "Semiconductor",
            quantity: 10,
            averagePrice: 71_000,
            enteredAt: "2026-03-20"
          }
        ],
        updatedAt: "2026-03-08T00:00:00.000Z",
        updatedBy: "admin-dashboard"
      });

      const response = await postPortfolioProfileRoute(
        createRequest("http://localhost/api/admin/portfolio-profile", {
          method: "POST",
          body: JSON.stringify({
            name: "실전 운용",
            totalCapital: 50_000_000,
            availableCash: 12_000_000,
            maxRiskPerTradePercent: 0.8,
            maxConcurrentPositions: 4,
            sectorLimit: 2,
            positions: [
              {
                ticker: "005930",
                quantity: 10,
                averagePrice: 71_000,
                enteredAt: "2026-03-20",
                note: "core"
              }
            ]
          })
        })
      );
      const payload = await parseJson<{
        ok: boolean;
        requestId: string;
        profile: { name: string; updatedBy: string; positions: Array<{ ticker: string; company: string }> };
      }>(response);

      expect(response.status).toBe(200);
      expect(mocks.savePortfolioProfileDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "실전 운용",
          totalCapital: 50_000_000,
          availableCash: 12_000_000,
          maxRiskPerTradePercent: 0.8,
          maxConcurrentPositions: 4,
          sectorLimit: 2,
          positions: [
            {
              ticker: "005930",
              quantity: 10,
              averagePrice: 71_000,
              enteredAt: "2026-03-20",
              note: "core"
            }
          ],
          updatedBy: "admin-dashboard"
        })
      );
      expect(mocks.recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "portfolio_profile_saved",
          status: "success",
          requestId: "req-test"
        })
      );
      expect(payload).toMatchObject({
        ok: true,
        requestId: "req-test",
        profile: {
          name: "실전 운용",
          updatedBy: "admin-dashboard",
          positions: [
            {
              ticker: "005930",
              company: "Samsung Electronics"
            }
          ]
        }
      });
    });
  });

  describe("admin watchlist route", () => {
    it("returns featured symbols, watchlist entries, and suggestions on GET", async () => {
      mocks.getFeaturedSymbols.mockReturnValue([
        {
          ticker: "005930",
          company: "Samsung"
        }
      ]);
      mocks.listWatchlistEntries.mockResolvedValue([{ ticker: "005930", company: "Samsung" }]);
      mocks.getSymbolSuggestionByTicker.mockReturnValue({
        ticker: "005930",
        newsQuery: "Samsung",
        newsQueries: ["Samsung"]
      });

      const response = await getWatchlistRoute(createRequest("http://localhost/api/admin/watchlist"));
      const payload = await parseJson<{
        items: Array<{ ticker: string; company: string }>;
        watchlist: Array<{ ticker: string; company: string }>;
        syncStatuses: Record<string, { state: string }>;
        suggestions: Record<string, { ticker: string; newsQuery: string }>;
      }>(response);

      expect(response.status).toBe(200);
      expect(mocks.getFeaturedSymbols).toHaveBeenCalledWith(12);
      expect(mocks.searchSymbols).not.toHaveBeenCalled();
      expect(payload).toMatchObject({
        items: [{ ticker: "005930", company: "Samsung" }],
        watchlist: [{ ticker: "005930", company: "Samsung" }],
        syncStatuses: {}
      });
      expect(payload.suggestions["005930"]).toMatchObject({
        ticker: "005930",
        newsQuery: "Samsung"
      });
    });

    it("adds a symbol and writes an audit log on POST", async () => {
      mocks.searchSymbols.mockReturnValue([
        {
          ticker: "005930",
          company: "Samsung",
          aliases: ["SEC"],
          sector: "Semiconductor",
          market: "KOSPI",
          status: "ready",
          newsQuery: "Samsung",
          newsQueries: ["Samsung"],
          newsQueriesKr: ['"Samsung" stock'],
          requiredKeywords: ["Samsung"],
          contextKeywords: ["Semiconductor"],
          blockedKeywords: [],
          preferredDomains: [],
          blockedDomains: [],
          minArticleScore: 12,
          dartCorpCode: "00126380"
        }
      ]);
      mocks.addSymbolToWatchlist.mockResolvedValue({
        added: true,
        entry: { ticker: "005930", company: "Samsung" },
        estimate: "ok",
        timings: { pipelineMs: 100, ingestMs: 50, totalMs: 150 }
      });

      const response = await postWatchlistRoute(
        createRequest("http://localhost/api/admin/watchlist", {
          method: "POST",
          body: JSON.stringify({ ticker: "005930" })
        })
      );
      const payload = await parseJson<{
        ok: boolean;
        requestId: string;
        result: { added: boolean };
      }>(response);

      expect(response.status).toBe(200);
      expect(mocks.addSymbolToWatchlist).toHaveBeenCalledWith(expect.objectContaining({ ticker: "005930", company: "Samsung" }));
      expect(mocks.recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "watchlist_add",
          status: "success",
          requestId: "req-test"
        })
      );
      expect(payload).toMatchObject({
        ok: true,
        requestId: "req-test",
        result: { added: true }
      });
    });

    it("normalizes watchlist metadata updates before calling the manager", async () => {
      mocks.getSymbolSuggestionByTicker.mockReturnValue({
        ticker: "005930",
        company: "Samsung",
        sector: "Semiconductor",
        market: "KOSPI",
        newsQuery: "Samsung",
        newsQueries: ["Samsung", "Samsung Electronics"],
        newsQueriesKr: ['"Samsung" stock'],
        requiredKeywords: ["Samsung"],
        contextKeywords: ["Semiconductor"],
        blockedKeywords: [],
        preferredDomains: ["hankyung.com"],
        blockedDomains: [],
        minArticleScore: 12,
        dartCorpCode: "00126380"
      });
      mocks.updateWatchlistEntry.mockResolvedValue({
        updated: true,
        entry: { ticker: "005930" },
        previousEntry: { ticker: "005930" },
        changes: [{ field: "newsQuery", before: "A", after: "B" }],
        timings: null
      });

      const response = await putWatchlistRoute(
        createRequest("http://localhost/api/admin/watchlist", {
          method: "PUT",
          body: JSON.stringify({
            ticker: "005930",
            sector: " Semiconductor ",
            newsQuery: " Samsung ",
            dartCorpCode: "00126380",
            requiredKeywords: ["Samsung", ""],
            contextKeywords: ["Semiconductor", ""],
            blockedKeywords: ["Rumor", ""],
            blockedDomains: ["spam.com", ""],
            preferredDomains: ["hankyung.com", ""],
            minArticleScore: 20,
            rerunPipeline: false
          })
        })
      );
      const payload = await parseJson<{
        ok: boolean;
        requestId: string;
        result: { updated: boolean };
      }>(response);

      expect(response.status).toBe(200);
      expect(mocks.updateWatchlistEntry).toHaveBeenCalledWith(
        "005930",
        {
          sector: "Semiconductor",
          newsQuery: "Samsung",
          dartCorpCode: "00126380",
          requiredKeywords: ["Samsung"],
          contextKeywords: ["Semiconductor"],
          blockedKeywords: ["Rumor"],
          blockedDomains: ["spam.com"],
          preferredDomains: ["hankyung.com"],
          minArticleScore: 20,
          newsQueries: ["Samsung", "Samsung Electronics"],
          newsQueriesKr: ['"Samsung" 주식', '"Samsung" Semiconductor', '"Samsung" 실적']
        },
        { rerunPipeline: false }
      );
      expect(mocks.recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "watchlist_update",
          status: "success",
          requestId: "req-test"
        })
      );
      expect(payload).toMatchObject({
        ok: true,
        requestId: "req-test",
        result: { updated: true }
      });
    });
  });
});
