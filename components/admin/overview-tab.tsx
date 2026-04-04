"use client";

import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";

import { MetricCard, formatAuditEventType, formatDateTime } from "@/components/admin/dashboard-shared";
import type {
  AdminDataQualitySummaryPayload,
  AuditItem,
  DailyCycleReportPayload,
  HealthPayload,
  OperationalIncident,
  SnapshotGenerationReportPayload
} from "@/components/admin/dashboard-types";
import { formatPercent, formatProviderLabel } from "@/components/admin/admin-status-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type OverviewTargetTab = "data-quality" | "candidate-ops" | "notices" | "portfolio";

function StatusPill({
  label,
  value,
  tone
}: {
  label: string;
  value: string;
  tone: "positive" | "caution" | "destructive" | "neutral";
}) {
  const toneClass =
    tone === "positive"
      ? "border-positive/25 bg-positive/8 text-positive"
      : tone === "caution"
        ? "border-caution/25 bg-caution/10 text-caution"
        : tone === "destructive"
          ? "border-destructive/25 bg-destructive/8 text-destructive"
          : "border-border/70 bg-white/70 text-foreground";

  return (
    <div className={`rounded-full border px-3 py-2 text-xs font-medium ${toneClass}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-2">{value}</span>
    </div>
  );
}

function getCycleTone(status: DailyCycleReportPayload["status"] | null | undefined) {
  if (status === "failed") {
    return "destructive";
  }
  if (status === "warning") {
    return "caution";
  }
  if (status === "ok") {
    return "positive";
  }
  return "neutral";
}

export function OverviewTab({
  overallStatus,
  health,
  incidents,
  dailyCycleReport,
  snapshotGenerationReport,
  dataQualitySummary,
  audits,
  onSelectTab
}: {
  overallStatus: "ok" | "warning" | "critical";
  health: HealthPayload | null;
  incidents: OperationalIncident[];
  dailyCycleReport: DailyCycleReportPayload | null;
  snapshotGenerationReport: SnapshotGenerationReportPayload | null;
  dataQualitySummary: AdminDataQualitySummaryPayload | null;
  audits: AuditItem[];
  onSelectTab: (tab: OverviewTargetTab) => void;
}) {
  const latestWarning = health?.warnings[0] ?? "지금 즉시 처리해야 하는 운영 경고는 없습니다.";
  const overallTone =
    overallStatus === "critical" ? "destructive" : overallStatus === "warning" ? "caution" : "positive";
  const incidentTone =
    overallStatus === "critical"
      ? "border-destructive/30 bg-destructive/8"
      : overallStatus === "warning"
        ? "border-caution/30 bg-caution/10"
        : "border-positive/25 bg-positive/8";

  return (
    <div className="grid gap-6">
      <Card className={incidentTone}>
        <CardHeader className="pb-4">
          <CardTitle>운영 개요</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <StatusPill label="전체 상태" value={overallStatus} tone={overallTone} />
            <StatusPill
              label="데이터 제공"
              value={formatProviderLabel(health?.dataProvider.lastUsed?.provider ?? health?.dataProvider.configured.provider)}
              tone={health?.dataProvider.fallbackTriggered ? "caution" : "neutral"}
            />
            <StatusPill
              label="오늘 배치"
              value={dailyCycleReport?.status ?? "not_loaded"}
              tone={getCycleTone(dailyCycleReport?.status)}
            />
            <StatusPill
              label="validation fallback"
              value={formatPercent(dataQualitySummary?.validationFallbackPercent)}
              tone={
                (dataQualitySummary?.validationFallbackPercent ?? 0) >= 80
                  ? "destructive"
                  : (dataQualitySummary?.validationFallbackPercent ?? 0) >= 50
                    ? "caution"
                    : "neutral"
              }
            />
          </div>
          <p className="text-sm leading-6 text-muted-foreground">{latestWarning}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => onSelectTab("data-quality")}>
              데이터 품질 보기
            </Button>
            <Button variant="secondary" size="sm" onClick={() => onSelectTab("candidate-ops")}>
              후보 운영 열기
            </Button>
            <Button variant="secondary" size="sm" onClick={() => onSelectTab("notices")}>
              공지 수정
            </Button>
            <Button variant="outline" size="sm" onClick={() => onSelectTab("portfolio")}>
              내부 포트폴리오
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="incident" value={String(incidents.length)} note="즉시 확인할 운영 경고 수" />
        <MetricCard
          label="오늘 후보"
          value={String(dailyCycleReport?.summary?.topCandidateCount ?? snapshotGenerationReport?.recommendationCount ?? 0)}
          note={dailyCycleReport?.summary?.generatedAt ? formatDateTime(dailyCycleReport.summary.generatedAt) : "후보 생성 시간 대기 중"}
        />
        <MetricCard
          label="추천 스냅샷"
          value={String(snapshotGenerationReport?.recommendationCount ?? 0)}
          note={snapshotGenerationReport?.generatedAt ? formatDateTime(snapshotGenerationReport.generatedAt) : "스냅샷 시간 대기 중"}
        />
        <MetricCard
          label="최근 audit"
          value={String(audits.length)}
          note={audits[0]?.createdAt ? formatDateTime(audits[0].createdAt) : "최근 운영 로그 없음"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
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
                    <div className="flex items-center gap-2">
                      {item.severity === "critical" ? (
                        <ShieldAlert className="h-4 w-4 text-destructive" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-caution" />
                      )}
                      <p className="text-sm font-semibold text-foreground">{item.summary}</p>
                    </div>
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
                <p className="mt-2 leading-6 text-muted-foreground">현재 즉시 에스컬레이션이 필요한 운영 경고는 없습니다.</p>
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
    </div>
  );
}
