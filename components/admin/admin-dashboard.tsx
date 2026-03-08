"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { DiffTab } from "@/components/admin/diff-tab";
import { EditorialTab } from "@/components/admin/editorial-tab";
import { HistoryTab } from "@/components/admin/history-tab";
import { NewsTab } from "@/components/admin/news-tab";
import { StatusTab } from "@/components/admin/status-tab";
import { WatchlistTab } from "@/components/admin/watchlist-tab";
import { Banner, PublishDialog, APPROVAL_STAGE_OPTIONS, buildWatchlistChanges, createClientId } from "@/components/admin/dashboard-shared";
import type {
  AuditItem,
  CuratedNewsItem,
  EditorialCatalogItem,
  EditorialDiffItem,
  EditorialDraftDocument,
  EditorialDraftItem,
  HealthPayload,
  NewsCurationDocument,
  PublishHistoryItem,
  SymbolSearchItem,
  WatchlistEntry
} from "@/components/admin/dashboard-types";
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
  const [audits, setAudits] = useState<AuditItem[]>([]);
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
  const [activeWatchlistTicker, setActiveWatchlistTicker] = useState("");
  const [returnTo, setReturnTo] = useState("");
  const [approvalStage, setApprovalStage] = useState<(typeof APPROVAL_STAGE_OPTIONS)[number]["value"]>("final_publish");
  const [rollbackReason, setRollbackReason] = useState("manual rollback");

  const authHeaders = useMemo(() => (token.trim() ? { Authorization: `Bearer ${token.trim()}` } : undefined), [token]);
  const activeDraftItem = useMemo(
    () => draft?.items.find((item) => item.ticker === activeTicker) ?? null,
    [activeTicker, draft]
  );
  const activeNews = useMemo(
    () => news?.items.filter((item) => item.ticker === activeTicker) ?? [],
    [activeTicker, news]
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
    const json = (await response.json().catch(() => ({}))) as T & { error?: { message?: string } };

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
      setHealth(await fetchJson<HealthPayload>("/api/health"));

      if (!authHeaders) {
        setMessage("관리자 토큰을 입력하면 운영 데이터를 불러옵니다.");
        return;
      }

      const [auditJson, draftJson, newsJson, watchlistJson] = await Promise.all([
        fetchJson<{ items: AuditItem[] }>("/api/admin/audit", { headers: authHeaders }),
        fetchJson<{
          draft: EditorialDraftDocument;
          catalog: EditorialCatalogItem[];
          diff: EditorialDiffItem[];
          publishHistory: PublishHistoryItem[];
        }>("/api/admin/editorial-draft", { headers: authHeaders }),
        fetchJson<{ document: NewsCurationDocument }>("/api/admin/news-curation", { headers: authHeaders }),
        fetchJson<{ items: SymbolSearchItem[]; watchlist: WatchlistEntry[] }>(
          `/api/admin/watchlist${symbolQuery.trim() ? `?q=${encodeURIComponent(symbolQuery.trim())}` : ""}`,
          { headers: authHeaders }
        )
      ]);

      setAudits(auditJson.items ?? []);
      setDraft(draftJson.draft);
      setCatalog(draftJson.catalog ?? []);
      setDiff(draftJson.diff ?? []);
      setHistory(draftJson.publishHistory ?? []);
      setNews(newsJson.document);
      setSymbolResults(watchlistJson.items ?? []);
      setWatchlist(watchlistJson.watchlist ?? []);
      setWatchlistBaseline(watchlistJson.watchlist ?? []);
      setActiveTicker((current) => current || draftJson.catalog?.[0]?.ticker || "");
      setActiveWatchlistTicker((current) => current || watchlistJson.watchlist?.[0]?.ticker || "");
      setMessage("운영 데이터가 로드되었습니다.");
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
      setMessage("초안 저장이 완료되었습니다.");
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
      setMessage(`발행이 완료되었습니다. 변경 종목 ${result.publish.diffCount}건`);
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
      setMessage("뉴스 큐레이션이 저장되었습니다.");
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
        json.result?.added
          ? `종목 추가 완료. ${json.result?.estimate ?? ""}`.trim()
          : "이미 감시리스트에 포함된 종목입니다."
      );

      await loadDashboard();

      if (json.result?.added && returnTo.startsWith("/analysis/")) {
        router.push(returnTo);
      }
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "감시리스트 종목 추가에 실패했습니다.");
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
      setMessage("감시리스트 메타데이터 저장이 완료되었습니다.");
      await loadDashboard();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "감시리스트 저장에 실패했습니다.");
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
          <CardTitle>운영자 자격 증명</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[1.5fr_auto_auto] lg:items-end">
          <div>
            <p className="mb-2 text-sm text-muted-foreground">
              `SWING_RADAR_ADMIN_TOKEN`을 입력하면 운영 기능을 사용할 수 있습니다.
            </p>
            <Input type="password" placeholder="관리자 토큰" value={token} onChange={(event) => setToken(event.target.value)} />
          </div>
          <Button onClick={() => { void loadDashboard(); }} disabled={loading} variant="secondary">
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
          <TabsTrigger value="watchlist">감시리스트</TabsTrigger>
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
          <StatusTab health={health} audits={audits} />
        </TabsContent>
      </Tabs>
    </div>
  );
}