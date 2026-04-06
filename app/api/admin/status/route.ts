import { jsonOk } from "@/lib/server/api-response";
import { loadAccessStatsReport } from "@/lib/server/access-stats";
import { assertAdminRequest } from "@/lib/server/admin-auth";
import { listAuditLogs } from "@/lib/server/audit-log";
import { buildOperationalIncidents } from "@/lib/server/operational-incidents";
import { getOperationalPolicy } from "@/lib/server/operations-policy";
import {
  appendPostLaunchHistoryEntry,
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
import { buildPrelaunchDryRunSummary } from "@/lib/server/prelaunch-dry-run";
import { buildOpsVerificationSummary, loadOpsVerificationDocument } from "@/lib/server/ops-verification";
import { buildRuntimeSyncTrustSummary } from "@/lib/server/runtime-sync-trust";
import { buildServiceReadinessSummary } from "@/lib/server/service-readiness";
import { getHealthReport } from "@/lib/services/health-service";
import type { HealthReport } from "@/lib/services/health-service";
import { buildResponseMeta, withRouteTelemetry } from "@/lib/server/telemetry";

function calculatePercent(part: number | null | undefined, total: number | null | undefined) {
  if (part == null || total == null || !Number.isFinite(part) || !Number.isFinite(total) || total <= 0) {
    return null;
  }

  return Math.round(((part / total) * 100) * 10) / 10;
}

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
      listAuditLogs(policy.audit.adminListLimit),
      loadOpsVerificationDocument()
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
      auditsResult,
      opsVerificationDocumentResult
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

    const opsVerificationDocument =
      opsVerificationDocumentResult.status === "fulfilled"
        ? opsVerificationDocumentResult.value
        : {
            scheduler: { checkedAt: null, checkedBy: null, note: "" },
            backup: { checkedAt: null, checkedBy: null, note: "" },
            restore: { checkedAt: null, checkedBy: null, note: "" },
            rollback: { checkedAt: null, checkedBy: null, note: "" },
            smoke: { checkedAt: null, checkedBy: null, note: "" },
            updatedAt: "",
            updatedBy: null
          };
    if (opsVerificationDocumentResult.status !== "fulfilled") {
      statusWarnings.push(
        `ops-verification: ${
          opsVerificationDocumentResult.reason instanceof Error
            ? opsVerificationDocumentResult.reason.message
            : "Unexpected ops verification load failure"
        }`
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

    let refreshedPostLaunchHistory = postLaunchHistory ?? [];
    try {
      refreshedPostLaunchHistory = await appendPostLaunchHistoryEntry(
        {
          checkedAt: new Date().toISOString(),
          healthStatus: health.status,
          overallStatus: escalation.overallStatus,
          dailyTaskRegistered: dailyCycleReport !== null,
          autoHealTaskRegistered: autoHealReport !== null,
          incidents: {
            criticalCount: escalation.incidents.filter((item) => item.severity === "critical").length,
            warningCount: escalation.incidents.filter((item) => item.severity === "warning").length
          },
          audits: {
            total: audits.length,
            failureCount: audits.filter((item) => item.status === "failure").length,
            warningCount: audits.filter((item) => item.status === "warning").length
          }
        },
        { maxEntries: 20 }
      );
    } catch (error) {
      statusWarnings.push(
        `post-launch-history-write: ${error instanceof Error ? error.message : "Unexpected post-launch history write failure"}`
      );
    }

    const validationFallbackPercent = snapshotGenerationReport
      ? calculatePercent(snapshotGenerationReport.validationFallbackCount, snapshotGenerationReport.totalTickers)
      : null;
    const measuredValidationPercent = snapshotGenerationReport?.validationBasisCounts
      ? calculatePercent(snapshotGenerationReport.validationBasisCounts.measured, snapshotGenerationReport.totalTickers)
      : null;
    const validationBasisPercentages = snapshotGenerationReport?.validationBasisCounts
      ? {
          measured: calculatePercent(
            snapshotGenerationReport.validationBasisCounts.measured,
            snapshotGenerationReport.totalTickers
          ) ?? 0,
          tracking: calculatePercent(
            snapshotGenerationReport.validationBasisCounts.tracking ?? 0,
            snapshotGenerationReport.totalTickers
          ) ?? 0,
          sector: calculatePercent(
            snapshotGenerationReport.validationBasisCounts.sector,
            snapshotGenerationReport.totalTickers
          ) ?? 0,
          pattern: calculatePercent(
            snapshotGenerationReport.validationBasisCounts.pattern,
            snapshotGenerationReport.totalTickers
          ) ?? 0,
          heuristic: calculatePercent(
            snapshotGenerationReport.validationBasisCounts.heuristic,
            snapshotGenerationReport.totalTickers
          ) ?? 0
        }
      : null;
    const validationTrackingRecoveredCount = snapshotGenerationReport?.validationTrackingRecoveredCount ?? null;
    const validationTrackingRecoveredPercent = snapshotGenerationReport
      ? calculatePercent(snapshotGenerationReport.validationTrackingRecoveredCount ?? 0, snapshotGenerationReport.totalTickers)
      : null;
    const failedBatchCount = dailyCycleReport?.summary?.failedBatchCount ?? null;
    const failedBatchPercent =
      dailyCycleReport?.summary && dailyCycleReport.summary.totalBatches > 0
        ? calculatePercent(dailyCycleReport.summary.failedBatchCount, dailyCycleReport.summary.totalBatches)
        : null;
    const failedBatchSteps =
      dailyCycleReport?.steps
        ?.filter((step) => step.status === "failed" || Boolean(step.error))
        .map((step) => ({
          name: step.name,
          status: step.status === "failed" ? "failed" : "warning",
          detail: step.error ?? "Step completed with a partial failure signal."
        })) ?? null;
    const newsLiveFetchPercent = newsFetchReport
      ? calculatePercent(newsFetchReport.liveFetchTickers, newsFetchReport.totalTickers)
      : null;
    const newsCacheFallbackPercent = newsFetchReport
      ? calculatePercent(newsFetchReport.cacheFallbackTickers, newsFetchReport.totalTickers)
      : null;
    const newsFileFallbackPercent = newsFetchReport
      ? calculatePercent(newsFetchReport.fileFallbackTickers, newsFetchReport.totalTickers)
      : null;
    const topCandidateNewsCoverage = newsFetchReport?.topCandidateCoverage
      ? {
          totalTickers: newsFetchReport.topCandidateCoverage.totalTickers,
          liveFetchPercent: calculatePercent(
            newsFetchReport.topCandidateCoverage.liveFetchTickers,
            newsFetchReport.topCandidateCoverage.totalTickers
          ),
          coveredPercent: calculatePercent(
            newsFetchReport.topCandidateCoverage.totalTickers - newsFetchReport.topCandidateCoverage.missingTickers,
            newsFetchReport.topCandidateCoverage.totalTickers
          ),
          liveFetchTickers: newsFetchReport.topCandidateCoverage.liveFetchTickers,
          cacheFallbackTickers: newsFetchReport.topCandidateCoverage.cacheFallbackTickers,
          fileFallbackTickers: newsFetchReport.topCandidateCoverage.fileFallbackTickers,
          missingTickers: newsFetchReport.topCandidateCoverage.missingTickers,
          totalItems: newsFetchReport.topCandidateCoverage.totalItems,
          tickers: newsFetchReport.topCandidateCoverage.tickers
        }
      : null;
    const runtimeSyncTrust = buildRuntimeSyncTrustSummary({
      opsHealthReport,
      dailyCycleReport,
      autoHealReport,
      newsFetchReport,
      snapshotGenerationReport,
      thresholdAdviceReport,
      postLaunchHistory: refreshedPostLaunchHistory
    });
    if (runtimeSyncTrust.status !== "healthy") {
      statusWarnings.push(`runtime-sync: ${runtimeSyncTrust.summary}`);
    }
    const dataQualitySummary = {
      validationFallbackCount: snapshotGenerationReport?.validationFallbackCount ?? null,
      validationFallbackPercent,
      validationTrackingRecoveredCount,
      validationTrackingRecoveredPercent,
      validationFallbackDetails: snapshotGenerationReport?.validationFallbackDetails ?? null,
      measuredValidationPercent,
      validationBasisPercentages,
      failedBatchCount,
      failedBatchPercent,
      failedBatchSteps,
      newsLiveFetchPercent,
      newsCacheFallbackPercent,
      newsFileFallbackPercent,
      topCandidateNewsCoverage,
      runtimeSyncTrust
    };
    const opsVerification = buildOpsVerificationSummary({
      document: opsVerificationDocument,
      dailyCycleReport,
      autoHealReport
    });
    const serviceReadiness = buildServiceReadinessSummary({
      overallStatus: escalation.overallStatus as "ok" | "warning" | "critical",
      health,
      dailyCycleReport,
      autoHealReport,
      incidents: escalation.incidents,
      postLaunchHistory: refreshedPostLaunchHistory.slice(-3),
      opsVerification,
      runtimeSyncTrust,
      statusWarnings,
      dataQualitySummary: {
        validationFallbackPercent,
        measuredValidationPercent,
        failedBatchCount,
        newsLiveFetchPercent
      }
    });
    const prelaunchDryRun = buildPrelaunchDryRunSummary({
      serviceReadiness,
      postLaunchHistory: refreshedPostLaunchHistory.slice(-10),
      recentAuditCount: audits.length,
      uniqueVisitorsLast7Days: accessStatsReport?.last7Days.uniqueVisitors ?? null
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
        postLaunchHistory: refreshedPostLaunchHistory.slice(-3).reverse(),
        thresholdAdviceReport,
        dataQualitySummary,
        serviceReadiness,
        opsVerification,
        prelaunchDryRun,
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
