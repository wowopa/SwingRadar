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
  AutoHealReportPayload,
  DailyCycleReportPayload,
  HealthPayload,
  NewsFetchReportPayload,
  OperationalIncident,
  OpsHealthReportPayload,
  PostLaunchHistoryEntryPayload,
  SnapshotGenerationReportPayload,
  ThresholdAdviceReportPayload,
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
  incidents,
  audits,
  opsHealthReport,
  dailyCycleReport,
  autoHealReport,
  newsFetchReport,
  snapshotGenerationReport,
  postLaunchHistory,
  thresholdAdviceReport,
  dailyCandidates,
  watchlistTickers,
  onPromoteCandidate,
  onSaveReview,
  loading
}: {
  health: HealthPayload | null;
  incidents: OperationalIncident[];
  audits: AuditItem[];
  opsHealthReport: OpsHealthReportPayload | null;
  dailyCycleReport: DailyCycleReportPayload | null;
  autoHealReport: AutoHealReportPayload | null;
  newsFetchReport: NewsFetchReportPayload | null;
  snapshotGenerationReport: SnapshotGenerationReportPayload | null;
  postLaunchHistory: PostLaunchHistoryEntryPayload[];
  thresholdAdviceReport: ThresholdAdviceReportPayload | null;
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
      {incidents.length ? (
        <Card className={incidents.some((item) => item.severity === "critical") ? "border-destructive/30" : "border-caution/30"}>
          <CardHeader>
            <CardTitle>운영 에스컬레이션</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {incidents.slice(0, 4).map((item) => (
              <div
                key={item.id}
                className={
                  item.severity === "critical"
                    ? "rounded-[24px] border border-destructive/25 bg-destructive/5 p-4"
                    : "rounded-[24px] border border-caution/25 bg-caution/8 p-4"
                }
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">{item.summary}</p>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{item.severity}</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-foreground/78">{item.detail}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {item.source} | {formatDateTime(item.detectedAt)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>서비스 상태</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <MetricCard label="서비스" value={health?.status ?? "not_loaded"} note={health?.service ?? "not loaded"} />
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
              label="감사 로그"
              value={String(health?.recentAuditCount ?? 0)}
              note="최근 health 기준 audit rows"
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
                <div key={item.id} className="rounded-[24px] border border-border/70 bg-secondary/45 p-4">
                  <p className="text-sm font-semibold text-foreground">{item.summary}</p>
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
              label="마지막 점검"
              value={opsHealthReport ? formatDateTime(opsHealthReport.checkedAt) : "none"}
              note={opsHealthReport?.mode ?? "ops:check not run yet"}
            />
            <MetricCard
              label="초기 상태"
              value={opsHealthReport?.initialHealth.status ?? "unknown"}
              note={opsHealthReport?.initialHealth.warnings[0] ?? "no warnings"}
            />
            <MetricCard
              label="최종 상태"
              value={opsHealthReport?.finalHealth.status ?? "unknown"}
              note={opsHealthReport?.finalHealth.warnings[0] ?? "no warnings"}
            />
            <MetricCard
              label="복구 실행"
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
              label="실행 상태"
              value={dailyCycleReport?.status ?? "none"}
              note={dailyCycleReport?.error ?? "latest-daily-cycle.json"}
            />
            <MetricCard
              label="완료 시각"
              value={dailyCycleReport?.completedAt ? formatDateTime(dailyCycleReport.completedAt) : "running"}
              note={dailyCycleReport?.startedAt ? `started ${formatDateTime(dailyCycleReport.startedAt)}` : "not run yet"}
            />
            <MetricCard
              label="배치"
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
              label="후보 수"
              value={String(dailyCycleReport?.summary?.topCandidateCount ?? 0)}
              note={dailyCycleReport?.summary?.generatedAt ? formatDateTime(dailyCycleReport.summary.generatedAt) : "no candidate file"}
            />
          </CardContent>
          <CardContent className="space-y-3 pt-0">
            {dailyCycleReport?.steps?.length ? (
              dailyCycleReport.steps.map((step) => (
                <div key={`${step.name}-${step.startedAt}`} className="rounded-[24px] border border-border/70 bg-secondary/45 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">{step.name}</p>
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

      <Card>
        <CardHeader>
          <CardTitle>자동 복구 실행</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <MetricCard
            label="최근 실행"
            value={autoHealReport?.completedAt ? formatDateTime(autoHealReport.completedAt) : "none"}
            note={autoHealReport?.status ?? "ops:auto-heal not run yet"}
          />
          <MetricCard
            label="트리거"
            value={String(autoHealReport?.triggers.length ?? 0)}
            note={autoHealReport?.triggers[0] ?? "no triggers"}
          />
          <MetricCard
            label="액션"
            value={String(autoHealReport?.actions.length ?? 0)}
            note={autoHealReport?.actions[0]?.name ?? "no actions"}
          />
          <MetricCard
            label="결과"
            value={autoHealReport?.status ?? "unknown"}
            note={autoHealReport?.error ?? "latest-auto-heal.json"}
          />
        </CardContent>
        <CardContent className="space-y-3 pt-0">
          {autoHealReport?.actions.length ? (
            autoHealReport.actions.map((action) => (
              <div key={`${action.name}-${action.startedAt}`} className="rounded-[24px] border border-border/70 bg-secondary/45 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">{action.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {action.status} | {formatDuration(action.durationMs)}
                  </p>
                </div>
                <p className="mt-2 text-sm leading-6 text-foreground/78">{action.detail}</p>
                {action.error ? <p className="mt-2 text-xs text-destructive">{action.error}</p> : null}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">아직 자동 복구 실행 이력이 없습니다.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Threshold advice</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <MetricCard
              label="sample"
              value={String(thresholdAdviceReport?.sampleSize ?? 0)}
              note={thresholdAdviceReport?.generatedAt ? formatDateTime(thresholdAdviceReport.generatedAt) : "no advice"}
            />
            <MetricCard
              label="avg warning"
              value={
                thresholdAdviceReport
                  ? thresholdAdviceReport.observations.averageWarningIncidents.toFixed(1)
                  : "0.0"
              }
              note={
                thresholdAdviceReport
                  ? `critical ${thresholdAdviceReport.observations.averageCriticalIncidents.toFixed(1)}`
                  : "no observations"
              }
            />
            <MetricCard
              label="live fetch"
              value={
                thresholdAdviceReport?.observations.latestLiveFetchPercent !== null &&
                thresholdAdviceReport?.observations.latestLiveFetchPercent !== undefined
                  ? `${thresholdAdviceReport.observations.latestLiveFetchPercent}%`
                  : "n/a"
              }
              note={
                thresholdAdviceReport?.observations.latestValidationFallbackCount !== null &&
                thresholdAdviceReport?.observations.latestValidationFallbackCount !== undefined
                  ? `validation ${thresholdAdviceReport.observations.latestValidationFallbackCount}`
                  : "no snapshot data"
              }
            />
            <MetricCard
              label="changes"
              value={String(thresholdAdviceReport?.recommendations.length ?? 0)}
              note={thresholdAdviceReport?.recommendations[0]?.key ?? "keep current policy"}
            />
          </CardContent>
          <CardContent className="space-y-3 pt-0">
            {thresholdAdviceReport?.recommendations.length ? (
              thresholdAdviceReport.recommendations.map((item) => (
                <div key={item.key} className="rounded-[24px] border border-border/70 bg-secondary/45 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">{item.key}</p>
                    <p className="text-xs text-muted-foreground">
                      {`${item.currentValue} -> ${item.suggestedValue}`}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-foreground/78">{item.reason}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Current policy looks stable with recent runs.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Post-launch trend</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <MetricCard
              label="check count"
              value={String(postLaunchHistory.length)}
              note={postLaunchHistory[0]?.checkedAt ? formatDateTime(postLaunchHistory[0].checkedAt) : "no history"}
            />
            <MetricCard
              label="latest overall"
              value={postLaunchHistory[0]?.overallStatus ?? "none"}
              note={postLaunchHistory[0]?.healthStatus ?? "no health"}
            />
            <MetricCard
              label="critical"
              value={String(postLaunchHistory[0]?.incidents.criticalCount ?? 0)}
              note={`warning ${postLaunchHistory[0]?.incidents.warningCount ?? 0}`}
            />
            <MetricCard
              label="audit failures"
              value={String(postLaunchHistory[0]?.audits.failureCount ?? 0)}
              note={`warnings ${postLaunchHistory[0]?.audits.warningCount ?? 0}`}
            />
          </CardContent>
          <CardContent className="space-y-3 pt-0">
            {postLaunchHistory.length ? (
              postLaunchHistory.map((entry) => (
                <div key={entry.checkedAt} className="rounded-[24px] border border-border/70 bg-secondary/45 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">{formatDateTime(entry.checkedAt)}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.overallStatus} | health {entry.healthStatus}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-foreground/78">
                    critical {entry.incidents.criticalCount} / warning {entry.incidents.warningCount} / audit failure{" "}
                    {entry.audits.failureCount}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No post-launch history yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>뉴스 수집 품질</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <MetricCard
              label="마지막 수집"
              value={newsFetchReport?.completedAt ? formatDateTime(newsFetchReport.completedAt) : "none"}
              note={newsFetchReport ? `provider ${newsFetchReport.requestedProvider}` : "no report"}
            />
            <MetricCard
              label="실시간 성공"
              value={newsFetchReport ? `${newsFetchReport.liveFetchTickers}/${newsFetchReport.totalTickers}` : "0/0"}
              note={newsFetchReport ? `items ${newsFetchReport.totalItems}` : "no data"}
            />
            <MetricCard
              label="fallback"
              value={newsFetchReport ? String(newsFetchReport.cacheFallbackTickers + newsFetchReport.fileFallbackTickers) : "0"}
              note={
                newsFetchReport
                  ? `cache ${newsFetchReport.cacheFallbackTickers} / file ${newsFetchReport.fileFallbackTickers}`
                  : "no fallback"
              }
            />
            <MetricCard
              label="retry"
              value={String(newsFetchReport?.retryCount ?? 0)}
              note={newsFetchReport?.providerFailures[0]?.message ?? "no retry"}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>스냅샷 생성 품질</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <MetricCard
              label="생성 시각"
              value={snapshotGenerationReport ? formatDateTime(snapshotGenerationReport.generatedAt) : "none"}
              note={snapshotGenerationReport?.completedAt ? formatDateTime(snapshotGenerationReport.completedAt) : "no report"}
            />
            <MetricCard
              label="종목 수"
              value={String(snapshotGenerationReport?.totalTickers ?? 0)}
              note={`추천 ${snapshotGenerationReport?.recommendationCount ?? 0}`}
            />
            <MetricCard
              label="검증 fallback"
              value={String(snapshotGenerationReport?.validationFallbackCount ?? 0)}
              note={snapshotGenerationReport?.validationFallbackTickers[0] ?? "none"}
            />
            <MetricCard
              label="추적 행"
              value={String(snapshotGenerationReport?.trackingHistoryCount ?? 0)}
              note={`분석 ${snapshotGenerationReport?.analysisCount ?? 0}`}
            />
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
              label="생성 시각"
              value={dailyCandidates ? formatDateTime(dailyCandidates.generatedAt) : "none"}
              note="daily-candidates.json"
            />
            <MetricCard
              label="대상 종목"
              value={String(dailyCandidates?.totalTickers ?? 0)}
              note={`batch size ${dailyCandidates?.batchSize ?? 0}`}
            />
            <MetricCard
              label="성공 배치"
              value={`${dailyCandidates?.succeededBatches ?? 0}/${dailyCandidates?.totalBatches ?? 0}`}
              note="latest batch scan result"
            />
            <MetricCard
              label="실패 배치"
              value={String(dailyCandidates?.failedBatches.length ?? 0)}
              note={dailyCandidates?.failedBatches[0]?.errors[0] ?? "no failed batches"}
            />
          </CardContent>
          {dailyCandidates?.failedBatches.length ? (
            <CardContent className="space-y-3 pt-0">
              {dailyCandidates.failedBatches.slice(0, 3).map((batch) => (
                <div key={batch.batch} className="rounded-[24px] border border-destructive/25 bg-destructive/5 p-4">
                  <p className="text-sm font-semibold text-foreground">
                    배치 {batch.batch} 실패, 대상 {batch.count}개
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
                  <div key={item.ticker} className="rounded-[24px] border border-border/70 bg-secondary/45 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-foreground">
                        {item.company} {item.ticker}
                      </p>
                      <div className="flex items-center gap-2">
                        {watchlistTickers.includes(item.ticker) ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-positive/30 bg-positive/10 px-2.5 py-1 text-[11px] text-positive">
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
              <div key={`${batch.batch}-${batch.generatedAt}`} className="rounded-[24px] border border-border/70 bg-secondary/45 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">
                    배치 {batch.batch} | 대상 {batch.count} | tracking {batch.trackingRows}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(batch.generatedAt)}</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">대표 종목 {batch.topTicker ?? "none"}</p>
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
