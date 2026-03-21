"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { Banner, buildWatchlistChanges } from "@/components/admin/dashboard-shared";
import type {
  AccessStatsReportPayload,
  AdminStatusPayload,
  AuditItem,
  AutoHealReportPayload,
  DailyCycleReportPayload,
  DatabaseStorageReportPayload,
  HealthPayload,
  NewsFetchReportPayload,
  OperationalIncident,
  OpsHealthReportPayload,
  PopupNoticeDocument,
  PostLaunchHistoryEntryPayload,
  RuntimeStorageReportPayload,
  SnapshotGenerationReportPayload,
  SymbolSearchItem,
  ThresholdAdviceReportPayload,
  UniverseCandidateReview,
  UniverseDailyCandidates,
  UniverseReviewStatus,
  WatchlistEntry,
  WatchlistSyncStatus
} from "@/components/admin/dashboard-types";
import { PopupNoticeTab } from "@/components/admin/popup-notice-tab";
import { StatusTab } from "@/components/admin/status-tab";
import { WatchlistTab } from "@/components/admin/watchlist-tab";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ENABLED_TABS = new Set(["status", "popup", "watchlist"]);

export function AdminDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState("");
  const [tab, setTab] = useState("status");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [sectionWarnings, setSectionWarnings] = useState<Array<{ label: string; message: string }>>([]);
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [incidents, setIncidents] = useState<OperationalIncident[]>([]);
  const [opsHealthReport, setOpsHealthReport] = useState<OpsHealthReportPayload | null>(null);
  const [dailyCycleReport, setDailyCycleReport] = useState<DailyCycleReportPayload | null>(null);
  const [autoHealReport, setAutoHealReport] = useState<AutoHealReportPayload | null>(null);
  const [newsFetchReport, setNewsFetchReport] = useState<NewsFetchReportPayload | null>(null);
  const [snapshotGenerationReport, setSnapshotGenerationReport] = useState<SnapshotGenerationReportPayload | null>(null);
  const [postLaunchHistory, setPostLaunchHistory] = useState<PostLaunchHistoryEntryPayload[]>([]);
  const [thresholdAdviceReport, setThresholdAdviceReport] = useState<ThresholdAdviceReportPayload | null>(null);
  const [accessStatsReport, setAccessStatsReport] = useState<AccessStatsReportPayload | null>(null);
  const [runtimeStorageReport, setRuntimeStorageReport] = useState<RuntimeStorageReportPayload | null>(null);
  const [databaseStorageReport, setDatabaseStorageReport] = useState<DatabaseStorageReportPayload | null>(null);
  const [audits, setAudits] = useState<AuditItem[]>([]);
  const [dailyCandidates, setDailyCandidates] = useState<UniverseDailyCandidates | null>(null);
  const [popupNotice, setPopupNotice] = useState<PopupNoticeDocument | null>(null);
  const [symbolQuery, setSymbolQuery] = useState("");
  const [symbolResults, setSymbolResults] = useState<SymbolSearchItem[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [watchlistBaseline, setWatchlistBaseline] = useState<WatchlistEntry[]>([]);
  const [watchlistSyncStatuses, setWatchlistSyncStatuses] = useState<Record<string, WatchlistSyncStatus>>({});
  const [activeWatchlistTicker, setActiveWatchlistTicker] = useState("");
  const [returnTo, setReturnTo] = useState("");

  const authHeaders = useMemo(
    () => (token.trim() ? { Authorization: `Bearer ${token.trim()}` } : undefined),
    [token]
  );
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

  function getLoadErrorMessage(loadError: unknown) {
    return loadError instanceof Error ? loadError.message : "Unexpected section load failure";
  }

  useEffect(() => {
    const nextTab = searchParams.get("tab");
    const query = searchParams.get("q");
    const nextReturnTo = searchParams.get("returnTo");

    if (nextTab && ENABLED_TABS.has(nextTab)) {
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
      const baseMessage = json?.error?.message ?? json?.message ?? `요청이 실패했습니다. (${response.status})`;
      const withCode = json?.code ? `${baseMessage} [${json.code}]` : baseMessage;
      throw new Error(json?.requestId ? `${withCode} (request: ${json.requestId})` : withCode);
    }

    return json;
  }

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    setMessage(null);
    setSectionWarnings([]);

    try {
      if (!authHeaders) {
        setHasAdminAccess(false);
        setHealth(await fetchJson<HealthPayload>("/api/health"));
        setIncidents([]);
        setOpsHealthReport(null);
        setDailyCycleReport(null);
        setAutoHealReport(null);
        setNewsFetchReport(null);
        setSnapshotGenerationReport(null);
        setPostLaunchHistory([]);
        setThresholdAdviceReport(null);
        setAccessStatsReport(null);
        setRuntimeStorageReport(null);
        setDatabaseStorageReport(null);
        setAudits([]);
        setDailyCandidates(null);
        setPopupNotice(null);
        setSymbolResults([]);
        setWatchlist([]);
        setWatchlistBaseline([]);
        setWatchlistSyncStatuses({});
        setActiveWatchlistTicker("");
        setMessage("관리자 비밀번호를 입력하면 운영 기능을 사용할 수 있습니다.");
        return;
      }

      const statusJson = await fetchJson<AdminStatusPayload>("/api/admin/status", { headers: authHeaders });
      setHasAdminAccess(true);
      setHealth(statusJson.health);
      setIncidents(statusJson.incidents ?? []);
      setOpsHealthReport(statusJson.opsHealthReport ?? null);
      setDailyCycleReport(statusJson.dailyCycleReport ?? null);
      setAutoHealReport(statusJson.autoHealReport ?? null);
      setNewsFetchReport(statusJson.newsFetchReport ?? null);
      setSnapshotGenerationReport(statusJson.snapshotGenerationReport ?? null);
      setPostLaunchHistory(statusJson.postLaunchHistory ?? []);
      setThresholdAdviceReport(statusJson.thresholdAdviceReport ?? null);
      setAccessStatsReport(statusJson.accessStatsReport ?? null);
      setRuntimeStorageReport(statusJson.runtimeStorageReport ?? null);
      setDatabaseStorageReport(statusJson.databaseStorageReport ?? null);

      const [auditResult, popupResult, watchlistResult, universeResult] = await Promise.allSettled([
        fetchJson<{ items: AuditItem[] }>("/api/admin/audit", { headers: authHeaders }),
        fetchJson<{ document: PopupNoticeDocument }>("/api/admin/popup-notice", { headers: authHeaders }),
        fetchJson<{ items: SymbolSearchItem[]; watchlist: WatchlistEntry[]; syncStatuses: Record<string, WatchlistSyncStatus> }>(
          `/api/admin/watchlist${symbolQuery.trim() ? `?q=${encodeURIComponent(symbolQuery.trim())}` : ""}`,
          { headers: authHeaders }
        ),
        fetchJson<{
          dailyCandidates: UniverseDailyCandidates | null;
          reviews: Record<string, UniverseCandidateReview>;
        }>("/api/admin/universe", { headers: authHeaders })
      ]);

      const warnings: Array<{ label: string; message: string }> = (statusJson.statusWarnings ?? []).map((item) => ({
        label: "status",
        message: item
      }));

      if (auditResult.status === "fulfilled") {
        setAudits(auditResult.value.items ?? []);
      } else {
        warnings.push({ label: "audit", message: getLoadErrorMessage(auditResult.reason) });
      }

      if (popupResult.status === "fulfilled") {
        setPopupNotice(popupResult.value.document);
      } else {
        warnings.push({ label: "popup-notice", message: getLoadErrorMessage(popupResult.reason) });
      }

      if (watchlistResult.status === "fulfilled") {
        setSymbolResults(watchlistResult.value.items ?? []);
        setWatchlist(watchlistResult.value.watchlist ?? []);
        setWatchlistBaseline(watchlistResult.value.watchlist ?? []);
        setWatchlistSyncStatuses(watchlistResult.value.syncStatuses ?? {});
        setActiveWatchlistTicker((current) => current || watchlistResult.value.watchlist?.[0]?.ticker || "");
      } else {
        warnings.push({ label: "manual-override", message: getLoadErrorMessage(watchlistResult.reason) });
      }

      if (universeResult.status === "fulfilled") {
        setDailyCandidates(universeResult.value.dailyCandidates ?? null);
      } else {
        warnings.push({ label: "universe", message: getLoadErrorMessage(universeResult.reason) });
      }

      setSectionWarnings(warnings);
      setMessage("운영 데이터를 불러왔습니다.");
    } catch (loadError) {
      setHasAdminAccess(false);
      setError(loadError instanceof Error ? loadError.message : "운영 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function savePopupNotice() {
    if (!authHeaders || !popupNotice) {
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const json = await fetchJson<{ document: PopupNoticeDocument }>("/api/admin/popup-notice", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(popupNotice)
      });
      setPopupNotice(json.document);
      setMessage("팝업 공지 설정을 저장했습니다.");
      await loadDashboard();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "팝업 공지 저장에 실패했습니다.");
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
        json.result?.added
          ? `예외 편입을 완료했습니다. ${json.result?.estimate ?? ""}`.trim()
          : "이미 예외 편입 목록에 포함된 종목입니다."
      );

      await loadDashboard();

      if (json.result?.added && returnTo.startsWith("/analysis/")) {
        router.push(returnTo);
      }
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "예외 편입 종목 추가에 실패했습니다.");
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
        body: JSON.stringify({ ticker, note: "예외 편입 실행" })
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
          ? `${ticker} 후보를 예외 편입 목록에 추가하고 후속 파이프라인까지 반영했습니다.`
          : `${ticker} 후보는 이미 예외 편입 목록에 있어 편입 상태만 정리했습니다.`
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
      setMessage("예외 편입 메타데이터를 저장했습니다.");
      await loadDashboard();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "예외 편입 메타데이터 저장에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>운영 콘솔 접속</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="mb-2 text-sm text-muted-foreground">
              관리자 비밀번호를 입력하면 시스템 운영 상태와 공지, 예외 편입 설정을 확인할 수 있습니다.
            </p>
            <Input type="password" placeholder="관리자 비밀번호" value={token} onChange={(event) => setToken(event.target.value)} />
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
        </CardContent>
      </Card>

      {message ? <Banner tone="success" message={message} /> : null}
      {error ? <Banner tone="error" message={error} /> : null}

      {hasAdminAccess && sectionWarnings.length ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle>Admin section warnings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sectionWarnings.map((warning) => (
              <div key={warning.label} className="rounded-[20px] border border-destructive/20 bg-background/80 p-4">
                <p className="text-sm font-semibold text-foreground">{warning.label}</p>
                <p className="mt-2 text-sm text-muted-foreground">{warning.message}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {hasAdminAccess ? (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="status">상태</TabsTrigger>
            <TabsTrigger value="popup">팝업 공지</TabsTrigger>
            <TabsTrigger value="watchlist">예외 편입</TabsTrigger>
          </TabsList>

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
              accessStatsReport={accessStatsReport}
              runtimeStorageReport={runtimeStorageReport}
              databaseStorageReport={databaseStorageReport}
              dailyCandidates={dailyCandidates}
              watchlistTickers={watchlistTickers}
              authToken={token}
              onPromoteCandidate={(ticker) => void promoteUniverseCandidate(ticker)}
              onSaveReview={(ticker, status, note) => void saveUniverseReview(ticker, status, note)}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="popup">
            <PopupNoticeTab
              document={popupNotice}
              setDocument={(updater) => setPopupNotice((current) => (current ? updater(current) : current))}
              onSave={() => void savePopupNotice()}
              disabled={loading || !popupNotice}
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
        </Tabs>
      ) : null}
    </div>
  );
}
