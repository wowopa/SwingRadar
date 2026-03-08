import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/server/api-error";

const mocks = vi.hoisted(() => ({
  assertAdminRequest: vi.fn(),
  loadSnapshotBundleFromDisk: vi.fn(),
  ingestSnapshotBundle: vi.fn(),
  recordAuditLog: vi.fn(),
  publishEditorialDraft: vi.fn(),
  rollbackPublishedSnapshot: vi.fn(),
  listWatchlistEntries: vi.fn(),
  addSymbolToWatchlist: vi.fn(),
  updateWatchlistEntry: vi.fn(),
  getFeaturedSymbols: vi.fn(),
  getSymbolSuggestionByTicker: vi.fn(),
  searchSymbols: vi.fn()
}));

vi.mock("@/lib/server/admin-auth", () => ({
  assertAdminRequest: mocks.assertAdminRequest
}));

vi.mock("@/lib/server/postgres-ingest", () => ({
  loadSnapshotBundleFromDisk: mocks.loadSnapshotBundleFromDisk,
  ingestSnapshotBundle: mocks.ingestSnapshotBundle
}));

vi.mock("@/lib/server/audit-log", () => ({
  recordAuditLog: mocks.recordAuditLog
}));

vi.mock("@/lib/server/editorial-draft", () => ({
  publishEditorialDraft: mocks.publishEditorialDraft,
  rollbackPublishedSnapshot: mocks.rollbackPublishedSnapshot
}));

vi.mock("@/lib/server/watchlist-manager", () => ({
  listWatchlistEntries: mocks.listWatchlistEntries,
  addSymbolToWatchlist: mocks.addSymbolToWatchlist,
  updateWatchlistEntry: mocks.updateWatchlistEntry
}));

vi.mock("@/lib/symbols/master", () => ({
  getFeaturedSymbols: mocks.getFeaturedSymbols,
  getSymbolSuggestionByTicker: mocks.getSymbolSuggestionByTicker,
  searchSymbols: mocks.searchSymbols
}));

import { GET as getIngestRoute, POST as postIngestRoute } from "@/app/api/admin/ingest/route";
import { POST as postPublishRoute } from "@/app/api/admin/publish/route";
import { POST as postRollbackRoute } from "@/app/api/admin/rollback/route";
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

describe("admin routes", () => {
  let infoSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    mocks.assertAdminRequest.mockReturnValue(undefined);
    mocks.recordAuditLog.mockResolvedValue(undefined);
    mocks.loadSnapshotBundleFromDisk.mockResolvedValue({
      recommendations: { generatedAt: "2026-03-08T00:00:00.000Z", items: [], dailyScan: null },
      analysis: { generatedAt: "2026-03-08T00:00:00.000Z", items: [] },
      tracking: { generatedAt: "2026-03-08T00:00:00.000Z", history: [], details: {} }
    });
  });

  afterEach(() => {
    infoSpy.mockRestore();
  });

  describe("admin ingest route", () => {
    it("loads snapshots from disk when POST body is empty", async () => {
      mocks.ingestSnapshotBundle.mockResolvedValue({ recommendations: 0, analysis: 0, tracking: 0 });

      const response = await postIngestRoute(createRequest("http://localhost/api/admin/ingest", { method: "POST" }));
      const payload = await response.json();

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
      const payload = await response.json();

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
      const payload = await response.json();

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
      const payload = await response.json();

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

  describe("admin watchlist route", () => {
    it("returns featured symbols, watchlist entries, and suggestions on GET", async () => {
      mocks.getFeaturedSymbols.mockReturnValue([
        {
          ticker: "005930",
          company: "삼성전자"
        }
      ]);
      mocks.listWatchlistEntries.mockResolvedValue([{ ticker: "005930", company: "삼성전자" }]);
      mocks.getSymbolSuggestionByTicker.mockReturnValue({
        ticker: "005930",
        newsQuery: "삼성전자",
        newsQueries: ["삼성전자"]
      });

      const response = await getWatchlistRoute(createRequest("http://localhost/api/admin/watchlist"));
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(mocks.getFeaturedSymbols).toHaveBeenCalledWith(12);
      expect(mocks.searchSymbols).not.toHaveBeenCalled();
      expect(payload).toMatchObject({
        items: [{ ticker: "005930", company: "삼성전자" }],
        watchlist: [{ ticker: "005930", company: "삼성전자" }]
      });
      expect(payload.suggestions["005930"]).toMatchObject({
        ticker: "005930",
        newsQuery: "삼성전자"
      });
    });

    it("adds a symbol and writes an audit log on POST", async () => {
      mocks.searchSymbols.mockReturnValue([
        {
          ticker: "005930",
          company: "삼성전자",
          aliases: ["삼전"],
          sector: "반도체",
          market: "KOSPI",
          status: "ready",
          newsQuery: "삼성전자",
          newsQueries: ["삼성전자"],
          newsQueriesKr: ['"삼성전자" 주식'],
          requiredKeywords: ["삼성전자"],
          contextKeywords: ["반도체"],
          blockedKeywords: [],
          preferredDomains: [],
          blockedDomains: [],
          minArticleScore: 12,
          dartCorpCode: "00126380"
        }
      ]);
      mocks.addSymbolToWatchlist.mockResolvedValue({
        added: true,
        entry: { ticker: "005930", company: "삼성전자" },
        estimate: "ok",
        timings: { pipelineMs: 100, ingestMs: 50, totalMs: 150 }
      });

      const response = await postWatchlistRoute(
        createRequest("http://localhost/api/admin/watchlist", {
          method: "POST",
          body: JSON.stringify({ ticker: "005930" })
        })
      );
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(mocks.addSymbolToWatchlist).toHaveBeenCalledWith(expect.objectContaining({ ticker: "005930", company: "삼성전자" }));
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
        company: "삼성전자",
        sector: "반도체",
        market: "KOSPI",
        newsQuery: "삼성전자",
        newsQueries: ["삼성전자", "Samsung Electronics"],
        newsQueriesKr: ['"삼성전자" 주식'],
        requiredKeywords: ["삼성전자"],
        contextKeywords: ["반도체"],
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
            sector: " 반도체 ",
            newsQuery: " 삼성전자 ",
            dartCorpCode: "00126380",
            requiredKeywords: ["삼성전자", ""],
            contextKeywords: ["반도체", ""],
            blockedKeywords: ["루머", ""],
            blockedDomains: ["spam.com", ""],
            preferredDomains: ["hankyung.com", ""],
            minArticleScore: 20,
            rerunPipeline: false
          })
        })
      );
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(mocks.updateWatchlistEntry).toHaveBeenCalledWith(
        "005930",
        {
          sector: "반도체",
          newsQuery: "삼성전자",
          dartCorpCode: "00126380",
          requiredKeywords: ["삼성전자"],
          contextKeywords: ["반도체"],
          blockedKeywords: ["루머"],
          blockedDomains: ["spam.com"],
          preferredDomains: ["hankyung.com"],
          minArticleScore: 20,
          newsQueries: ["삼성전자", "Samsung Electronics"],
          newsQueriesKr: ['"삼성전자" 주식', '"삼성전자" 반도체', '"삼성전자" 실적']
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
