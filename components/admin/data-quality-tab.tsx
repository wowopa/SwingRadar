"use client";

import { MetricCard, formatDateTime } from "@/components/admin/dashboard-shared";
import type {
  AccessStatsReportPayload,
  AdminDataQualitySummaryPayload,
  AutoHealReportPayload,
  DatabaseStorageReportPayload,
  DailyCycleReportPayload,
  NewsFetchReportPayload,
  OpsHealthReportPayload,
  PostLaunchHistoryEntryPayload,
  RuntimeStorageReportPayload,
  ThresholdAdviceReportPayload
} from "@/components/admin/dashboard-types";
import { formatBytes, formatDuration, formatPercent, formatShortDate } from "@/components/admin/admin-status-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DataQualityTargetTab = "overview" | "candidate-ops" | "notices";

function QualityBadge({
  label,
  value,
  note,
  tone
}: {
  label: string;
  value: string;
  note: string;
  tone: "positive" | "caution" | "destructive" | "neutral";
}) {
  const toneClass =
    tone === "positive"
      ? "border-positive/25 bg-positive/8"
      : tone === "caution"
        ? "border-caution/25 bg-caution/10"
        : tone === "destructive"
          ? "border-destructive/25 bg-destructive/8"
          : "border-border/70 bg-white/70";

  return (
    <div className={`rounded-[22px] border p-4 ${toneClass}`}>
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{note}</p>
    </div>
  );
}

function getValidationTone(value: number | null | undefined, policy: ThresholdAdviceReportPayload["currentPolicy"] | undefined) {
  const fallback = value ?? 0;
  const warning = policy?.validationFallbackWarningPercent ?? 50;
  const critical = policy?.validationFallbackCriticalPercent ?? 80;

  if (fallback >= critical) {
    return "destructive" as const;
  }
  if (fallback >= warning) {
    return "caution" as const;
  }
  return "positive" as const;
}

function getNewsLiveTone(value: number | null | undefined, policy: ThresholdAdviceReportPayload["currentPolicy"] | undefined) {
  const live = value ?? 0;
  const warning = policy?.newsLiveFetchWarningPercent ?? 70;
  const critical = policy?.newsLiveFetchCriticalPercent ?? 40;

  if (live <= critical) {
    return "destructive" as const;
  }
  if (live <= warning) {
    return "caution" as const;
  }
  return "positive" as const;
}

function getRecommendationAction(key: string): { label: string; tab: DataQualityTargetTab } {
  const normalized = key.toLowerCase();

  if (
    normalized.includes("validation") ||
    normalized.includes("news") ||
    normalized.includes("candidate") ||
    normalized.includes("watchlist")
  ) {
    return { label: "Candidate Ops 열기", tab: "candidate-ops" };
  }

  if (normalized.includes("notice") || normalized.includes("popup")) {
    return { label: "공지 열기", tab: "notices" };
  }

  return { label: "Overview 보기", tab: "overview" };
}

