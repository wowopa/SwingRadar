import { getDataProvider } from "@/lib/providers";
import type { ProviderExecutionMeta } from "@/lib/providers/types";
import { listAuditLogs, recordAuditLog } from "@/lib/server/audit-log";
import { getOperationalPolicy } from "@/lib/server/operations-policy";
import { buildStaleDataIndicator } from "@/lib/server/stale-data";

export interface HealthReport {
  status: "ok" | "warning" | "critical";
  service: string;
  timestamp: string;
  dataProvider: ProviderExecutionMeta;
  freshness: Array<ReturnType<typeof buildStaleDataIndicator>>;
  warnings: string[];
  recentAuditCount: number;
}

export async function getHealthReport(requestId: string): Promise<HealthReport> {
  const provider = getDataProvider();
  const policy = getOperationalPolicy();
  const [recommendations, analysis, tracking, audits] = await Promise.all([
    provider.getRecommendations(),
    provider.getAnalysis(),
    provider.getTracking(),
    listAuditLogs(policy.audit.healthLookbackLimit)
  ]);

  const providerMeta = provider.getProviderMeta();
  const freshness = [
    buildStaleDataIndicator("recommendations", recommendations.generatedAt),
    buildStaleDataIndicator("analysis", analysis.generatedAt),
    buildStaleDataIndicator("tracking", tracking.generatedAt)
  ];

  const warnings = freshness
    .filter((item) => item.stale)
    .map((item) => `${item.label} snapshot is ${item.ageMinutes} minutes old (${item.severity})`);

  const recentFallbackAuditCount = audits.filter((item) => item.eventType === "provider_fallback").length;

  if (providerMeta.fallbackTriggered && providerMeta.lastUsed) {
    warnings.push(`Primary provider fallback triggered. Serving from ${providerMeta.lastUsed.provider}.`);
  }

  const hasCriticalFreshness = freshness.some((item) => item.severity === "critical");
  const fallbackEscalated =
    providerMeta.fallbackTriggered && recentFallbackAuditCount >= policy.escalation.providerFallbackAuditCount;
  const status: HealthReport["status"] = hasCriticalFreshness || fallbackEscalated ? "critical" : warnings.length ? "warning" : "ok";

  if (warnings.length) {
    await recordAuditLog({
      eventType: providerMeta.fallbackTriggered ? "provider_fallback" : "health_warning",
      actor: "system",
      status: status === "critical" ? "failure" : "warning",
      requestId,
      summary: providerMeta.fallbackTriggered
        ? status === "critical"
          ? "Provider fallback escalated by health check"
          : "Provider fallback detected by health check"
        : status === "critical"
          ? "Critical stale snapshot detected by health check"
          : "Stale snapshot detected by health check",
      metadata: {
        warnings,
        configuredProvider: providerMeta.configured.provider,
        actualProvider: providerMeta.lastUsed?.provider ?? null,
        fallbackProvider: providerMeta.fallback?.provider ?? null,
        recentFallbackAuditCount,
        escalated: status === "critical"
      }
    });
  }

  return {
    status,
    service: "swing-radar",
    timestamp: new Date().toISOString(),
    dataProvider: providerMeta,
    freshness,
    warnings,
    recentAuditCount: audits.length
  };
}
