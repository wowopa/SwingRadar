"use client";

import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import {
  MetricCard,
  UNIVERSE_REVIEW_STATUS_OPTIONS,
  formatAuditEventType,
  formatDateTime,
  formatUniverseReviewStatus
} from "@/components/admin/dashboard-shared";
import type {
  AuditItem,
  DailyCycleReportPayload,
  HealthPayload,
  OpsHealthReportPayload,
  UniverseDailyCandidates,
  UniverseReviewStatus
} from "@/components/admin/dashboard-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type ReviewDraftState = Record<string, { status: UniverseReviewStatus; note: string }>;

function formatDuration(durationMs: number | null) {
  if (durationMs === null) {
    return "-";
  }

  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }

  return `${(durationMs / 1000).toFixed(1)}s`;
}

export function StatusTab({
  health,
  audits,
  opsHealthReport,
  dailyCycleReport,
  dailyCandidates,
  watchlistTickers,
  onPromoteCandidate,
  onSaveReview,
  loading
}: {
  health: HealthPayload | null;
  audits: AuditItem[];
  opsHealthReport: OpsHealthReportPayload | null;
  dailyCycleReport: DailyCycleReportPayload | null;
  dailyCandidates: UniverseDailyCandidates | null;
  watchlistTickers: string[];
  onPromoteCandidate: (ticker: string) => void;
  onSaveReview: (ticker: string, status: UniverseReviewStatus, note: string) => void;
  loading: boolean;
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
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>서비스 상태</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <MetricCard label="service" value={health?.status ?? "not_loaded"} note={health?.service ?? "not loaded"} />
            <MetricCard
              label="provider"
              value={health?.dataProvider.lastUsed?.provider ?? health?.dataProvider.configured.provider ?? "unknown"}
              note={health?.dataProvider.lastUsed?.mode ?? health?.dataProvider.configured.mode ?? "unknown"}
            />
            <MetricCard
              label="fallback"
              value={health?.dataProvider.fallbackTriggered ? "triggered" : "idle"}
              note={health?.warnings[0] ?? "primary provider serving normally"}
            />
            <MetricCard
              label="recent audit"
              value={String(health?.recentAuditCount ?? 0)}
              note="recent audit rows from health view"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>최근 감사 로그</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {audits.length ? (
              audits.map((item) => (
                <div key={item.id} className="rounded-2xl border border-border/70 bg-secondary/35 p-4">
                  <p className="text-sm font-semibold text-white">{item.summary}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatAuditEventType(item.eventType)} | {item.actor} | {formatDateTime(item.createdAt)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">감사 로그가 아직 없습니다.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>자동 복구 상태</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <MetricCard
              label="last check"
              value={opsHealthReport ? formatDateTime(opsHealthReport.checkedAt) : "none"}
              note={opsHealthReport?.mode ?? "ops:check not run yet"}
            />
            <MetricCard
              label="initial"
              value={opsHealthReport?.initialHealth.status ?? "unknown"}
              note={opsHealthReport?.initialHealth.warnings[0] ?? "no warnings"}
            />
            <MetricCard
              label="final"
              value={opsHealthReport?.finalHealth.status ?? "unknown"}
              note={opsHealthReport?.finalHealth.warnings[0] ?? "no warnings"}
            />
            <MetricCard
              label="recovery"
              value={opsHealthReport?.recovery?.attempted ? "attempted" : "not_run"}
              note={
                opsHealthReport?.recovery
                  ? `refresh ${formatDuration(opsHealthReport.recovery.timings.refreshExternalMs)}`
                  : "auto recovery not attempted"
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily cycle 상태</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <MetricCard
              label="run status"
              value={dailyCycleReport?.status ?? "none"}
              note={dailyCycleReport?.error ?? "latest-daily-cycle.json"}
            />
            <MetricCard
              label="completed"
              value={dailyCycleReport?.completedAt ? formatDateTime(dailyCycleReport.completedAt) : "running"}
              note={dailyCycleReport?.startedAt ? `started ${formatDateTime(dailyCycleReport.startedAt)}` : "not run yet"}
            />
            <MetricCard
              label="batches"
              value={
                dailyCycleReport?.summary
                  ? `${dailyCycleReport.summary.succeededBatches}/${dailyCycleReport.summary.totalBatches}`
                  : "0/0"
              }
              note={
                dailyCycleReport?.summary
                  ? `failed ${dailyCycleReport.summary.failedBatchCount}, batch size ${dailyCycleReport.summary.batchSize ?? 0}`
                  : "no cycle summary"
              }
            />
            <MetricCard
              label="candidates"
              value={String(dailyCycleReport?.summary?.topCandidateCount ?? 0)}
              note={dailyCycleReport?.summary?.generatedAt ? formatDateTime(dailyCycleReport.summary.generatedAt) : "no candidate file"}
            />
          </CardContent>
          <CardContent className="space-y-3 pt-0">
            {dailyCycleReport?.steps?.length ? (
              dailyCycleReport.steps.map((step) => (
                <div key={`${step.name}-${step.startedAt}`} className="rounded-2xl border border-border/70 bg-secondary/35 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">{step.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {step.status} | {formatDuration(step.durationMs)}
                    </p>
                  </div>
                  {step.error ? <p className="mt-2 text-xs text-destructive">{step.error}</p> : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">아직 기록된 daily cycle step이 없습니다.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>유니버스 스캔 상태</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <MetricCard
              label="generated"
              value={dailyCandidates ? formatDateTime(dailyCandidates.generatedAt) : "none"}
              note="daily-candidates.json"
            />
            <MetricCard
              label="tickers"
              value={String(dailyCandidates?.totalTickers ?? 0)}
              note={`batch size ${dailyCandidates?.batchSize ?? 0}`}
            />
            <MetricCard
              label="success"
              value={`${dailyCandidates?.succeededBatches ?? 0}/${dailyCandidates?.totalBatches ?? 0}`}
              note="latest batch scan result"
            />
            <MetricCard
              label="failed"
              value={String(dailyCandidates?.failedBatches.length ?? 0)}
              note={dailyCandidates?.failedBatches[0]?.errors[0] ?? "no failed batches"}
            />
          </CardContent>
          {dailyCandidates?.failedBatches.length ? (
            <CardContent className="space-y-3 pt-0">
              {dailyCandidates.failedBatches.slice(0, 3).map((batch) => (
                <div key={batch.batch} className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
                  <p className="text-sm font-semibold text-white">
                    Batch {batch.batch} failed, {batch.count} tickers
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{batch.errors.join(" | ")}</p>
                </div>
              ))}
            </CardContent>
          ) : null}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>상위 유니버스 후보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dailyCandidates?.topCandidates.length ? (
              dailyCandidates.topCandidates.slice(0, 5).map((item) => {
                const draft = reviewDrafts[item.ticker] ?? { status: "new" as UniverseReviewStatus, note: "" };
                return (
                  <div key={item.ticker} className="rounded-2xl border border-border/70 bg-secondary/35 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-white">
                        {item.company} {item.ticker}
                      </p>
                      <div className="flex items-center gap-2">
                        {watchlistTickers.includes(item.ticker) ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-positive/40 bg-positive/10 px-2.5 py-1 text-[11px] text-positive">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            watchlist
                          </span>
                        ) : null}
                        <p className="text-xs text-primary">candidate {item.candidateScore}</p>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      batch {item.batch} | {item.signalTone} | {item.eventCoverage}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">{item.rationale}</p>
                    <div className="mt-3 grid gap-3 lg:grid-cols-[180px_1fr_auto]">
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">검토 상태</p>
                        <select
                          className="h-10 w-full rounded-xl border border-border/70 bg-background px-3 text-sm text-white"
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
                            현재 상태: {formatUniverseReviewStatus(item.review.status)} | {item.review.updatedBy} |{" "}
                            {formatDateTime(item.review.updatedAt)}
                          </p>
                        ) : null}
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">운영 메모</p>
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
                      <div className="flex flex-col justify-end gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={loading}
                          onClick={() => onSaveReview(item.ticker, draft.status, draft.note)}
                        >
                          검토 저장
                        </Button>
                        <Button
                          size="sm"
                          variant={watchlistTickers.includes(item.ticker) ? "outline" : "default"}
                          disabled={loading || watchlistTickers.includes(item.ticker)}
                          onClick={() => onPromoteCandidate(item.ticker)}
                        >
                          <ArrowRight className="h-4 w-4" />
                          {watchlistTickers.includes(item.ticker) ? "편입 완료" : "watchlist 편입"}
                        </Button>
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>최근 배치 요약</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {dailyCandidates?.batchSummaries.length ? (
            dailyCandidates.batchSummaries.slice(0, 5).map((batch) => (
              <div key={`${batch.batch}-${batch.generatedAt}`} className="rounded-2xl border border-border/70 bg-secondary/35 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">
                    Batch {batch.batch} | tickers {batch.count} | tracking {batch.trackingRows}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(batch.generatedAt)}</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Top ticker {batch.topTicker ?? "none"}</p>
                {batch.warnings?.length ? <p className="mt-2 text-xs text-destructive">{batch.warnings.join(" | ")}</p> : null}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">아직 기록된 배치 요약이 없습니다.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
