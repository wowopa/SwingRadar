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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  postLaunchHistory
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
}) {
  const currentPolicy = thresholdAdviceReport?.currentPolicy;

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Data Quality</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <QualityBadge
            label="validation fallback"
            value={formatPercent(dataQualitySummary?.validationFallbackPercent)}
            note={`${dataQualitySummary?.validationFallbackCount ?? 0}건이 fallback 기준으로 생성됐습니다.`}
            tone={getValidationTone(dataQualitySummary?.validationFallbackPercent, currentPolicy)}
          />
          <QualityBadge
            label="measured validation"
            value={formatPercent(dataQualitySummary?.measuredValidationPercent)}
            note="실측 기반 validation 비율입니다."
            tone={(dataQualitySummary?.measuredValidationPercent ?? 0) >= 5 ? "positive" : "caution"}
          />
          <QualityBadge
            label="news live fetch"
            value={formatPercent(dataQualitySummary?.newsLiveFetchPercent)}
            note="live fetch 성공 비율입니다."
            tone={getNewsLiveTone(dataQualitySummary?.newsLiveFetchPercent, currentPolicy)}
          />
          <QualityBadge
            label="news fallback"
            value={formatPercent(
              (dataQualitySummary?.newsCacheFallbackPercent ?? 0) + (dataQualitySummary?.newsFileFallbackPercent ?? 0)
            )}
            note={`cache ${formatPercent(dataQualitySummary?.newsCacheFallbackPercent)} / file ${formatPercent(
              dataQualitySummary?.newsFileFallbackPercent
            )}`}
            tone={
              ((dataQualitySummary?.newsCacheFallbackPercent ?? 0) + (dataQualitySummary?.newsFileFallbackPercent ?? 0)) >= 50
                ? "caution"
                : "neutral"
            }
          />
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
              <p className="text-sm text-muted-foreground">기록된 배치 step이 없습니다.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Threshold 권고</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {thresholdAdviceReport?.recommendations?.length ? (
              thresholdAdviceReport.recommendations.map((item) => (
                <div key={item.key} className="rounded-[24px] border border-caution/25 bg-caution/8 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">{item.key}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.currentValue} → {item.suggestedValue}
                    </p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.reason}</p>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-positive/25 bg-positive/8 p-4 text-sm text-muted-foreground">
                현재 threshold 조정 권고가 없습니다.
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
              value={
                runtimeStorageReport
                  ? Object.entries(runtimeStorageReport.sections).sort((left, right) => right[1].sizeBytes - left[1].sizeBytes)[0]?.[0] ?? "none"
                  : "대기"
              }
              note={
                runtimeStorageReport
                  ? Object.entries(runtimeStorageReport.sections).sort((left, right) => right[1].sizeBytes - left[1].sizeBytes)[0]?.[1]?.sizeLabel ?? "none"
                  : "section metrics pending"
              }
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
