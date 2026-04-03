"use client";

import { CheckCircle2 } from "lucide-react";

import { MetricCard, formatAuditEventType, formatDateTime } from "@/components/admin/dashboard-shared";
import type {
  AdminDataQualitySummaryPayload,
  AuditItem,
  DailyCycleReportPayload,
  HealthPayload,
  OperationalIncident,
  SnapshotGenerationReportPayload
} from "@/components/admin/dashboard-types";
import { formatProviderLabel, formatPercent } from "@/components/admin/admin-status-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function OverviewTab({
  overallStatus,
  health,
  incidents,
  dailyCycleReport,
  snapshotGenerationReport,
  dataQualitySummary,
  audits
}: {
  overallStatus: "ok" | "warning" | "critical";
  health: HealthPayload | null;
  incidents: OperationalIncident[];
  dailyCycleReport: DailyCycleReportPayload | null;
  snapshotGenerationReport: SnapshotGenerationReportPayload | null;
  dataQualitySummary: AdminDataQualitySummaryPayload | null;
  audits: AuditItem[];
}) {
  const latestWarning = health?.warnings[0] ?? "현재 감지된 주요 경고는 없습니다.";
  const incidentTone =
    overallStatus === "critical"
      ? "border-destructive/30 bg-destructive/8"
      : overallStatus === "warning"
        ? "border-caution/30 bg-caution/10"
        : "border-positive/25 bg-positive/8";

  return (
    <div className="grid gap-6">
      <Card className={incidentTone}>
        <CardHeader>
          <CardTitle>운영 개요</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <MetricCard label="전체 상태" value={overallStatus} note={latestWarning} />
          <MetricCard
            label="데이터 제공"
            value={formatProviderLabel(health?.dataProvider.lastUsed?.provider ?? health?.dataProvider.configured.provider)}
            note={health?.dataProvider.fallbackTriggered ? "fallback 감지" : "primary 유지"}
          />
          <MetricCard
            label="오늘 배치"
            value={dailyCycleReport?.status ?? "not_loaded"}
            note={dailyCycleReport?.completedAt ? formatDateTime(dailyCycleReport.completedAt) : "아직 완료 이력 없음"}
          />
          <MetricCard
            label="validation"
            value={formatPercent(dataQualitySummary?.validationFallbackPercent)}
            note={
              dataQualitySummary?.measuredValidationPercent != null
                ? `실측 기반 ${formatPercent(dataQualitySummary.measuredValidationPercent)}`
                : "실측 기반 집계 대기"
            }
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>즉시 확인할 운영 경고</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {incidents.length ? (
              incidents.slice(0, 5).map((item) => (
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
                  <p className="mt-2 text-sm leading-6 text-foreground/80">{item.detail}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {item.source} · {formatDateTime(item.detectedAt)}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-positive/25 bg-positive/8 p-4 text-sm text-foreground">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-positive" />
                  긴급 incident 없음
                </div>
                <p className="mt-2 leading-6 text-muted-foreground">현재 즉시 에스컬레이션할 운영 경고는 없습니다.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>최근 운영 로그</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {audits.length ? (
              audits.slice(0, 6).map((item) => (
                <div key={item.id} className="rounded-[24px] border border-border/70 bg-secondary/45 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">{item.summary}</p>
                    <span
                      className={
                        item.status === "failure"
                          ? "inline-flex rounded-full border border-destructive/25 bg-destructive/8 px-2.5 py-1 text-[11px] text-destructive"
                          : item.status === "warning"
                            ? "inline-flex rounded-full border border-caution/25 bg-caution/10 px-2.5 py-1 text-[11px] text-caution"
                            : "inline-flex rounded-full border border-positive/25 bg-positive/8 px-2.5 py-1 text-[11px] text-positive"
                      }
                    >
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatAuditEventType(item.eventType)} · {item.actor} · {formatDateTime(item.createdAt)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">최근 운영 로그가 없습니다.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>배치 요약</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <MetricCard
            label="후보 수"
            value={String(dailyCycleReport?.summary?.topCandidateCount ?? snapshotGenerationReport?.recommendationCount ?? 0)}
            note={dailyCycleReport?.summary?.generatedAt ? formatDateTime(dailyCycleReport.summary.generatedAt) : "후보 생성 시간 대기"}
          />
          <MetricCard
            label="추천 스냅샷"
            value={String(snapshotGenerationReport?.recommendationCount ?? 0)}
            note={snapshotGenerationReport?.generatedAt ? formatDateTime(snapshotGenerationReport.generatedAt) : "snapshot 대기"}
          />
          <MetricCard
            label="analysis"
            value={String(snapshotGenerationReport?.analysisCount ?? 0)}
            note={`tracking ${snapshotGenerationReport?.trackingHistoryCount ?? 0}`}
          />
          <MetricCard
            label="validation 누락"
            value={String(snapshotGenerationReport?.validationFallbackCount ?? 0)}
            note={formatPercent(dataQualitySummary?.validationFallbackPercent)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
