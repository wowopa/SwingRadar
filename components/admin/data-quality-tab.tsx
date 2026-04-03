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
  SnapshotGenerationReportPayload,
  ThresholdAdviceReportPayload
} from "@/components/admin/dashboard-types";
import { formatBytes, formatDuration, formatPercent, formatShortDate } from "@/components/admin/admin-status-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DataQualityTab({
  dataQualitySummary,
  dailyCycleReport,
  opsHealthReport,
  autoHealReport,
  newsFetchReport,
  snapshotGenerationReport,
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
  snapshotGenerationReport: SnapshotGenerationReportPayload | null;
  thresholdAdviceReport: ThresholdAdviceReportPayload | null;
  accessStatsReport: AccessStatsReportPayload | null;
  runtimeStorageReport: RuntimeStorageReportPayload | null;
  databaseStorageReport: DatabaseStorageReportPayload | null;
  postLaunchHistory: PostLaunchHistoryEntryPayload[];
}) {
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Data Quality</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <MetricCard
            label="validation fallback"
            value={formatPercent(dataQualitySummary?.validationFallbackPercent)}
            note={`${dataQualitySummary?.validationFallbackCount ?? 0}건 fallback`}
          />
          <MetricCard
            label="measured"
            value={formatPercent(dataQualitySummary?.measuredValidationPercent)}
            note="실측 기반 검증 비율"
          />
          <MetricCard
            label="news live"
            value={formatPercent(dataQualitySummary?.newsLiveFetchPercent)}
            note="실시간 기사 fetch 비율"
          />
          <MetricCard
            label="news cache"
            value={formatPercent(dataQualitySummary?.newsCacheFallbackPercent)}
            note="cache fallback 비율"
          />
          <MetricCard
            label="news file"
            value={formatPercent(dataQualitySummary?.newsFileFallbackPercent)}
            note="file fallback 비율"
          />
          <MetricCard
            label="snapshot"
            value={snapshotGenerationReport?.generatedAt ? formatDateTime(snapshotGenerationReport.generatedAt) : "대기"}
            note={`${snapshotGenerationReport?.totalTickers ?? 0} 종목`}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>배치 / 복구 상태</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-4 md:grid-cols-3">
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
            </div>

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
            <CardTitle>뉴스 / validation 근거</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
            ) : (
              <p className="text-sm text-muted-foreground">뉴스 fetch 리포트가 없습니다.</p>
            )}

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