export function DataQualityTab({
  dataQualitySummary,
  dailyCycleReport,
  opsHealthReport,
  autoHealReport,
  newsFetchReport,
  thresholdAdviceReport,
  accessStatsReport,
  runtimeStorageReport,
  databaseStorageReport,
  postLaunchHistory,
  onSelectTab
}: {
  dataQualitySummary: AdminDataQualitySummaryPayload | null;
  dailyCycleReport: DailyCycleReportPayload | null;
  opsHealthReport: OpsHealthReportPayload | null;
  autoHealReport: AutoHealReportPayload | null;
  newsFetchReport: NewsFetchReportPayload | null;
  thresholdAdviceReport: ThresholdAdviceReportPayload | null;
  accessStatsReport: AccessStatsReportPayload | null;
  runtimeStorageReport: RuntimeStorageReportPayload | null;
  databaseStorageReport: DatabaseStorageReportPayload | null;
  postLaunchHistory: PostLaunchHistoryEntryPayload[];
  onSelectTab: (tab: DataQualityTargetTab) => void;
}) {
  const currentPolicy = thresholdAdviceReport?.currentPolicy;
  const validationFallbackPercent = dataQualitySummary?.validationFallbackPercent ?? 0;
  const measuredValidationPercent = dataQualitySummary?.measuredValidationPercent ?? 0;
  const validationBasisPercentages = dataQualitySummary?.validationBasisPercentages;
  const failedBatchCount = dataQualitySummary?.failedBatchCount ?? 0;
  const failedBatchPercent = dataQualitySummary?.failedBatchPercent ?? 0;
  const failedBatchSteps = dataQualitySummary?.failedBatchSteps ?? [];
  const newsLiveFetchPercent = dataQualitySummary?.newsLiveFetchPercent ?? 0;
  const validationTrackingRecoveredCount = dataQualitySummary?.validationTrackingRecoveredCount ?? 0;
  const validationTrackingRecoveredPercent = dataQualitySummary?.validationTrackingRecoveredPercent ?? 0;
  const validationFallbackDetails = dataQualitySummary?.validationFallbackDetails ?? [];
  const runtimeSyncTrust = dataQualitySummary?.runtimeSyncTrust ?? null;
  const newsFallbackPercent =
    (dataQualitySummary?.newsCacheFallbackPercent ?? 0) + (dataQualitySummary?.newsFileFallbackPercent ?? 0);
  const needsFollowup =
    validationFallbackPercent >= 50 ||
    newsLiveFetchPercent <= 70 ||
    failedBatchPercent > 0 ||
    runtimeSyncTrust?.status === "blocked";
  const largestRuntimeSection = runtimeStorageReport
    ? Object.entries(runtimeStorageReport.sections).sort((left, right) => right[1].sizeBytes - left[1].sizeBytes)[0]
    : null;

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Data Quality</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => onSelectTab("overview")}>
              Overview로 돌아가기
            </Button>
            <Button variant="outline" size="sm" onClick={() => onSelectTab("candidate-ops")}>
              Candidate Ops 열기
            </Button>
            <Button variant="outline" size="sm" onClick={() => onSelectTab("notices")}>
              공지 열기
            </Button>
            {needsFollowup ? (
              <span className="inline-flex rounded-full border border-caution/25 bg-caution/10 px-3 py-2 text-xs font-medium text-caution">
                지금은 후보 운영 전 데이터 품질 경고를 먼저 확인하는 편이 좋습니다.
              </span>
            ) : (
              <span className="inline-flex rounded-full border border-positive/25 bg-positive/8 px-3 py-2 text-xs font-medium text-positive">
                현재 기준에서는 데이터 품질 지표가 비교적 안정적입니다.
              </span>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <QualityBadge
              label="validation fallback"
              value={formatPercent(validationFallbackPercent)}
              note={`${dataQualitySummary?.validationFallbackCount ?? 0}건이 fallback 기준으로 생성되었습니다.`}
              tone={getValidationTone(validationFallbackPercent, currentPolicy)}
            />
            <QualityBadge
              label="measured validation"
              value={formatPercent(measuredValidationPercent)}
              note="실측 기반 validation 비율입니다."
              tone={measuredValidationPercent >= 5 ? "positive" : "caution"}
            />
            <QualityBadge
              label="failed batches"
              value={failedBatchCount > 0 ? `${failedBatchCount}건` : "0건"}
              note={
                failedBatchPercent > 0
                  ? `전체 배치의 ${formatPercent(failedBatchPercent)}가 실패했습니다.`
                  : "현재 보고 기준으로 실패 배치가 없습니다."
              }
              tone={failedBatchPercent >= 20 ? "destructive" : failedBatchPercent > 0 ? "caution" : "positive"}
            />
            <QualityBadge
              label="news live fetch"
              value={formatPercent(newsLiveFetchPercent)}
              note="live fetch 성공 비율입니다."
              tone={getNewsLiveTone(newsLiveFetchPercent, currentPolicy)}
            />
            <QualityBadge
              label="news fallback"
              value={formatPercent(newsFallbackPercent)}
              note={`cache ${formatPercent(dataQualitySummary?.newsCacheFallbackPercent)} / file ${formatPercent(
                dataQualitySummary?.newsFileFallbackPercent
              )}`}
              tone={newsFallbackPercent >= 50 ? "caution" : "neutral"}
            />
          </div>

          {validationBasisPercentages ? (
            <div className="rounded-[24px] border border-border/70 bg-secondary/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">Validation 근거 분포</p>
                <p className="text-xs text-muted-foreground">
                  실측 {formatPercent(validationBasisPercentages.measured)} / 업종 {formatPercent(validationBasisPercentages.sector)}
                </p>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <QualityBadge
                  label="measured"
                  value={formatPercent(validationBasisPercentages.measured)}
                  note="같은 종목 종료 이력 기반"
                  tone={validationBasisPercentages.measured >= 5 ? "positive" : "caution"}
                />
                <QualityBadge
                  label="tracking"
                  value={formatPercent(validationBasisPercentages.tracking)}
                  note="공용 추적 종료 이력 참고"
                  tone={validationBasisPercentages.tracking >= 5 ? "neutral" : "caution"}
                />
                <QualityBadge
                  label="sector"
                  value={formatPercent(validationBasisPercentages.sector)}
                  note="유사 업종 fallback"
                  tone={validationBasisPercentages.sector >= 50 ? "caution" : "neutral"}
                />
                <QualityBadge
                  label="pattern"
                  value={formatPercent(validationBasisPercentages.pattern)}
                  note="유사 흐름 fallback"
                  tone={validationBasisPercentages.pattern >= 20 ? "neutral" : "caution"}
                />
                <QualityBadge
                  label="heuristic"
                  value={formatPercent(validationBasisPercentages.heuristic)}
                  note="보수 계산 fallback"
                  tone={validationBasisPercentages.heuristic > 0 ? "destructive" : "positive"}
                />
              </div>
            </div>
          ) : null}

          {validationFallbackDetails.length || validationTrackingRecoveredCount > 0 ? (
            <div className="rounded-[24px] border border-border/70 bg-secondary/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Fallback recovery and hotspots</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Shared tracking recovery {validationTrackingRecoveredCount} tickers / {formatPercent(validationTrackingRecoveredPercent)}
                  </p>
                </div>
                <div className="inline-flex rounded-full border border-border/70 bg-white/80 px-3 py-1 text-xs text-muted-foreground">
                  Remaining fallback {validationFallbackDetails.length}
                </div>
              </div>
              {validationFallbackDetails.length ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {validationFallbackDetails.slice(0, 6).map((item) => (
                    <div key={`${item.ticker}-${item.basis}`} className="rounded-[22px] border border-border/70 bg-white/80 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-foreground">{item.ticker}</p>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{item.basis}</p>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">
                        sample {item.sampleSize}. Lower this bucket first before widening rollout.
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>배치 / 복구 상태</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <MetricCard
              label="daily cycle"
              value={dailyCycleReport?.status ?? "none"}
              note={dailyCycleReport?.completedAt ? formatDateTime(dailyCycleReport.completedAt) : "완료 이력 없음"}
            />
            <MetricCard
              label="ops check"
              value={opsHealthReport?.finalHealth.status ?? "unknown"}
              note={opsHealthReport?.checkedAt ? formatDateTime(opsHealthReport.checkedAt) : "체크 이력 없음"}
            />
            <MetricCard
              label="auto heal"
              value={autoHealReport?.status ?? "none"}
              note={autoHealReport?.completedAt ? formatDateTime(autoHealReport.completedAt) : "복구 이력 없음"}
            />
          </CardContent>
          <CardContent className="space-y-3 pt-0">
            {dailyCycleReport?.steps?.length ? (
              dailyCycleReport.steps.map((step) => (
                <div key={`${step.name}-${step.startedAt}`} className="rounded-[24px] border border-border/70 bg-secondary/45 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">{step.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {step.status} · {formatDuration(step.durationMs)}
                    </p>
                  </div>
                  {step.error ? <p className="mt-2 text-xs text-destructive">{step.error}</p> : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">기록된 배치 step이 아직 없습니다.</p>
            )}
            {failedBatchSteps.length ? (
              <div className="rounded-[24px] border border-caution/25 bg-caution/8 p-4">
                <p className="text-sm font-semibold text-foreground">Latest failed steps</p>
                <div className="mt-3 space-y-2">
                  {failedBatchSteps.slice(0, 4).map((step) => (
                    <div key={`${step.name}-${step.status}`} className="rounded-[18px] border border-border/70 bg-white/80 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-foreground">{step.name}</p>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{step.status}</p>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">{step.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {runtimeSyncTrust ? (
              <div className="rounded-[24px] border border-border/70 bg-secondary/35 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Runtime sync trust</p>
                    <p className="mt-1 text-xs text-muted-foreground">{runtimeSyncTrust.summary}</p>
                  </div>
                  <div
                    className={
                      runtimeSyncTrust.status === "blocked"
                        ? "inline-flex rounded-full border border-destructive/25 bg-destructive/8 px-3 py-1 text-xs text-destructive"
                        : runtimeSyncTrust.status === "watch"
                          ? "inline-flex rounded-full border border-caution/25 bg-caution/10 px-3 py-1 text-xs text-caution"
                          : "inline-flex rounded-full border border-positive/25 bg-positive/8 px-3 py-1 text-xs text-positive"
                    }
                  >
                    {runtimeSyncTrust.label}
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {runtimeSyncTrust.checks.slice(0, 6).map((check) => (
                    <div key={check.key} className="rounded-[18px] border border-border/70 bg-white/80 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-foreground">{check.label}</p>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{check.status}</p>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">{check.note}</p>
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        {check.updatedAt ? formatDateTime(check.updatedAt) : "missing"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Threshold 권고</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {thresholdAdviceReport?.recommendations?.length ? (
              thresholdAdviceReport.recommendations.map((item) => {
                const action = getRecommendationAction(item.key);

                return (
                  <div key={item.key} className="rounded-[24px] border border-caution/25 bg-caution/8 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-foreground">{item.key}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.currentValue} → {item.suggestedValue}
                      </p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.reason}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => onSelectTab(action.tab)}>
                        {action.label}
                      </Button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-[24px] border border-positive/25 bg-positive/8 p-4 text-sm text-muted-foreground">
                현재 threshold 조정 권고는 없습니다.
              </div>
            )}

            {newsFetchReport ? (
              <div className="rounded-[24px] border border-border/70 bg-secondary/45 p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <MetricCard
                    label="요청 종목"
                    value={String(newsFetchReport.totalTickers)}
                    note={`${newsFetchReport.totalItems}건 기사 적재`}
                  />
                  <MetricCard
                    label="provider order"
                    value={newsFetchReport.providerOrder.join(" → ")}
                    note={newsFetchReport.completedAt ? formatDateTime(newsFetchReport.completedAt) : "뉴스 수집 진행 중"}
                  />
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>저장소 상태</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <MetricCard
              label="runtime"
              value={runtimeStorageReport?.totalSizeLabel ?? "대기"}
              note={runtimeStorageReport ? `${runtimeStorageReport.totalFiles.toLocaleString()} files` : "runtime metrics pending"}
            />
            <MetricCard
              label="database"
              value={databaseStorageReport?.databaseSizeLabel ?? "대기"}
              note={databaseStorageReport?.checkedAt ? formatDateTime(databaseStorageReport.checkedAt) : "database metrics pending"}
            />
            <MetricCard
              label="largest section"
              value={largestRuntimeSection?.[0] ?? "none"}
              note={largestRuntimeSection?.[1]?.sizeLabel ?? "section metrics pending"}
            />
            <MetricCard
              label="largest doc"
              value={databaseStorageReport?.runtimeDocuments.largestDocuments[0]?.name ?? "none"}
              note={databaseStorageReport?.runtimeDocuments.largestDocuments[0]?.payloadLabel ?? "document metrics pending"}
            />
          </CardContent>
          {runtimeStorageReport ? (
            <CardContent className="space-y-3 pt-0">
              {Object.entries(runtimeStorageReport.sections)
                .sort((left, right) => right[1].sizeBytes - left[1].sizeBytes)
                .slice(0, 4)
                .map(([section, info]) => (
                  <div key={section} className="rounded-[24px] border border-border/70 bg-secondary/45 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-foreground">{section}</p>
                      <p className="text-xs text-muted-foreground">{info.sizeLabel}</p>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {info.fileCount.toLocaleString()} files · raw {formatBytes(info.sizeBytes)}
                    </p>
                  </div>
                ))}
            </CardContent>
          ) : null}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>운영 흐름 참고</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {accessStatsReport ? (
              <div className="rounded-[24px] border border-border/70 bg-secondary/45 p-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <MetricCard
                    label="today UV"
                    value={accessStatsReport.today.uniqueVisitors.toLocaleString()}
                    note={formatShortDate(accessStatsReport.today.date)}
                  />
                  <MetricCard
                    label="7d UV"
                    value={accessStatsReport.last7Days.uniqueVisitors.toLocaleString()}
                    note={`${formatShortDate(accessStatsReport.last7Days.startDate)} ~ ${formatShortDate(accessStatsReport.last7Days.endDate)}`}
                  />
                  <MetricCard
                    label="30d UV"
                    value={accessStatsReport.last30Days.uniqueVisitors.toLocaleString()}
                    note={`${formatShortDate(accessStatsReport.last30Days.startDate)} ~ ${formatShortDate(accessStatsReport.last30Days.endDate)}`}
                  />
                </div>
              </div>
            ) : null}

            {postLaunchHistory.length ? (
              postLaunchHistory.map((item) => (
                <div key={item.checkedAt} className="rounded-[24px] border border-border/70 bg-secondary/45 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">{formatDateTime(item.checkedAt)}</p>
                    <p className="text-xs text-muted-foreground">{item.overallStatus}</p>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    critical {item.incidents.criticalCount} · warning {item.incidents.warningCount} · audits {item.audits.failureCount} failure
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">운영 히스토리가 아직 없습니다.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
