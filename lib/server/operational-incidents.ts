import type { AuditLogRecord } from "@/lib/server/audit-log";
import { getOperationalPolicy } from "@/lib/server/operations-policy";
import type {
  DailyCycleReport,
  NewsFetchReport,
  OpsHealthCheckReport,
  SnapshotGenerationReport
} from "@/lib/server/ops-reports";
import type { HealthReport } from "@/lib/services/health-service";

export interface OperationalIncident {
  id: string;
  severity: "warning" | "critical";
  source: "health" | "provider" | "daily-cycle" | "ops-recovery" | "data-quality";
  summary: string;
  detail: string;
  detectedAt: string;
}

function getSeverityRank(severity: OperationalIncident["severity"]) {
  return severity === "critical" ? 2 : 1;
}

export function buildOperationalIncidents({
  health,
  opsHealthReport,
  dailyCycleReport,
  newsFetchReport,
  snapshotGenerationReport,
  audits
}: {
  health: HealthReport;
  opsHealthReport: OpsHealthCheckReport | null;
  dailyCycleReport: DailyCycleReport | null;
  newsFetchReport: NewsFetchReport | null;
  snapshotGenerationReport: SnapshotGenerationReport | null;
  audits: AuditLogRecord[];
}) {
  const incidents: OperationalIncident[] = [];
  const policy = getOperationalPolicy();
  const recentFallbackAuditCount = audits.filter((item) => item.eventType === "provider_fallback").length;

  for (const item of health.freshness.filter((entry) => entry.stale)) {
    incidents.push({
      id: `health-${item.label}`,
      severity: item.severity === "critical" ? "critical" : "warning",
      source: "health",
      summary:
        item.severity === "critical"
          ? `${item.label} 스냅샷이 임계 지연 상태입니다`
          : `${item.label} 스냅샷이 지연되고 있습니다`,
      detail: `${item.ageMinutes}분 경과, 생성 시각 ${item.generatedAt}`,
      detectedAt: health.timestamp
    });
  }

  if (health.dataProvider.fallbackTriggered) {
    const severity: OperationalIncident["severity"] =
      recentFallbackAuditCount >= policy.escalation.providerFallbackAuditCount ? "critical" : "warning";

    incidents.push({
      id: "provider-fallback",
      severity,
      source: "provider",
      summary:
        severity === "critical"
          ? "provider fallback이 반복되어 임계 상태로 승격되었습니다"
          : "provider fallback이 감지되었습니다",
      detail: `configured=${health.dataProvider.configured.provider}, serving=${health.dataProvider.lastUsed?.provider ?? "unknown"}, recentFallbackAudits=${recentFallbackAuditCount}`,
      detectedAt: health.timestamp
    });
  }

  if (dailyCycleReport) {
    if (dailyCycleReport.status === "failed") {
      incidents.push({
        id: "daily-cycle-failed",
        severity: "critical",
        source: "daily-cycle",
        summary: "daily cycle이 실패했습니다",
        detail: dailyCycleReport.error ?? "최근 daily cycle이 비정상 종료되었습니다.",
        detectedAt: dailyCycleReport.completedAt ?? dailyCycleReport.startedAt
      });
    } else if (dailyCycleReport.status === "warning" || (dailyCycleReport.summary?.failedBatchCount ?? 0) > 0) {
      incidents.push({
        id: "daily-cycle-warning",
        severity: "warning",
        source: "daily-cycle",
        summary: "daily cycle에 실패 배치가 있습니다",
        detail: `failedBatchCount=${dailyCycleReport.summary?.failedBatchCount ?? 0}, succeeded=${dailyCycleReport.summary?.succeededBatches ?? 0}/${dailyCycleReport.summary?.totalBatches ?? 0}`,
        detectedAt: dailyCycleReport.completedAt ?? dailyCycleReport.startedAt
      });
    }
  }

  if (opsHealthReport && opsHealthReport.finalHealth.status === "warning") {
    const attemptedRecovery = Boolean(opsHealthReport.recovery?.attempted);
    incidents.push({
      id: "ops-recovery-warning",
      severity: attemptedRecovery ? "critical" : "warning",
      source: "ops-recovery",
      summary: attemptedRecovery ? "자동 복구 후에도 health 경고가 남아 있습니다" : "ops health check에서 경고가 감지되었습니다",
      detail: opsHealthReport.finalHealth.warnings.join(" | ") || "최종 health 경고가 비어 있습니다.",
      detectedAt: opsHealthReport.checkedAt
    });
  }

  if (newsFetchReport && newsFetchReport.totalTickers > 0) {
    const liveFetchPercent = Math.round((newsFetchReport.liveFetchTickers / newsFetchReport.totalTickers) * 100);
    if (liveFetchPercent <= policy.escalation.newsLiveFetchCriticalPercent) {
      incidents.push({
        id: "news-fetch-critical",
        severity: "critical",
        source: "data-quality",
        summary: "실시간 뉴스 수집 비율이 크게 낮아졌습니다",
        detail: `live=${newsFetchReport.liveFetchTickers}/${newsFetchReport.totalTickers}, cache=${newsFetchReport.cacheFallbackTickers}, file=${newsFetchReport.fileFallbackTickers}, retry=${newsFetchReport.retryCount}`,
        detectedAt: newsFetchReport.completedAt ?? newsFetchReport.startedAt
      });
    } else if (liveFetchPercent <= policy.escalation.newsLiveFetchWarningPercent) {
      incidents.push({
        id: "news-fetch-warning",
        severity: "warning",
        source: "data-quality",
        summary: "실시간 뉴스 수집 비율이 낮습니다",
        detail: `live=${newsFetchReport.liveFetchTickers}/${newsFetchReport.totalTickers}, cache=${newsFetchReport.cacheFallbackTickers}, file=${newsFetchReport.fileFallbackTickers}, retry=${newsFetchReport.retryCount}`,
        detectedAt: newsFetchReport.completedAt ?? newsFetchReport.startedAt
      });
    }
  }

  if (snapshotGenerationReport && snapshotGenerationReport.validationFallbackCount > 0) {
    const severity: OperationalIncident["severity"] =
      snapshotGenerationReport.validationFallbackCount >= policy.escalation.validationFallbackCriticalCount
        ? "critical"
        : snapshotGenerationReport.validationFallbackCount >= policy.escalation.validationFallbackWarningCount
          ? "warning"
          : "warning";

    incidents.push({
      id: severity === "critical" ? "validation-fallback-critical" : "validation-fallback-warning",
      severity,
      source: "data-quality",
      summary:
        severity === "critical"
          ? "검증 fallback 종목이 많아 데이터 신뢰도가 낮아졌습니다"
          : "일부 종목이 보수적 검증값으로 생성되었습니다",
      detail: `count=${snapshotGenerationReport.validationFallbackCount}, tickers=${snapshotGenerationReport.validationFallbackTickers.join(", ")}`,
      detectedAt: snapshotGenerationReport.completedAt
    });
  }

  const overallStatus = incidents.length
    ? incidents.some((item) => item.severity === "critical")
      ? "critical"
      : "warning"
    : "ok";

  incidents.sort((left, right) => {
    const severityDiff = getSeverityRank(right.severity) - getSeverityRank(left.severity);
    if (severityDiff !== 0) {
      return severityDiff;
    }

    return new Date(right.detectedAt).getTime() - new Date(left.detectedAt).getTime();
  });

  return {
    overallStatus,
    incidents
  };
}
