"use client";

import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import {
  MetricCard,
  UNIVERSE_REVIEW_STATUS_OPTIONS,
  formatDateTime,
  formatUniverseReviewStatus
} from "@/components/admin/dashboard-shared";
import type {
  UniverseDailyCandidates,
  UniverseReviewStatus,
  SymbolSearchItem,
  WatchlistChange,
  WatchlistEntry,
  WatchlistSyncStatus
} from "@/components/admin/dashboard-types";
import { WatchlistTab } from "@/components/admin/watchlist-tab";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type ReviewDraftState = Record<string, { status: UniverseReviewStatus; note: string }>;

export function CandidateOpsTab({
  dailyCandidates,
  watchlistTickers,
  loading,
  onPromoteCandidate,
  onSaveReview,
  symbolQuery,
  setSymbolQuery,
  onSearch,
  symbolResults,
  addWatchlistSymbol,
  watchlist,
  activeWatchlistTicker,
  setActiveWatchlistTicker,
  activeWatchlist,
  setWatchlist,
  watchlistSyncStatuses,
  watchlistChanges,
  onSaveMetadata
}: {
  dailyCandidates: UniverseDailyCandidates | null;
  watchlistTickers: string[];
  loading: boolean;
  onPromoteCandidate: (ticker: string) => void;
  onSaveReview: (ticker: string, status: UniverseReviewStatus, note: string) => void;
  symbolQuery: string;
  setSymbolQuery: (value: string) => void;
  onSearch: () => void;
  symbolResults: SymbolSearchItem[];
  addWatchlistSymbol: (ticker: string) => void;
  watchlist: WatchlistEntry[];
  activeWatchlistTicker: string;
  setActiveWatchlistTicker: (ticker: string) => void;
  activeWatchlist: WatchlistEntry | null;
  setWatchlist: Dispatch<SetStateAction<WatchlistEntry[]>>;
  watchlistSyncStatuses: Record<string, WatchlistSyncStatus>;
  watchlistChanges: WatchlistChange[];
  onSaveMetadata: () => void;
}) {
  const [reviewDrafts, setReviewDrafts] = useState<ReviewDraftState>({});

  useEffect(() => {
    setReviewDrafts(
      Object.fromEntries(
        (dailyCandidates?.topCandidates ?? []).map((item) => [
          item.ticker,
          {
            status: item.review?.status ?? "new",
            note: item.review?.note ?? ""
          }
        ])
      )
    );
  }, [dailyCandidates]);

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>오늘 공통 후보 운영</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <MetricCard
            label="후보 수"
            value={String(dailyCandidates?.topCandidates.length ?? 0)}
            note={dailyCandidates?.generatedAt ? formatDateTime(dailyCandidates.generatedAt) : "후보 생성 시간 대기"}
          />
          <MetricCard
            label="실패 배치"
            value={String(dailyCandidates?.failedBatches.length ?? 0)}
            note={`총 ${dailyCandidates?.totalBatches ?? 0}개 batch`}
          />
          <MetricCard
            label="상위 편입"
            value={String(watchlistTickers.length)}
            note="예외 편입 watchlist 반영 수"
          />
          <MetricCard
            label="대표 종목"
            value={dailyCandidates?.topCandidates[0]?.ticker ?? "-"}
            note={dailyCandidates?.topCandidates[0]?.company ?? "대표 종목 없음"}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>상위 유니버스 후보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {dailyCandidates?.topCandidates.length ? (
            dailyCandidates.topCandidates.slice(0, 10).map((item) => {
              const draft = reviewDrafts[item.ticker] ?? { status: "new" as UniverseReviewStatus, note: "" };
              return (
                <div key={item.ticker} className="rounded-[24px] border border-border/70 bg-secondary/45 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">
                          {item.company} {item.ticker}
                        </p>
                        {watchlistTickers.includes(item.ticker) ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-positive/30 bg-positive/10 px-2.5 py-1 text-[11px] text-positive">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            예외 편입됨
                          </span>
                        ) : null}
                        <span className="inline-flex rounded-full border border-border/70 bg-white/70 px-2.5 py-1 text-[11px] text-muted-foreground">
                          candidate {item.candidateScore}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {item.sector} · tone {item.signalTone} · score {item.score.toFixed(1)}
                      </p>
                      <p className="text-sm leading-6 text-foreground/80">{item.validationSummary}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.eventCoverage} · {item.observationWindow}
                      </p>
                    </div>

                    <div className="grid gap-3 lg:w-[320px]">
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">검토 상태</p>
                        <select
                          className="h-10 w-full rounded-xl border border-border/70 bg-background px-3 text-sm text-foreground"
                          value={draft.status}
                          onChange={(event) =>
                            setReviewDrafts((current) => ({
                              ...current,
                              [item.ticker]: {
                                status: event.target.value as UniverseReviewStatus,
                                note: current[item.ticker]?.note ?? item.review?.note ?? ""
                              }
                            }))
                          }
                        >
                          {UNIVERSE_REVIEW_STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        {item.review ? (
                          <p className="text-[11px] text-muted-foreground">
                            현재 상태: {formatUniverseReviewStatus(item.review.status)} · {item.review.updatedBy} ·{" "}
                            {formatDateTime(item.review.updatedAt)}
                          </p>
                        ) : null}
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">운영 메모</p>
                        <Textarea
                          value={draft.note}
                          placeholder="후보 검토 메모를 남겨두세요."
                          onChange={(event) =>
                            setReviewDrafts((current) => ({
                              ...current,
                              [item.ticker]: {
                                status: current[item.ticker]?.status ?? item.review?.status ?? "new",
                                note: event.target.value
                              }
                            }))
                          }
                        />
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="secondary" disabled={loading} onClick={() => onSaveReview(item.ticker, draft.status, draft.note)}>
                          검토 저장
                        </Button>
                        <Button
                          size="sm"
                          variant={watchlistTickers.includes(item.ticker) ? "outline" : "default"}
                          disabled={loading || watchlistTickers.includes(item.ticker)}
                          onClick={() => onPromoteCandidate(item.ticker)}
                        >
                          <ArrowRight className="h-4 w-4" />
                          {watchlistTickers.includes(item.ticker) ? "편입 완료" : "예외 편입"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">현재 노출 가능한 상위 유니버스 후보가 없습니다.</p>
          )}
        </CardContent>
      </Card>

      <WatchlistTab
        symbolQuery={symbolQuery}
        setSymbolQuery={setSymbolQuery}
        onSearch={onSearch}
        symbolResults={symbolResults}
        addWatchlistSymbol={addWatchlistSymbol}
        loading={loading}
        watchlist={watchlist}
        activeWatchlistTicker={activeWatchlistTicker}
        setActiveWatchlistTicker={setActiveWatchlistTicker}
        activeWatchlist={activeWatchlist}
        setWatchlist={setWatchlist}
        watchlistSyncStatuses={watchlistSyncStatuses}
        watchlistChanges={watchlistChanges}
        onSaveMetadata={onSaveMetadata}
      />
    </div>
  );
}
