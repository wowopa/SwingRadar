import { getDataProvider } from "@/lib/providers";
import type { ProviderExecutionMeta } from "@/lib/providers/types";
import { listAuditLogs, recordAuditLog } from "@/lib/server/audit-log";
import { buildStaleDataIndicator } from "@/lib/server/stale-data";

export interface HealthReport {
  status: "ok" | "warning";
  service: string;
  timestamp: string;
  dataProvider: ProviderExecutionMeta;
  freshness: Array<ReturnType<typeof buildStaleDataIndicator>>;
  warnings: string[];
  recentAuditCount: number;
}

export async function getHealthReport(requestId: string): Promise<HealthReport> {
  const provider = getDataProvider();
  const [recommendations, analysis, tracking, audits] = await Promise.all([
    provider.getRecommendations(),
    provider.getAnalysis(),
    provider.getTracking(),
    listAuditLogs(5)
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

  if (providerMeta.fallbackTriggered && providerMeta.lastUsed) {
    warnings.push(`Primary provider fallback triggered. Serving from ${providerMeta.lastUsed.provider}.`);
  }

  if (warnings.length) {
    await recordAuditLog({
      eventType: providerMeta.fallbackTriggered ? "provider_fallback" : "health_warning",
      actor: "system",
      status: "warning",
      requestId,
      summary: providerMeta.fallbackTriggered
        ? "Provider fallback detected by health check"
        : "Stale snapshot detected by health check",
      metadata: {
        warnings,
        configuredProvider: providerMeta.configured.provider,
        actualProvider: providerMeta.lastUsed?.provider ?? null,
        fallbackProvider: providerMeta.fallback?.provider ?? null
      }
    });
  }

  return {
    status: warnings.length ? "warning" : "ok",
    service: "swing-radar",
    timestamp: new Date().toISOString(),
    dataProvider: providerMeta,
    freshness,
    warnings,
    recentAuditCount: audits.length
  };
}