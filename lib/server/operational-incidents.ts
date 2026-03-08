import type { AuditLogRecord } from "@/lib/server/audit-log";
import { getOperationalPolicy } from "@/lib/server/operations-policy";
import type { DailyCycleReport, OpsHealthCheckReport } from "@/lib/server/ops-reports";
import type { HealthReport } from "@/lib/services/health-service";

export interface OperationalIncident {
  id: string;
  severity: "warning" | "critical";
  source: "health" | "provider" | "daily-cycle" | "ops-recovery";
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
  audits
}: {
  health: HealthReport;
  opsHealthReport: OpsHealthCheckReport | null;
  dailyCycleReport: DailyCycleReport | null;
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
