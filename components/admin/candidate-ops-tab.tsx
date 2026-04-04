"use client";

import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { ArrowRight, CheckCircle2, Eye, Sparkles } from "lucide-react";

import {
  MetricCard,
  UNIVERSE_REVIEW_STATUS_OPTIONS,
  formatDateTime,
  formatUniverseReviewStatus
} from "@/components/admin/dashboard-shared";
import type {
  SymbolSearchItem,
  UniverseDailyCandidates,
  UniverseReviewStatus,
  WatchlistChange,
  WatchlistEntry,
  WatchlistSyncStatus
} from "@/components/admin/dashboard-types";
import { WatchlistTab } from "@/components/admin/watchlist-tab";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type ReviewDraftState = Record<string, { status: UniverseReviewStatus; note: string }>;

function QuickPill({
  label,
  value,
  tone = "neutral"
}: {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "caution";
}) {
  const toneClass =
    tone === "positive"
      ? "border-positive/25 bg-positive/8 text-positive"
      : tone === "caution"
        ? "border-caution/25 bg-caution/10 text-caution"
        : "border-border/70 bg-white/70 text-foreground";

  return (
    <div className={`rounded-full border px-3 py-2 text-xs font-medium ${toneClass}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-2">{value}</span>
    </div>
  );
}

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
  onSaveMetadata,
  onSelectTab
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
  onSelectTab: (tab: "data-quality" | "notices") => void;
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

  const topCandidates = dailyCandidates?.topCandidates ?? [];
  const priorityCandidates = topCandidates.slice(0, 6);
  const extraCandidates = topCandidates.slice(6);
  const promotedCount = useMemo(
    () => topCandidates.filter((item) => watchlistTickers.includes(item.ticker)).length,
    [topCandidates, watchlistTickers]
  );
  const unreviewedCount = useMemo(
    () => topCandidates.filter((item) => (item.review?.status ?? "new") === "new").length,
    [topCandidates]
  );

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>후보 운영</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <QuickPill label="오늘 후보" value={String(topCandidates.length)} />
            <QuickPill label="미검토" value={String(unreviewedCount)} tone={unreviewedCount > 0 ? "caution" : "positive"} />
            <QuickPill label="예외 편입" value={String(promotedCount)} tone={promotedCount > 0 ? "positive" : "neutral"} />
            <QuickPill
              label="실패 배치"
              value={String(dailyCandidates?.failedBatches.length ?? 0)}
              tone={(dailyCandidates?.failedBatches.length ?? 0) > 0 ? "caution" : "neutral"}
            />
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            먼저 상위 후보를 검토하고, 실제 편입이 필요한 종목만 아래 예외 편입 보정 영역에서 다룹니다.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => onSelectTab("data-quality")}>
              데이터 품질 보기
            </Button>
            <Button variant="outline" size="sm" onClick={() => onSelectTab("notices")}>
              공지 열기
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="대표 종목"
          value={topCandidates[0]?.ticker ?? "-"}
          note={topCandidates[0]?.company ?? "대표 종목 없음"}
        />
        <MetricCard
          label="후보 생성 시각"
          value={dailyCandidates?.generatedAt ? formatDateTime(dailyCandidates.generatedAt) : "대기 중"}
          note={`총 ${dailyCandidates?.totalTickers ?? 0}개 종목 기준`}
        />
        <MetricCard
          label="배치 성공"
          value={dailyCandidates ? `${dailyCandidates.succeededBatches}/${dailyCandidates.totalBatches}` : "0/0"}
          note={`실패 ${dailyCandidates?.failedBatches.length ?? 0}개`}
        />
        <MetricCard
          label="예외 편입 watchlist"
          value={String(watchlistTickers.length)}
          note="운영자가 직접 보는 종목 수"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>우선 검토 후보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {priorityCandidates.length ? (
            priorityCandidates.map((item) => {
              const draft = reviewDrafts[item.ticker] ?? { status: "new" as UniverseReviewStatus, note: "" };
              const isPromoted = watchlistTickers.includes(item.ticker);

              return (
                <div key={item.ticker} className="rounded-[24px] border border-border/70 bg-secondary/45 p-4">
                  <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">
                          {item.company} {item.ticker}
                        </p>
                        <span className="inline-flex rounded-full border border-border/70 bg-white/70 px-2.5 py-1 text-[11px] text-muted-foreground">
                          candidate {item.candidateScore}
                        </span>
                        {isPromoted ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-positive/30 bg-positive/10 px-2.5 py-1 text-[11px] text-positive">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            예외 편입됨
                          </span>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>{item.sector}</span>
                        <span>tone {item.signalTone}</span>
                        <span>score {item.score.toFixed(1)}</span>
                      </div>
                      <p className="text-sm leading-6 text-foreground/80">{item.validationSummary}</p>
                      <div className="flex flex-wrap gap-2">
                        <QuickPill label="관찰 창" value={item.observationWindow} />
                        <QuickPill label="이벤트" value={item.eventCoverage} />
                      </div>
                    </div>

                    <div className="grid gap-3">
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
                          placeholder="검토 메모를 짧게 남겨주세요."
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
                          variant={isPromoted ? "outline" : "default"}
                          disabled={loading || isPromoted}
                          onClick={() => onPromoteCandidate(item.ticker)}
                        >
                          <ArrowRight className="h-4 w-4" />
                          {isPromoted ? "편입 완료" : "예외 편입"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">현재 검토할 공통 후보가 없습니다.</p>
          )}
        </CardContent>
      </Card>

      {extraCandidates.length ? (
        <details className="group rounded-[28px] border border-border/70 bg-white/85">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-6 py-5">
            <div>
              <p className="text-sm font-semibold text-foreground">후속 검토 후보 {extraCandidates.length}개</p>
              <p className="mt-1 text-sm text-muted-foreground">상단 우선 검토 이후 볼 후보만 따로 모았습니다.</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-white/80 px-3 py-1 text-xs text-muted-foreground">
              <Eye className="h-3.5 w-3.5" />
              전체 보기
            </span>
          </summary>
          <div className="space-y-3 border-t border-border/60 px-6 py-5">
            {extraCandidates.map((item) => {
              const isPromoted = watchlistTickers.includes(item.ticker);

              return (
                <div key={item.ticker} className="rounded-[22px] border border-border/70 bg-secondary/35 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {item.company} {item.ticker}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.sector} · candidate {item.candidateScore} · {item.validationSummary}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {isPromoted ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-positive/30 bg-positive/10 px-2.5 py-1 text-[11px] text-positive">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          편입됨
                        </span>
                      ) : null}
                      <Button size="sm" variant={isPromoted ? "outline" : "secondary"} disabled={loading || isPromoted} onClick={() => onPromoteCandidate(item.ticker)}>
                        <Sparkles className="h-4 w-4" />
                        {isPromoted ? "완료" : "빠른 편입"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </details>
      ) : null}

      <details className="group rounded-[28px] border border-border/70 bg-white/85">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-6 py-5">
          <div>
            <p className="text-sm font-semibold text-foreground">예외 편입 보정</p>
            <p className="mt-1 text-sm text-muted-foreground">watchlist 추가와 메타데이터 보정이 필요할 때만 펼칩니다.</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-white/80 px-3 py-1 text-xs text-muted-foreground">
            <Eye className="h-3.5 w-3.5" />
            열기
          </span>
        </summary>
        <div className="border-t border-border/60 px-6 py-5">
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
      </details>
    </div>
  );
}
