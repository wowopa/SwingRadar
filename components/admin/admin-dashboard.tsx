"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, Eye, PlusCircle, RefreshCw, RotateCcw, Save, Search, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type HealthPayload = {
  status: "ok" | "warning";
  service: string;
  recentAuditCount: number;
  dataProvider: {
    configured: { provider: string; mode: string };
    lastUsed?: { provider: string; mode: string };
    fallbackTriggered: boolean;
  };
  warnings: string[];
};

type AuditItem = {
  id: number;
  eventType: string;
  actor: string;
  status: "success" | "failure" | "warning";
  requestId: string;
  summary: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

type EditorialDraftItem = {
  ticker: string;
  recommendation: { signalLabel: string; rationale: string; invalidation: string; checkpoints: string[] };
  analysis: { headline: string; invalidation: string; decisionNotes: string[] };
  operatorNote: string;
};

type EditorialDraftDocument = { updatedAt: string; updatedBy: string; items: EditorialDraftItem[] };
type EditorialCatalogItem = { ticker: string; company: string; signalTone: string; score: number };
type EditorialDiffField = { field: string; label: string; before: string; after: string };
type EditorialDiffItem = { ticker: string; company: string; score: number; changes: string[]; details: EditorialDiffField[] };
type PublishHistoryItem = {
  id: string;
  publishedAt: string;
  publishedBy: string;
  requestId: string;
  approvalStage: string;
  rollbackReason?: string;
  tickers: number;
  diffCount: number;
  notes: string[];
  changes: EditorialDiffItem[];
};
type CuratedNewsImpact = "긍정" | "중립" | "주의";
type CuratedNewsItem = {
  id: string;
  ticker: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  date: string;
  impact: CuratedNewsImpact;
  pinned: boolean;
  operatorNote: string;
};
type NewsCurationDocument = { updatedAt: string; updatedBy: string; items: CuratedNewsItem[] };
type SymbolSearchItem = { ticker: string; company: string; sector: string; market: "KOSPI" | "KOSDAQ"; status: "ready" | "pending" };
type WatchlistEntry = {
  ticker: string;
  company: string;
  sector: string;
  newsQuery: string;
  requiredKeywords: string[];
  contextKeywords: string[];
  blockedKeywords: string[];
  blockedDomains: string[];
  preferredDomains: string[];
  minArticleScore: number;
  dartCorpCode?: string;
};
type WatchlistChange = { field: string; before: string; after: string };

const IMPACT_OPTIONS: CuratedNewsImpact[] = ["긍정", "중립", "주의"];
const APPROVAL_STAGE_OPTIONS = [
  { value: "editorial_review", label: "편집 검토" },
  { value: "risk_review", label: "리스크 검토" },
  { value: "final_publish", label: "최종 발행" }
] as const;

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
  const activeDraftItem = useMemo(() => draft?.items.find((item) => item.ticker === activeTicker) ?? null, [activeTicker, draft]);
  const activeNews = useMemo(() => news?.items.filter((item) => item.ticker === activeTicker) ?? [], [activeTicker, news]);
  const activeWatchlist = useMemo(() => watchlist.find((item) => item.ticker === activeWatchlistTicker) ?? null, [activeWatchlistTicker, watchlist]);
  const baselineWatchlist = useMemo(() => watchlistBaseline.find((item) => item.ticker === activeWatchlistTicker) ?? null, [activeWatchlistTicker, watchlistBaseline]);
  const watchlistChanges = useMemo(() => {
    if (!activeWatchlist || !baselineWatchlist) return [];
    return buildWatchlistChanges(baselineWatchlist, activeWatchlist);
  }, [activeWatchlist, baselineWatchlist]);

  useEffect(() => {
    const nextTab = searchParams.get("tab");
    const query = searchParams.get("q");
    const nextReturnTo = searchParams.get("returnTo");
    if (nextTab) setTab(nextTab);
    if (query) setSymbolQuery(query);
    if (nextReturnTo) setReturnTo(nextReturnTo);
  }, [searchParams]);

  async function fetchJson<T>(input: RequestInfo, init?: RequestInit) {
    const response = await fetch(input, { ...init, cache: "no-store" });
    const json = (await response.json().catch(() => ({}))) as T & { error?: { message?: string } };
    if (!response.ok) throw new Error(json?.error?.message ?? `요청에 실패했습니다. (${response.status})`);
    return json;
  }

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      setHealth(await fetchJson<HealthPayload>("/api/health"));
      if (!authHeaders) {
        setMessage("관리자 토큰을 입력하면 운영실 데이터를 불러옵니다.");
        return;
      }

      const [auditJson, draftJson, newsJson, watchlistJson] = await Promise.all([
        fetchJson<{ items: AuditItem[] }>("/api/admin/audit", { headers: authHeaders }),
        fetchJson<{ draft: EditorialDraftDocument; catalog: EditorialCatalogItem[]; diff: EditorialDiffItem[]; publishHistory: PublishHistoryItem[] }>("/api/admin/editorial-draft", { headers: authHeaders }),
        fetchJson<{ document: NewsCurationDocument }>("/api/admin/news-curation", { headers: authHeaders }),
        fetchJson<{ items: SymbolSearchItem[]; watchlist: WatchlistEntry[] }>(`/api/admin/watchlist${symbolQuery.trim() ? `?q=${encodeURIComponent(symbolQuery.trim())}` : ""}`, { headers: authHeaders })
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
      setMessage("운영실 데이터가 로드되었습니다.");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "운영실 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function saveDraft() {
    if (!authHeaders || !draft) return;
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
    if (!authHeaders) return;
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
    if (!authHeaders || !news) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await fetchJson("/api/admin/news-curation", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(news)
      });
      setMessage("큐레이션 뉴스가 저장되었습니다.");
      await loadDashboard();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "큐레이션 뉴스 저장에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function rollbackHistory(historyId: string) {
    if (!authHeaders) return;
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
    if (!authHeaders) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const json = await fetchJson<{ result?: { added?: boolean; estimate?: string } }>("/api/admin/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ ticker })
      });
      setMessage(json.result?.added ? `종목 추가 완료. ${json.result?.estimate ?? ""}`.trim() : "이미 감시리스트에 포함된 종목입니다.");
      await loadDashboard();
      if (json.result?.added && returnTo.startsWith("/analysis/")) router.push(returnTo);
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "감시리스트 종목 추가에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function saveWatchlistMetadata() {
    if (!authHeaders || !activeWatchlist) return;
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
    setDraft((current) => current ? { ...current, items: current.items.map((item) => item.ticker === ticker ? updater(item) : item) } : current);
  }

  function updateNewsItem(id: string, updater: (item: CuratedNewsItem) => CuratedNewsItem) {
    setNews((current) => current ? { ...current, items: current.items.map((item) => item.id === id ? updater(item) : item) } : current);
  }

  function removeNewsItem(id: string) {
    setNews((current) => current ? { ...current, items: current.items.filter((item) => item.id !== id) } : current);
  }

  function addNewsItem() {
    if (!activeTicker) return;
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
    setNews((current) => ({ updatedAt: current?.updatedAt ?? new Date(0).toISOString(), updatedBy: current?.updatedBy ?? "system", items: [nextItem, ...(current?.items ?? [])] }));
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>운영실 접근</CardTitle></CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[1.5fr_auto_auto] lg:items-end">
          <div>
            <p className="mb-2 text-sm text-muted-foreground">`SWING_RADAR_ADMIN_TOKEN`을 입력하면 운영실 기능을 사용할 수 있습니다.</p>
            <Input type="password" placeholder="관리자 토큰" value={token} onChange={(event) => setToken(event.target.value)} />
          </div>
          <Button onClick={loadDashboard} disabled={loading} variant="secondary"><RefreshCw className="h-4 w-4" />새로고침</Button>
          <PublishDialog approvalStage={approvalStage} onApprovalStageChange={setApprovalStage} onConfirm={() => void publishDraft()} disabled={loading || !draft} />
        </CardContent>
      </Card>

      {message ? <Banner tone="success" message={message} /> : null}
      {error ? <Banner tone="error" message={error} /> : null}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="editorial">편집</TabsTrigger>
          <TabsTrigger value="news">뉴스</TabsTrigger>
          <TabsTrigger value="watchlist">감시리스트</TabsTrigger>
          <TabsTrigger value="diff">변경점</TabsTrigger>
          <TabsTrigger value="history">이력</TabsTrigger>
          <TabsTrigger value="status">상태</TabsTrigger>
        </TabsList>

        <TabsContent value="editorial">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>초안 편집</CardTitle>
                <p className="mt-2 text-sm text-muted-foreground">종목별 신호 라벨, 근거, 무효화, 분석 메모를 직접 보정합니다.</p>
              </div>
              <Button onClick={() => void saveDraft()} disabled={loading || !draft}><Save className="h-4 w-4" />초안 저장</Button>
            </CardHeader>
            <CardContent className="grid gap-6 lg:grid-cols-[280px_1fr]">
              <div className="space-y-3">
                {catalog.map((item) => (
                  <button key={item.ticker} type="button" onClick={() => setActiveTicker(item.ticker)} className={`w-full rounded-2xl border p-4 text-left ${activeTicker === item.ticker ? "border-primary/50 bg-primary/10" : "border-border/70 bg-secondary/35"}`}>
                    <p className="text-sm font-semibold text-white">{item.company}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.ticker} | {item.signalTone} | 점수 {item.score}</p>
                  </button>
                ))}
              </div>
              <div className="space-y-4">
                {activeDraftItem ? (
                  <>
                    <Field label="신호 라벨"><Input value={activeDraftItem.recommendation.signalLabel} onChange={(event) => updateDraftItem(activeDraftItem.ticker, (item) => ({ ...item, recommendation: { ...item.recommendation, signalLabel: event.target.value } }))} /></Field>
                    <Field label="관찰 근거"><Textarea value={activeDraftItem.recommendation.rationale} onChange={(event) => updateDraftItem(activeDraftItem.ticker, (item) => ({ ...item, recommendation: { ...item.recommendation, rationale: event.target.value } }))} /></Field>
                    <Field label="추천 무효화"><Textarea value={activeDraftItem.recommendation.invalidation} onChange={(event) => updateDraftItem(activeDraftItem.ticker, (item) => ({ ...item, recommendation: { ...item.recommendation, invalidation: event.target.value } }))} /></Field>
                    <Field label="체크포인트 (줄바꿈 구분)"><Textarea value={activeDraftItem.recommendation.checkpoints.join("\n")} onChange={(event) => updateDraftItem(activeDraftItem.ticker, (item) => ({ ...item, recommendation: { ...item.recommendation, checkpoints: splitLines(event.target.value) } }))} /></Field>
                    <Field label="분석 헤드라인"><Input value={activeDraftItem.analysis.headline} onChange={(event) => updateDraftItem(activeDraftItem.ticker, (item) => ({ ...item, analysis: { ...item.analysis, headline: event.target.value } }))} /></Field>
                    <Field label="분석 무효화"><Textarea value={activeDraftItem.analysis.invalidation} onChange={(event) => updateDraftItem(activeDraftItem.ticker, (item) => ({ ...item, analysis: { ...item.analysis, invalidation: event.target.value } }))} /></Field>
                    <Field label="의사결정 메모 (줄바꿈 구분)"><Textarea value={activeDraftItem.analysis.decisionNotes.join("\n")} onChange={(event) => updateDraftItem(activeDraftItem.ticker, (item) => ({ ...item, analysis: { ...item.analysis, decisionNotes: splitLines(event.target.value) } }))} /></Field>
                    <Field label="운영 메모"><Textarea value={activeDraftItem.operatorNote} onChange={(event) => updateDraftItem(activeDraftItem.ticker, (item) => ({ ...item, operatorNote: event.target.value }))} /></Field>
                  </>
                ) : <p className="text-sm text-muted-foreground">왼쪽에서 종목을 선택하면 초안을 편집할 수 있습니다.</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="news">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>큐레이션 뉴스</CardTitle>
                <p className="mt-2 text-sm text-muted-foreground">기사 부족 구간은 운영자 큐레이션으로 보정합니다.</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={addNewsItem} variant="secondary" disabled={!activeTicker}><PlusCircle className="h-4 w-4" />뉴스 추가</Button>
                <Button onClick={() => void saveNews()} disabled={loading || !news}><Save className="h-4 w-4" />뉴스 저장</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeNews.length ? activeNews.map((item) => (
                <div key={item.id} className="rounded-2xl border border-border/70 bg-secondary/35 p-4">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <Field label="헤드라인"><Input value={item.headline} onChange={(event) => updateNewsItem(item.id, (current) => ({ ...current, headline: event.target.value }))} /></Field>
                    <Field label="출처"><Input value={item.source} onChange={(event) => updateNewsItem(item.id, (current) => ({ ...current, source: event.target.value }))} /></Field>
                    <Field label="URL"><Input value={item.url} onChange={(event) => updateNewsItem(item.id, (current) => ({ ...current, url: event.target.value }))} /></Field>
                    <Field label="일자"><Input type="date" value={item.date.slice(0, 10)} onChange={(event) => updateNewsItem(item.id, (current) => ({ ...current, date: event.target.value }))} /></Field>
                  </div>
                  <div className="mt-4 grid gap-4 lg:grid-cols-[160px_160px_1fr]">
                    <Field label="영향"><select className="h-10 rounded-xl border border-border/70 bg-background px-3 text-sm text-white" value={item.impact} onChange={(event) => updateNewsItem(item.id, (current) => ({ ...current, impact: event.target.value as CuratedNewsImpact }))}>{IMPACT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></Field>
                    <Field label="고정 여부"><label className="flex h-10 items-center gap-2 rounded-xl border border-border/70 px-3 text-sm text-muted-foreground"><input type="checkbox" checked={item.pinned} onChange={(event) => updateNewsItem(item.id, (current) => ({ ...current, pinned: event.target.checked }))} />상단 고정</label></Field>
                    <Field label="운영 메모"><Input value={item.operatorNote} onChange={(event) => updateNewsItem(item.id, (current) => ({ ...current, operatorNote: event.target.value }))} /></Field>
                  </div>
                  <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto]">
                    <Field label="요약"><Textarea value={item.summary} onChange={(event) => updateNewsItem(item.id, (current) => ({ ...current, summary: event.target.value }))} /></Field>
                    <div className="flex items-end"><Button variant="outline" onClick={() => removeNewsItem(item.id)}>삭제</Button></div>
                  </div>
                </div>
              )) : <p className="text-sm text-muted-foreground">선택한 종목의 큐레이션 뉴스가 없습니다. `뉴스 추가`로 직접 보강할 수 있습니다.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="watchlist">
          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>종목 추가</CardTitle>
                  <p className="mt-2 text-sm text-muted-foreground">준비중 종목을 감시리스트에 올리면 분석 파이프라인이 실행됩니다.</p>
                </div>
                <div className="flex gap-2">
                  <Input value={symbolQuery} onChange={(event) => setSymbolQuery(event.target.value)} placeholder="티커, 종목명, 섹터 검색" />
                  <Button onClick={() => void loadDashboard()} variant="secondary"><Search className="h-4 w-4" />검색</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {symbolResults.length ? symbolResults.map((item) => (
                  <div key={item.ticker} className="flex items-center justify-between rounded-2xl border border-border/70 bg-secondary/35 p-4">
                    <div>
                      <p className="text-sm font-semibold text-white">{item.company}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.ticker} | {item.market} | {item.sector}</p>
                    </div>
                    <Button onClick={() => void addWatchlistSymbol(item.ticker)} disabled={loading || item.status === "ready"}>
                      <PlusCircle className="h-4 w-4" />
                      {item.status === "ready" ? "분석 가능" : "감시 추가"}
                    </Button>
                  </div>
                )) : <p className="text-sm text-muted-foreground">검색 결과가 없습니다.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>메타데이터 보정</CardTitle>
                  <p className="mt-2 text-sm text-muted-foreground">뉴스 쿼리, 키워드, 도메인 규칙을 저장 전 diff로 검토합니다.</p>
                </div>
                <WatchlistPreviewDialog changes={watchlistChanges} disabled={!activeWatchlist || loading} onConfirm={() => void saveWatchlistMetadata()} />
              </CardHeader>
              <CardContent className="grid gap-6 lg:grid-cols-[220px_1fr]">
                <div className="space-y-3">
                  {watchlist.map((item) => (
                    <button key={item.ticker} type="button" onClick={() => setActiveWatchlistTicker(item.ticker)} className={`w-full rounded-2xl border p-4 text-left ${activeWatchlistTicker === item.ticker ? "border-primary/50 bg-primary/10" : "border-border/70 bg-secondary/35"}`}>
                      <p className="text-sm font-semibold text-white">{item.company}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.ticker}</p>
                    </button>
                  ))}
                </div>
                <div className="space-y-4">
                  {activeWatchlist ? (
                    <>
                      <Field label="섹터"><Input value={activeWatchlist.sector} onChange={(event) => setWatchlist((current) => current.map((item) => item.ticker === activeWatchlist.ticker ? { ...item, sector: event.target.value } : item))} /></Field>
                      <Field label="대표 뉴스 쿼리"><Input value={activeWatchlist.newsQuery} onChange={(event) => setWatchlist((current) => current.map((item) => item.ticker === activeWatchlist.ticker ? { ...item, newsQuery: event.target.value } : item))} /></Field>
                      <Field label="DART 회사코드"><Input value={activeWatchlist.dartCorpCode ?? ""} onChange={(event) => setWatchlist((current) => current.map((item) => item.ticker === activeWatchlist.ticker ? { ...item, dartCorpCode: event.target.value } : item))} /></Field>
                      <Field label="필수 키워드 (줄바꿈 구분)"><Textarea value={activeWatchlist.requiredKeywords.join("\n")} onChange={(event) => setWatchlist((current) => current.map((item) => item.ticker === activeWatchlist.ticker ? { ...item, requiredKeywords: splitLines(event.target.value) } : item))} /></Field>
                      <Field label="컨텍스트 키워드 (줄바꿈 구분)"><Textarea value={activeWatchlist.contextKeywords.join("\n")} onChange={(event) => setWatchlist((current) => current.map((item) => item.ticker === activeWatchlist.ticker ? { ...item, contextKeywords: splitLines(event.target.value) } : item))} /></Field>
                      <Field label="차단 키워드 (줄바꿈 구분)"><Textarea value={activeWatchlist.blockedKeywords.join("\n")} onChange={(event) => setWatchlist((current) => current.map((item) => item.ticker === activeWatchlist.ticker ? { ...item, blockedKeywords: splitLines(event.target.value) } : item))} /></Field>
                      <Field label="선호 도메인 (줄바꿈 구분)"><Textarea value={activeWatchlist.preferredDomains.join("\n")} onChange={(event) => setWatchlist((current) => current.map((item) => item.ticker === activeWatchlist.ticker ? { ...item, preferredDomains: splitLines(event.target.value) } : item))} /></Field>
                      <Field label="차단 도메인 (줄바꿈 구분)"><Textarea value={activeWatchlist.blockedDomains.join("\n")} onChange={(event) => setWatchlist((current) => current.map((item) => item.ticker === activeWatchlist.ticker ? { ...item, blockedDomains: splitLines(event.target.value) } : item))} /></Field>
                      <Field label="최소 기사 점수"><Input type="number" min={0} max={100} value={String(activeWatchlist.minArticleScore)} onChange={(event) => setWatchlist((current) => current.map((item) => item.ticker === activeWatchlist.ticker ? { ...item, minArticleScore: Number(event.target.value || 0) } : item))} /></Field>
                    </>
                  ) : <p className="text-sm text-muted-foreground">왼쪽에서 감시리스트 종목을 선택하면 메타데이터를 수정할 수 있습니다.</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="diff">
          <Card>
            <CardHeader><CardTitle>초안 변경점</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {diff.length ? diff.map((item) => (
                <div key={item.ticker} className="rounded-2xl border border-border/70 bg-secondary/35 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">{item.company} {item.ticker}</p>
                      <p className="mt-1 text-xs text-muted-foreground">점수 {item.score} | 변경 {item.changes.join(", ")}</p>
                    </div>
                    <DiffDialog item={item} />
                  </div>
                </div>
              )) : <p className="text-sm text-muted-foreground">현재 라이브 스냅샷 대비 변경점이 없습니다.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader><CardTitle>발행 이력</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {history.length ? history.map((item) => (
                <div key={item.id} className="rounded-2xl border border-border/70 bg-secondary/35 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{formatDateTime(item.publishedAt)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">작성자 {item.publishedBy} | 단계 {formatApprovalStage(item.approvalStage)} | 종목 {item.tickers}개 | 변경 {item.diffCount}건</p>
                    </div>
                    <div className="flex gap-2">
                      <HistoryDialog item={item} />
                      <RollbackDialog item={item} reason={rollbackReason} onReasonChange={setRollbackReason} onConfirm={() => void rollbackHistory(item.id)} disabled={loading} />
                    </div>
                  </div>
                </div>
              )) : <p className="text-sm text-muted-foreground">아직 발행 이력이 없습니다.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status">
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <CardHeader><CardTitle>서비스 상태</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-4">
                <MetricCard label="서비스" value={health?.status ?? "not_loaded"} note={health?.service ?? "미로드"} />
                <MetricCard label="실사용 provider" value={health?.dataProvider.lastUsed?.provider ?? health?.dataProvider.configured.provider ?? "unknown"} note={health?.dataProvider.lastUsed?.mode ?? health?.dataProvider.configured.mode ?? "unknown"} />
                <MetricCard label="폴백 상태" value={health?.dataProvider.fallbackTriggered ? "사용됨" : "기본"} note="" />
                <MetricCard label="최근 감사 로그" value={String(health?.recentAuditCount ?? 0)} note="최근 5건" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>최근 감사 로그</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {audits.length ? audits.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-border/70 bg-secondary/35 p-4">
                    <p className="text-sm font-semibold text-white">{item.summary}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatAuditEventType(item.eventType)} | {item.actor} | {formatDateTime(item.createdAt)}</p>
                  </div>
                )) : <p className="text-sm text-muted-foreground">감사 로그가 없습니다.</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PublishDialog({ approvalStage, onApprovalStageChange, onConfirm, disabled }: { approvalStage: (typeof APPROVAL_STAGE_OPTIONS)[number]["value"]; onApprovalStageChange: (value: (typeof APPROVAL_STAGE_OPTIONS)[number]["value"]) => void; onConfirm: () => void; disabled: boolean }) {
  return (
    <Dialog>
      <DialogTrigger asChild><Button disabled={disabled}><Send className="h-4 w-4" />발행 실행</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>발행 전 최종 확인</DialogTitle>
          <DialogDescription>선택한 승인 단계로 라이브 스냅샷과 Postgres를 갱신합니다.</DialogDescription>
        </DialogHeader>
        <Field label="승인 단계">
          <select className="h-10 rounded-xl border border-border/70 bg-background px-3 text-sm text-white" value={approvalStage} onChange={(event) => onApprovalStageChange(event.target.value as (typeof APPROVAL_STAGE_OPTIONS)[number]["value"])}>
            {APPROVAL_STAGE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </Field>
        <div className="flex justify-end gap-3">
          <DialogClose asChild><Button variant="outline">닫기</Button></DialogClose>
          <DialogClose asChild><Button onClick={onConfirm}>발행 실행</Button></DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DiffDialog({ item }: { item: EditorialDiffItem }) {
  return (
    <Dialog>
      <DialogTrigger asChild><Button variant="outline" size="sm"><Eye className="h-4 w-4" />상세 보기</Button></DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item.company} {item.ticker}</DialogTitle>
          <DialogDescription>발행 전 변경 상세입니다.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {item.details.map((detail) => (
            <div key={detail.field} className="rounded-2xl border border-border/70 bg-secondary/35 p-4">
              <p className="text-sm font-semibold text-white">{detail.label}</p>
              <p className="mt-2 text-xs text-muted-foreground">변경 전: {detail.before || "(empty)"}</p>
              <p className="mt-1 text-xs text-primary">변경 후: {detail.after || "(empty)"}</p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function HistoryDialog({ item }: { item: PublishHistoryItem }) {
  return (
    <Dialog>
      <DialogTrigger asChild><Button variant="outline" size="sm"><Eye className="h-4 w-4" />이력 상세</Button></DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>발행 이력 상세</DialogTitle>
          <DialogDescription>{formatDateTime(item.publishedAt)} | {formatApprovalStage(item.approvalStage)}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {item.changes.length ? item.changes.map((change) => (
            <div key={change.ticker} className="rounded-2xl border border-border/70 bg-secondary/35 p-4">
              <p className="text-sm font-semibold text-white">{change.company} {change.ticker}</p>
              <p className="mt-1 text-xs text-muted-foreground">{change.changes.join(", ")}</p>
            </div>
          )) : <p className="text-sm text-muted-foreground">저장된 변경 항목이 없습니다.</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RollbackDialog({ item, reason, onReasonChange, onConfirm, disabled }: { item: PublishHistoryItem; reason: string; onReasonChange: (value: string) => void; onConfirm: () => void; disabled: boolean }) {
  return (
    <Dialog>
      <DialogTrigger asChild><Button variant="outline" size="sm" disabled={disabled}><RotateCcw className="h-4 w-4" />롤백</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>롤백 확인</DialogTitle>
          <DialogDescription>{formatDateTime(item.publishedAt)} 발행 시점으로 라이브 스냅샷을 되돌립니다.</DialogDescription>
        </DialogHeader>
        <Field label="롤백 사유"><Textarea value={reason} onChange={(event) => onReasonChange(event.target.value)} /></Field>
        <div className="flex justify-end gap-3">
          <DialogClose asChild><Button variant="outline">닫기</Button></DialogClose>
          <DialogClose asChild><Button onClick={onConfirm} disabled={disabled || reason.trim().length < 3}>롤백 실행</Button></DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WatchlistPreviewDialog({ changes, disabled, onConfirm }: { changes: WatchlistChange[]; disabled: boolean; onConfirm: () => void }) {
  return (
    <Dialog>
      <DialogTrigger asChild><Button disabled={disabled}><Save className="h-4 w-4" />변경 미리보기</Button></DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>감시리스트 저장 전 검토</DialogTitle>
          <DialogDescription>현재 편집 내용과 마지막 저장 상태를 비교합니다.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {changes.length ? changes.map((change) => (
            <div key={change.field} className="rounded-2xl border border-border/70 bg-secondary/35 p-4">
              <p className="text-sm font-semibold text-white">{formatWatchlistField(change.field)}</p>
              <p className="mt-2 text-xs text-muted-foreground">변경 전: {change.before || "(empty)"}</p>
              <p className="mt-1 text-xs text-primary">변경 후: {change.after || "(empty)"}</p>
            </div>
          )) : <p className="text-sm text-muted-foreground">저장할 변경점이 없습니다.</p>}
        </div>
        <div className="flex justify-end gap-3">
          <DialogClose asChild><Button variant="outline">닫기</Button></DialogClose>
          <DialogClose asChild><Button disabled={disabled || !changes.length} onClick={onConfirm}>저장 실행</Button></DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="space-y-2"><p className="text-sm font-medium text-white">{label}</p>{children}</div>;
}

function MetricCard({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="rounded-2xl border border-border/70 bg-secondary/35 p-4"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p><p className="mt-2 text-lg font-semibold text-white">{value}</p><p className="mt-2 text-sm text-muted-foreground">{note}</p></div>;
}

function Banner({ tone, message }: { tone: "success" | "error"; message: string }) {
  const Icon = tone === "success" ? CheckCircle2 : AlertTriangle;
  const className = tone === "success" ? "border-positive/40 bg-positive/10 text-positive" : "border-destructive/40 bg-destructive/10 text-destructive";
  return <div className={`flex items-center gap-3 rounded-2xl border p-4 text-sm ${className}`}><Icon className="h-4 w-4" /><span>{message}</span></div>;
}

function buildWatchlistChanges(previous: WatchlistEntry, next: WatchlistEntry): WatchlistChange[] {
  const fields: Array<keyof WatchlistEntry> = ["sector", "newsQuery", "requiredKeywords", "contextKeywords", "blockedKeywords", "blockedDomains", "preferredDomains", "minArticleScore", "dartCorpCode"];
  return fields.flatMap((field) => {
    const before = Array.isArray(previous[field]) ? previous[field].join(", ") : String(previous[field] ?? "");
    const after = Array.isArray(next[field]) ? next[field].join(", ") : String(next[field] ?? "");
    if (before === after) return [];
    return [{ field: String(field), before, after }];
  });
}

function formatWatchlistField(field: string) {
  const labels: Record<string, string> = { sector: "섹터", newsQuery: "대표 뉴스 쿼리", requiredKeywords: "필수 키워드", contextKeywords: "컨텍스트 키워드", blockedKeywords: "차단 키워드", blockedDomains: "차단 도메인", preferredDomains: "선호 도메인", minArticleScore: "최소 기사 점수", dartCorpCode: "DART 회사코드" };
  return labels[field] ?? field;
}

function formatAuditEventType(eventType: string) {
  const labels: Record<string, string> = { admin_ingest: "관리자 적재", admin_login_attempt: "관리자 로그인 시도", health_warning: "상태 경고", admin_draft_saved: "초안 저장", admin_news_curation_saved: "큐레이션 뉴스 저장", admin_publish: "발행", watchlist_add: "감시리스트 추가", watchlist_update: "감시리스트 수정", provider_fallback: "데이터 폴백" };
  return labels[eventType] ?? eventType;
}

function formatApprovalStage(stage: string) {
  return APPROVAL_STAGE_OPTIONS.find((option) => option.value === stage)?.label ?? stage;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
}

function splitLines(value: string) {
  return value.split("\n").map((line) => line.trim()).filter(Boolean);
}

function createClientId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `news-${Date.now()}`;
}
