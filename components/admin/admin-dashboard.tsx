"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { DiffTab } from "@/components/admin/diff-tab";
import {
  APPROVAL_STAGE_OPTIONS,
  Banner,
  PublishDialog,
  buildWatchlistChanges,
  createClientId
} from "@/components/admin/dashboard-shared";
import type {
  AdminStatusPayload,
  AuditItem,
  AutoHealReportPayload,
  CuratedNewsItem,
  DailyCycleReportPayload,
  EditorialCatalogItem,
  EditorialDiffItem,
  EditorialDraftDocument,
  EditorialDraftItem,
  HealthPayload,
  NewsCurationDocument,
  NewsFetchReportPayload,
  OperationalIncident,
  OpsHealthReportPayload,
  PostLaunchHistoryEntryPayload,
  PublishHistoryItem,
  SnapshotGenerationReportPayload,
  SymbolSearchItem,
  ThresholdAdviceReportPayload,
  UniverseCandidateReview,
  UniverseDailyCandidates,
  UniverseReviewStatus,
  WatchlistEntry,
  WatchlistSyncStatus
} from "@/components/admin/dashboard-types";
import { EditorialTab } from "@/components/admin/editorial-tab";
import { HistoryTab } from "@/components/admin/history-tab";
import { NewsTab } from "@/components/admin/news-tab";
import { StatusTab } from "@/components/admin/status-tab";
import { WatchlistTab } from "@/components/admin/watchlist-tab";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function AdminDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState("");
  const [tab, setTab] = useState("editorial");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [incidents, setIncidents] = useState<OperationalIncident[]>([]);
  const [opsHealthReport, setOpsHealthReport] = useState<OpsHealthReportPayload | null>(null);
  const [dailyCycleReport, setDailyCycleReport] = useState<DailyCycleReportPayload | null>(null);
  const [autoHealReport, setAutoHealReport] = useState<AutoHealReportPayload | null>(null);
  const [newsFetchReport, setNewsFetchReport] = useState<NewsFetchReportPayload | null>(null);
  const [snapshotGenerationReport, setSnapshotGenerationReport] = useState<SnapshotGenerationReportPayload | null>(null);
  const [postLaunchHistory, setPostLaunchHistory] = useState<PostLaunchHistoryEntryPayload[]>([]);
  const [thresholdAdviceReport, setThresholdAdviceReport] = useState<ThresholdAdviceReportPayload | null>(null);
  const [audits, setAudits] = useState<AuditItem[]>([]);
  const [dailyCandidates, setDailyCandidates] = useState<UniverseDailyCandidates | null>(null);
  const [draft, setDraft] = useState<EditorialDraftDocument | null>(null);
  const [catalog, setCatalog] = useState<EditorialCatalogItem[]>([]);
  const [diff, setDiff] = useState<EditorialDiffItem[]>([]);
  const [history, setHistory] = useState<PublishHistoryItem[]>([]);
  const [news, setNews] = useState<NewsCurationDocument | null>(null);
  const [activeTicker, setActiveTicker] = useState("");
  const [symbolQuery, setSymbolQuery] = useState("");
  const [symbolResults, setSymbolResults] = useState<SymbolSearchItem[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [watchlistBaseline, setWatchlistBaseline] = useState<WatchlistEntry[]>([]);
  const [watchlistSyncStatuses, setWatchlistSyncStatuses] = useState<Record<string, WatchlistSyncStatus>>({});
  const [activeWatchlistTicker, setActiveWatchlistTicker] = useState("");
  const [returnTo, setReturnTo] = useState("");
  const [approvalStage, setApprovalStage] = useState<(typeof APPROVAL_STAGE_OPTIONS)[number]["value"]>("final_publish");
  const [rollbackReason, setRollbackReason] = useState("manual rollback");

  const authHeaders = useMemo(() => (token.trim() ? { Authorization: `Bearer ${token.trim()}` } : undefined), [token]);
  const activeDraftItem = useMemo(
    () => draft?.items.find((item) => item.ticker === activeTicker) ?? null,
    [activeTicker, draft]
  );
  const activeNews = useMemo(() => news?.items.filter((item) => item.ticker === activeTicker) ?? [], [activeTicker, news]);
  const activeWatchlist = useMemo(
    () => watchlist.find((item) => item.ticker === activeWatchlistTicker) ?? null,
    [activeWatchlistTicker, watchlist]
  );
  const baselineWatchlist = useMemo(
    () => watchlistBaseline.find((item) => item.ticker === activeWatchlistTicker) ?? null,
    [activeWatchlistTicker, watchlistBaseline]
  );
  const watchlistChanges = useMemo(() => {
    if (!activeWatchlist || !baselineWatchlist) {
      return [];
    }

    return buildWatchlistChanges(baselineWatchlist, activeWatchlist);
  }, [activeWatchlist, baselineWatchlist]);
  const watchlistTickers = useMemo(() => watchlist.map((item) => item.ticker), [watchlist]);

  useEffect(() => {
    const nextTab = searchParams.get("tab");
    const query = searchParams.get("q");
    const nextReturnTo = searchParams.get("returnTo");

    if (nextTab) {
      setTab(nextTab);
    }
    if (query) {
      setSymbolQuery(query);
    }
    if (nextReturnTo) {
      setReturnTo(nextReturnTo);
    }
  }, [searchParams]);

  async function fetchJson<T>(input: RequestInfo, init?: RequestInit) {
    const response = await fetch(input, { ...init, cache: "no-store" });
    const json = (await response.json().catch(() => ({}))) as T & {
      error?: { message?: string };
      message?: string;
      code?: string;
      requestId?: string;
    };

    if (!response.ok) {
      const message = json?.error?.message ?? json?.message ?? `요청이 실패했습니다. (${response.status})`;
      const withCode = json?.code ? `${message} [${json.code}]` : message;
      throw new Error(json?.requestId ? `${withCode} (request: ${json.requestId})` : withCode);
    }

    if (!response.ok) {
      throw new Error(json?.error?.message ?? `요청이 실패했습니다. (${response.status})`);
    }

    return json;
  }

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (!authHeaders) {
        setHealth(await fetchJson<HealthPayload>("/api/health"));
        setOpsHealthReport(null);
        setDailyCycleReport(null);
        setAutoHealReport(null);
        setNewsFetchReport(null);
        setSnapshotGenerationReport(null);
        setPostLaunchHistory([]);
        setThresholdAdviceReport(null);
        setMessage("관리자 토큰을 입력하면 운영 데이터를 불러옵니다.");
        return;
      }

      const [statusJson, auditJson, draftJson, newsJson, watchlistJson, universeJson] = await Promise.all([
        fetchJson<AdminStatusPayload>("/api/admin/status", { headers: authHeaders }),
        fetchJson<{ items: AuditItem[] }>("/api/admin/audit", { headers: authHeaders }),
        fetchJson<{
          draft: EditorialDraftDocument;
          catalog: EditorialCatalogItem[];
          diff: EditorialDiffItem[];
          publishHistory: PublishHistoryItem[];
        }>("/api/admin/editorial-draft", { headers: authHeaders }),
        fetchJson<{ document: NewsCurationDocument }>("/api/admin/news-curation", { headers: authHeaders }),
        fetchJson<{ items: SymbolSearchItem[]; watchlist: WatchlistEntry[]; syncStatuses: Record<string, WatchlistSyncStatus> }>(
          `/api/admin/watchlist${symbolQuery.trim() ? `?q=${encodeURIComponent(symbolQuery.trim())}` : ""}`,
          { headers: authHeaders }
        ),
        fetchJson<{
          dailyCandidates: UniverseDailyCandidates | null;
          reviews: Record<string, UniverseCandidateReview>;
        }>("/api/admin/universe", { headers: authHeaders })
      ]);

      setHealth(statusJson.health);
      setIncidents(statusJson.incidents ?? []);
      setOpsHealthReport(statusJson.opsHealthReport ?? null);
      setDailyCycleReport(statusJson.dailyCycleReport ?? null);
      setAutoHealReport(statusJson.autoHealReport ?? null);
      setNewsFetchReport(statusJson.newsFetchReport ?? null);
      setSnapshotGenerationReport(statusJson.snapshotGenerationReport ?? null);
      setPostLaunchHistory(statusJson.postLaunchHistory ?? []);
      setThresholdAdviceReport(statusJson.thresholdAdviceReport ?? null);
      setAudits(auditJson.items ?? []);
      setDailyCandidates(universeJson.dailyCandidates ?? null);
      setDraft(draftJson.draft);
      setCatalog(draftJson.catalog ?? []);
      setDiff(draftJson.diff ?? []);
      setHistory(draftJson.publishHistory ?? []);
      setNews(newsJson.document);
      setSymbolResults(watchlistJson.items ?? []);
      setWatchlist(watchlistJson.watchlist ?? []);
      setWatchlistBaseline(watchlistJson.watchlist ?? []);
      setWatchlistSyncStatuses(watchlistJson.syncStatuses ?? {});
      setActiveTicker((current) => current || draftJson.catalog?.[0]?.ticker || "");
      setActiveWatchlistTicker((current) => current || watchlistJson.watchlist?.[0]?.ticker || "");
      setMessage("운영 데이터를 불러왔습니다.");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "운영 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function saveDraft() {
    if (!authHeaders || !draft) {
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      await fetchJson("/api/admin/editorial-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(draft)
      });
      setMessage("초안을 저장했습니다.");
      await loadDashboard();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "초안 저장에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function publishDraft() {
    if (!authHeaders) {
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const result = await fetchJson<{ publish: { diffCount: number } }>("/api/admin/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ approvalStage, ingestToPostgres: true })
      });
      setMessage(`발행을 완료했습니다. 변경 종목 ${result.publish.diffCount}건`);
      await loadDashboard();
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "발행에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function saveNews() {
    if (!authHeaders || !news) {
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      await fetchJson("/api/admin/news-curation", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(news)
      });
      setMessage("뉴스 큐레이션을 저장했습니다.");
      await loadDashboard();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "뉴스 큐레이션 저장에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function rollbackHistory(historyId: string) {
    if (!authHeaders) {
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      await fetchJson("/api/admin/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ historyId, ingestToPostgres: true, rollbackReason })
      });
      setMessage("선택한 발행 이력으로 롤백했습니다.");
      await loadDashboard();
    } catch (rollbackError) {
      setError(rollbackError instanceof Error ? rollbackError.message : "롤백에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function addWatchlistSymbol(ticker: string) {
    if (!authHeaders) {
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const json = await fetchJson<{ result?: { added?: boolean; estimate?: string } }>("/api/admin/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ ticker })
      });

      setMessage(
        json.result?.added ? `종목 추가 완료. ${json.result?.estimate ?? ""}`.trim() : "이미 watchlist에 포함된 종목입니다."
      );

      await loadDashboard();

      if (json.result?.added && returnTo.startsWith("/analysis/")) {
        router.push(returnTo);
      }
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "watchlist 종목 추가에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function saveUniverseReview(ticker: string, status: UniverseReviewStatus, note: string) {
    if (!authHeaders) {
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const json = await fetchJson<{ review: UniverseCandidateReview }>("/api/admin/universe", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ ticker, status, note })
      });

      setDailyCandidates((current) =>
        current
          ? {
              ...current,
              topCandidates: current.topCandidates.map((candidate) =>
                candidate.ticker === ticker ? { ...candidate, review: json.review } : candidate
              )
            }
          : current
      );
      setMessage(`${ticker} 후보 검토 상태를 저장했습니다.`);
      await loadDashboard();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "후보 검토 상태 저장에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function promoteUniverseCandidate(ticker: string) {
    if (!authHeaders) {
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const json = await fetchJson<{
        review: UniverseCandidateReview;
        watchlist: { added: boolean; estimate?: string };
      }>("/api/admin/universe", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ ticker, note: "watchlist 편입 실행" })
      });

      setDailyCandidates((current) =>
        current
          ? {
              ...current,
              topCandidates: current.topCandidates.map((candidate) =>
                candidate.ticker === ticker ? { ...candidate, review: json.review } : candidate
              )
            }
          : current
      );
      setTab("watchlist");
      setActiveWatchlistTicker(ticker);
      setMessage(
        json.watchlist.added
          ? `${ticker} 후보를 watchlist에 편입하고 후속 파이프라인까지 반영했습니다.`
          : `${ticker} 후보는 이미 watchlist에 있어 편입 상태만 정리했습니다.`
      );
      await loadDashboard();
    } catch (promoteError) {
      setError(promoteError instanceof Error ? promoteError.message : "후보 편입 처리에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function saveWatchlistMetadata() {
    if (!authHeaders || !activeWatchlist) {
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      await fetchJson("/api/admin/watchlist", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ ...activeWatchlist, rerunPipeline: true })
      });
      setMessage("watchlist 메타데이터를 저장했습니다.");
      await loadDashboard();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "watchlist 저장에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function updateDraftItem(ticker: string, updater: (item: EditorialDraftItem) => EditorialDraftItem) {
    setDraft((current) =>
      current
        ? {
            ...current,
            items: current.items.map((item) => (item.ticker === ticker ? updater(item) : item))
          }
        : current
    );
  }

  function updateNewsItem(id: string, updater: (item: CuratedNewsItem) => CuratedNewsItem) {
    setNews((current) =>
      current
        ? {
            ...current,
            items: current.items.map((item) => (item.id === id ? updater(item) : item))
          }
        : current
    );
  }

  function removeNewsItem(id: string) {
    setNews((current) =>
      current
        ? {
            ...current,
            items: current.items.filter((item) => item.id !== id)
          }
        : current
    );
  }

  function addNewsItem() {
    if (!activeTicker) {
      return;
    }

    const nextItem: CuratedNewsItem = {
      id: createClientId(),
      ticker: activeTicker,
      headline: "",
      summary: "",
      source: "",
      url: "https://",
      date: new Date().toISOString().slice(0, 10),
      impact: "중립",
      pinned: false,
      operatorNote: ""
    };

    setNews((current) => ({
      updatedAt: current?.updatedAt ?? new Date(0).toISOString(),
      updatedBy: current?.updatedBy ?? "system",
      items: [nextItem, ...(current?.items ?? [])]
    }));
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>운영 접근 인증</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[1.5fr_auto_auto] lg:items-end">
          <div>
            <p className="mb-2 text-sm text-muted-foreground">`SWING_RADAR_ADMIN_TOKEN`을 입력하면 운영 기능을 사용할 수 있습니다.</p>
            <Input type="password" placeholder="관리자 토큰" value={token} onChange={(event) => setToken(event.target.value)} />
          </div>
          <Button
            onClick={() => {
              void loadDashboard();
            }}
            disabled={loading}
            variant="secondary"
          >
            <RefreshCw className="h-4 w-4" />
            새로고침
          </Button>
          <PublishDialog
            approvalStage={approvalStage}
            onApprovalStageChange={setApprovalStage}
            onConfirm={() => void publishDraft()}
            disabled={loading || !draft}
          />
        </CardContent>
      </Card>

      {message ? <Banner tone="success" message={message} /> : null}
      {error ? <Banner tone="error" message={error} /> : null}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="editorial">초안</TabsTrigger>
          <TabsTrigger value="news">뉴스</TabsTrigger>
          <TabsTrigger value="watchlist">워치리스트</TabsTrigger>
          <TabsTrigger value="diff">변경점</TabsTrigger>
          <TabsTrigger value="history">이력</TabsTrigger>
          <TabsTrigger value="status">상태</TabsTrigger>
        </TabsList>

        <TabsContent value="editorial">
          <EditorialTab
            catalog={catalog}
            activeTicker={activeTicker}
            setActiveTicker={setActiveTicker}
            activeDraftItem={activeDraftItem}
            updateDraftItem={updateDraftItem}
            onSave={() => void saveDraft()}
            disabled={loading || !draft}
          />
        </TabsContent>

        <TabsContent value="news">
          <NewsTab
            activeNews={activeNews}
            activeTicker={activeTicker}
            updateNewsItem={updateNewsItem}
            removeNewsItem={removeNewsItem}
            addNewsItem={addNewsItem}
            onSave={() => void saveNews()}
            disabled={loading || !news}
          />
        </TabsContent>

        <TabsContent value="watchlist">
          <WatchlistTab
            symbolQuery={symbolQuery}
            setSymbolQuery={setSymbolQuery}
            onSearch={() => void loadDashboard()}
            symbolResults={symbolResults}
            addWatchlistSymbol={(ticker) => void addWatchlistSymbol(ticker)}
            loading={loading}
            watchlist={watchlist}
            activeWatchlistTicker={activeWatchlistTicker}
            setActiveWatchlistTicker={setActiveWatchlistTicker}
            activeWatchlist={activeWatchlist}
            setWatchlist={setWatchlist}
            watchlistSyncStatuses={watchlistSyncStatuses}
            watchlistChanges={watchlistChanges}
            onSaveMetadata={() => void saveWatchlistMetadata()}
          />
        </TabsContent>

        <TabsContent value="diff">
          <DiffTab diff={diff} />
        </TabsContent>

        <TabsContent value="history">
          <HistoryTab
            history={history}
            rollbackReason={rollbackReason}
            onRollbackReasonChange={setRollbackReason}
            onRollback={(historyId) => void rollbackHistory(historyId)}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="status">
          <StatusTab
            health={health}
            incidents={incidents}
            audits={audits}
            opsHealthReport={opsHealthReport}
            dailyCycleReport={dailyCycleReport}
            autoHealReport={autoHealReport}
            newsFetchReport={newsFetchReport}
            snapshotGenerationReport={snapshotGenerationReport}
            postLaunchHistory={postLaunchHistory}
            thresholdAdviceReport={thresholdAdviceReport}
            dailyCandidates={dailyCandidates}
            watchlistTickers={watchlistTickers}
            onPromoteCandidate={(ticker) => void promoteUniverseCandidate(ticker)}
            onSaveReview={(ticker, status, note) => void saveUniverseReview(ticker, status, note)}
            loading={loading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
