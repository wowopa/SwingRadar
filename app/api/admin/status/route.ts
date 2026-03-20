import { jsonOk } from "@/lib/server/api-response";
import { loadAccessStatsReport } from "@/lib/server/access-stats";
import { assertAdminRequest } from "@/lib/server/admin-auth";
import { listAuditLogs } from "@/lib/server/audit-log";
import { buildOperationalIncidents } from "@/lib/server/operational-incidents";
import { getOperationalPolicy } from "@/lib/server/operations-policy";
import {
  loadAutoHealReport,
  loadDailyCycleReport,
  loadNewsFetchReport,
  loadOpsHealthCheckReport,
  loadPostLaunchHistory,
  loadRuntimeStorageReport,
  loadSnapshotGenerationReport,
  loadThresholdAdviceReport
} from "@/lib/server/ops-reports";
import { loadDatabaseStorageReport } from "@/lib/server/postgres-storage-report";
import { getHealthReport } from "@/lib/services/health-service";
import type { HealthReport } from "@/lib/services/health-service";
import { buildResponseMeta, withRouteTelemetry } from "@/lib/server/telemetry";

export async function GET(request: Request) {
  return withRouteTelemetry(request, { route: "/api/admin/status" }, async (context) => {
    assertAdminRequest(request);
    const policy = getOperationalPolicy();
    const results = await Promise.allSettled([
      getHealthReport(context.requestId),
      loadOpsHealthCheckReport(),
      loadDailyCycleReport(),
      loadAutoHealReport(),
      loadNewsFetchReport(),
      loadSnapshotGenerationReport(),
      loadPostLaunchHistory(),
      loadThresholdAdviceReport(),
      loadAccessStatsReport(),
      loadRuntimeStorageReport(),
      loadDatabaseStorageReport(),
      listAuditLogs(policy.audit.adminListLimit)
    ]);

    const statusWarnings: string[] = [];
    const [
      healthResult,
      opsHealthReportResult,
      dailyCycleReportResult,
      autoHealReportResult,
      newsFetchReportResult,
      snapshotGenerationReportResult,
      postLaunchHistoryResult,
      thresholdAdviceReportResult,
      accessStatsReportResult,
      runtimeStorageReportResult,
      databaseStorageReportResult,
      auditsResult
    ] = results;

    const health: HealthReport =
      healthResult.status === "fulfilled"
        ? healthResult.value
        : {
            status: "critical" as const,
            service: "swing-radar",
            timestamp: new Date().toISOString(),
            recentAuditCount: 0,
            dataProvider: {
              configured: {
                provider: process.env.SWING_RADAR_DATA_PROVIDER ?? "unknown",
                mode: "external"
              },
              fallbackTriggered: false
            },
            freshness: [],
            warnings: ["Health report is unavailable in admin status."]
          };
    if (healthResult.status !== "fulfilled") {
      statusWarnings.push(
        `status-health: ${healthResult.reason instanceof Error ? healthResult.reason.message : "Unexpected health load failure"}`
      );
    }

    const opsHealthReport = opsHealthReportResult.status === "fulfilled" ? opsHealthReportResult.value : null;
    if (opsHealthReportResult.status !== "fulfilled") {
      statusWarnings.push(
        `ops-health-report: ${opsHealthReportResult.reason instanceof Error ? opsHealthReportResult.reason.message : "Unexpected ops report failure"}`
      );
    }

    const dailyCycleReport = dailyCycleReportResult.status === "fulfilled" ? dailyCycleReportResult.value : null;
    if (dailyCycleReportResult.status !== "fulfilled") {
      statusWarnings.push(
        `daily-cycle-report: ${dailyCycleReportResult.reason instanceof Error ? dailyCycleReportResult.reason.message : "Unexpected daily cycle report failure"}`
      );
    }

    const autoHealReport = autoHealReportResult.status === "fulfilled" ? autoHealReportResult.value : null;
    if (autoHealReportResult.status !== "fulfilled") {
      statusWarnings.push(
        `auto-heal-report: ${autoHealReportResult.reason instanceof Error ? autoHealReportResult.reason.message : "Unexpected auto-heal report failure"}`
      );
    }

    const newsFetchReport = newsFetchReportResult.status === "fulfilled" ? newsFetchReportResult.value : null;
    if (newsFetchReportResult.status !== "fulfilled") {
      statusWarnings.push(
        `news-fetch-report: ${newsFetchReportResult.reason instanceof Error ? newsFetchReportResult.reason.message : "Unexpected news report failure"}`
      );
    }

    const snapshotGenerationReport =
      snapshotGenerationReportResult.status === "fulfilled" ? snapshotGenerationReportResult.value : null;
    if (snapshotGenerationReportResult.status !== "fulfilled") {
      statusWarnings.push(
        `snapshot-generation-report: ${snapshotGenerationReportResult.reason instanceof Error ? snapshotGenerationReportResult.reason.message : "Unexpected snapshot generation report failure"}`
      );
    }

    const postLaunchHistory = postLaunchHistoryResult.status === "fulfilled" ? postLaunchHistoryResult.value : null;
    if (postLaunchHistoryResult.status !== "fulfilled") {
      statusWarnings.push(
        `post-launch-history: ${postLaunchHistoryResult.reason instanceof Error ? postLaunchHistoryResult.reason.message : "Unexpected post-launch history failure"}`
      );
    }

    const thresholdAdviceReport = thresholdAdviceReportResult.status === "fulfilled" ? thresholdAdviceReportResult.value : null;
    if (thresholdAdviceReportResult.status !== "fulfilled") {
      statusWarnings.push(
        `threshold-advice-report: ${thresholdAdviceReportResult.reason instanceof Error ? thresholdAdviceReportResult.reason.message : "Unexpected threshold advice failure"}`
      );
    }

    const accessStatsReport = accessStatsReportResult.status === "fulfilled" ? accessStatsReportResult.value : null;
    if (accessStatsReportResult.status !== "fulfilled") {
      statusWarnings.push(
        `access-stats-report: ${accessStatsReportResult.reason instanceof Error ? accessStatsReportResult.reason.message : "Unexpected access stats report failure"}`
      );
    }

    const runtimeStorageReport = runtimeStorageReportResult.status === "fulfilled" ? runtimeStorageReportResult.value : null;
    if (runtimeStorageReportResult.status !== "fulfilled") {
      statusWarnings.push(
        `runtime-storage-report: ${runtimeStorageReportResult.reason instanceof Error ? runtimeStorageReportResult.reason.message : "Unexpected runtime storage report failure"}`
      );
    }

    const databaseStorageReport = databaseStorageReportResult.status === "fulfilled" ? databaseStorageReportResult.value : null;
    if (databaseStorageReportResult.status !== "fulfilled") {
      statusWarnings.push(
        `database-storage-report: ${databaseStorageReportResult.reason instanceof Error ? databaseStorageReportResult.reason.message : "Unexpected database storage report failure"}`
      );
    }

    const audits = auditsResult.status === "fulfilled" ? auditsResult.value : [];
    if (auditsResult.status !== "fulfilled") {
      statusWarnings.push(
        `audit-log: ${auditsResult.reason instanceof Error ? auditsResult.reason.message : "Unexpected audit log failure"}`
      );
    }

    const escalation = buildOperationalIncidents({
      health,
      opsHealthReport,
      dailyCycleReport,
      newsFetchReport,
      snapshotGenerationReport,
      audits
    });

    return jsonOk(
      {
        ok: true,
        requestId: context.requestId,
        health,
        opsHealthReport,
        dailyCycleReport,
        autoHealReport,
        newsFetchReport,
        snapshotGenerationReport,
        postLaunchHistory: postLaunchHistory?.slice(-3).reverse() ?? [],
        thresholdAdviceReport,
        accessStatsReport,
        runtimeStorageReport,
        databaseStorageReport,
        statusWarnings,
        incidents: escalation.incidents,
        overallStatus: escalation.overallStatus,
        operationalMode: process.env.SWING_RADAR_DATA_PROVIDER ?? "mock"
      },
      buildResponseMeta(context, 0)
    );
  });
}
