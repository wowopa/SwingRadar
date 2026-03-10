"use client";

import type { Dispatch, SetStateAction } from "react";
import { PlusCircle, Search } from "lucide-react";

import { Field, WatchlistPreviewDialog, splitLines } from "@/components/admin/dashboard-shared";
import type {
  SymbolSearchItem,
  WatchlistChange,
  WatchlistEntry,
  WatchlistSyncStatus
} from "@/components/admin/dashboard-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTimeShort } from "@/lib/utils";

function getSyncTone(state: WatchlistSyncStatus["state"]) {
  if (state === "ready") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (state === "failed") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (state === "syncing") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-border/70 bg-secondary/50 text-muted-foreground";
}

function getSyncLabel(state: WatchlistSyncStatus["state"]) {
  if (state === "ready") {
    return "반영 완료";
  }
  if (state === "failed") {
    return "반영 실패";
  }
  if (state === "syncing") {
    return "반영 중";
  }
  return "대기";
}

export function WatchlistTab({
  symbolQuery,
  setSymbolQuery,
  onSearch,
  symbolResults,
  addWatchlistSymbol,
  loading,
  watchlist,
  activeWatchlistTicker,
  setActiveWatchlistTicker,
  activeWatchlist,
  setWatchlist,
  watchlistSyncStatuses,
  watchlistChanges,
  onSaveMetadata
}: {
  symbolQuery: string;
  setSymbolQuery: (value: string) => void;
  onSearch: () => void;
  symbolResults: SymbolSearchItem[];
  addWatchlistSymbol: (ticker: string) => void;
  loading: boolean;
  watchlist: WatchlistEntry[];
  activeWatchlistTicker: string;
  setActiveWatchlistTicker: (ticker: string) => void;
  activeWatchlist: WatchlistEntry | null;
  setWatchlist: Dispatch<SetStateAction<WatchlistEntry[]>>;
  watchlistSyncStatuses: Record<string, WatchlistSyncStatus>;
  watchlistChanges: WatchlistChange[];
  onSaveMetadata: () => void;
}) {
  const activeSyncStatus = activeWatchlist ? watchlistSyncStatuses[activeWatchlist.ticker] ?? null : null;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>종목 추가</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              준비 중인 종목을 watchlist에 넣으면 분석 흐름에 다시 반영됩니다.
            </p>
          </div>
          <div className="flex gap-2">
            <Input
              value={symbolQuery}
              onChange={(event) => setSymbolQuery(event.target.value)}
              placeholder="티커, 종목명, 섹터 검색"
            />
            <Button onClick={onSearch} variant="secondary">
              <Search className="h-4 w-4" />
              검색
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {symbolResults.length ? (
            symbolResults.map((item) => (
              <div key={item.ticker} className="flex items-center justify-between rounded-[24px] border border-border/70 bg-secondary/45 p-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.company}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.ticker} | {item.market} | {item.sector}
                  </p>
                </div>
                <Button onClick={() => addWatchlistSymbol(item.ticker)} disabled={loading || item.status === "ready"}>
                  <PlusCircle className="h-4 w-4" />
                  {item.status === "ready" ? "편입 완료" : "watchlist 추가"}
                </Button>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">검색 결과가 없습니다.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>종목 설정 보정</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              검색어, 키워드, 도메인 규칙을 다듬고 저장 전 차이를 확인할 수 있습니다.
            </p>
          </div>
          <WatchlistPreviewDialog changes={watchlistChanges} disabled={!activeWatchlist || loading} onConfirm={onSaveMetadata} />
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <div className="space-y-3">
            {watchlist.map((item) => {
              const syncStatus = watchlistSyncStatuses[item.ticker];

              return (
                <button
                  key={item.ticker}
                  type="button"
                  onClick={() => setActiveWatchlistTicker(item.ticker)}
                  className={`w-full rounded-[24px] border p-4 text-left transition-colors ${
                    activeWatchlistTicker === item.ticker ? "border-primary/35 bg-primary/10" : "border-border/70 bg-secondary/45"
                  }`}
                >
                  <p className="text-sm font-semibold text-foreground">{item.company}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">{item.ticker}</p>
                    {syncStatus ? (
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${getSyncTone(syncStatus.state)}`}>
                        {getSyncLabel(syncStatus.state)}
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="space-y-4">
            {activeWatchlist ? (
              <>
                {activeSyncStatus ? (
                  <div className="rounded-[24px] border border-border/70 bg-secondary/35 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">반영 상태</p>
                        <p className="mt-1 text-sm text-muted-foreground">{activeSyncStatus.message}</p>
                      </div>
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getSyncTone(
                          activeSyncStatus.state
                        )}`}
                      >
                        {getSyncLabel(activeSyncStatus.state)}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {activeSyncStatus.lastStartedAt ? <span>시작 {formatDateTimeShort(activeSyncStatus.lastStartedAt)}</span> : null}
                      {activeSyncStatus.lastCompletedAt ? <span>완료 {formatDateTimeShort(activeSyncStatus.lastCompletedAt)}</span> : null}
                      {activeSyncStatus.lastDurationMs !== null ? (
                        <span>{Math.max(1, Math.round(activeSyncStatus.lastDurationMs / 1000))}초 소요</span>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <Field label="섹터">
                  <Input
                    value={activeWatchlist.sector}
                    onChange={(event) =>
                      setWatchlist((current) =>
                        current.map((item) =>
                          item.ticker === activeWatchlist.ticker ? { ...item, sector: event.target.value } : item
                        )
                      )
                    }
                  />
                </Field>
                <Field label="기본 뉴스 검색어">
                  <Input
                    value={activeWatchlist.newsQuery}
                    onChange={(event) =>
                      setWatchlist((current) =>
                        current.map((item) =>
                          item.ticker === activeWatchlist.ticker ? { ...item, newsQuery: event.target.value } : item
                        )
                      )
                    }
                  />
                </Field>
                <Field label="DART 회사코드">
                  <Input
                    value={activeWatchlist.dartCorpCode ?? ""}
                    onChange={(event) =>
                      setWatchlist((current) =>
                        current.map((item) =>
                          item.ticker === activeWatchlist.ticker ? { ...item, dartCorpCode: event.target.value } : item
                        )
                      )
                    }
                  />
                </Field>
                <Field label="필수 키워드 (줄바꿈 구분)">
                  <Textarea
                    value={activeWatchlist.requiredKeywords.join("\n")}
                    onChange={(event) =>
                      setWatchlist((current) =>
                        current.map((item) =>
                          item.ticker === activeWatchlist.ticker
                            ? { ...item, requiredKeywords: splitLines(event.target.value) }
                            : item
                        )
                      )
                    }
                  />
                </Field>
                <Field label="문맥 키워드 (줄바꿈 구분)">
                  <Textarea
                    value={activeWatchlist.contextKeywords.join("\n")}
                    onChange={(event) =>
                      setWatchlist((current) =>
                        current.map((item) =>
                          item.ticker === activeWatchlist.ticker
                            ? { ...item, contextKeywords: splitLines(event.target.value) }
                            : item
                        )
                      )
                    }
                  />
                </Field>
                <Field label="차단 키워드 (줄바꿈 구분)">
                  <Textarea
                    value={activeWatchlist.blockedKeywords.join("\n")}
                    onChange={(event) =>
                      setWatchlist((current) =>
                        current.map((item) =>
                          item.ticker === activeWatchlist.ticker
                            ? { ...item, blockedKeywords: splitLines(event.target.value) }
                            : item
                        )
                      )
                    }
                  />
                </Field>
                <Field label="선호 도메인 (줄바꿈 구분)">
                  <Textarea
                    value={activeWatchlist.preferredDomains.join("\n")}
                    onChange={(event) =>
                      setWatchlist((current) =>
                        current.map((item) =>
                          item.ticker === activeWatchlist.ticker
                            ? { ...item, preferredDomains: splitLines(event.target.value) }
                            : item
                        )
                      )
                    }
                  />
                </Field>
                <Field label="차단 도메인 (줄바꿈 구분)">
                  <Textarea
                    value={activeWatchlist.blockedDomains.join("\n")}
                    onChange={(event) =>
                      setWatchlist((current) =>
                        current.map((item) =>
                          item.ticker === activeWatchlist.ticker
                            ? { ...item, blockedDomains: splitLines(event.target.value) }
                            : item
                        )
                      )
                    }
                  />
                </Field>
                <Field label="최소 기사 점수">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={String(activeWatchlist.minArticleScore)}
                    onChange={(event) =>
                      setWatchlist((current) =>
                        current.map((item) =>
                          item.ticker === activeWatchlist.ticker
                            ? { ...item, minArticleScore: Number(event.target.value || 0) }
                            : item
                        )
                      )
                    }
                  />
                </Field>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                왼쪽에서 watchlist 종목을 고르면 설정을 수정할 수 있습니다.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
