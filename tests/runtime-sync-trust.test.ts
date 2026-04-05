import { describe, expect, it } from "vitest";

import { buildRuntimeSyncTrustSummary } from "@/lib/server/runtime-sync-trust";

describe("buildRuntimeSyncTrustSummary", () => {
  it("returns healthy when all runtime reports are recent", () => {
    const now = new Date("2026-04-05T12:00:00.000Z");
    const summary = buildRuntimeSyncTrustSummary({
      opsHealthReport: {
        checkedAt: "2026-04-05T10:00:00.000Z",
        mode: "check-only",
        initialHealth: { status: "ok", warnings: [] },
        recovery: null,
        finalHealth: { status: "ok", warnings: [] }
      },
      dailyCycleReport: {
        startedAt: "2026-04-05T09:00:00.000Z",
        completedAt: "2026-04-05T09:10:00.000Z",
        status: "ok",
        steps: [],
        summary: null,
        error: null
      },
      autoHealReport: {
        startedAt: "2026-04-05T09:15:00.000Z",
        completedAt: "2026-04-05T09:17:00.000Z",
        status: "ok",
        triggers: [],
        actions: [],
        error: null
      },
      newsFetchReport: {
        startedAt: "2026-04-05T09:20:00.000Z",
        completedAt: "2026-04-05T09:25:00.000Z",
        providerOrder: ["naver"],
        requestedProvider: "naver",
        totalTickers: 10,
        liveFetchTickers: 10,
        cacheFallbackTickers: 0,
        fileFallbackTickers: 0,
        retryCount: 0,
        providerFailures: [],
        totalItems: 30
      },
      snapshotGenerationReport: {
        startedAt: "2026-04-05T09:30:00.000Z",
        completedAt: "2026-04-05T09:31:00.000Z",
        generatedAt: "2026-04-05T09:31:00.000Z",
        totalTickers: 10,
        recommendationCount: 10,
        analysisCount: 10,
        trackingHistoryCount: 4,
        validationFallbackCount: 1,
        validationFallbackTickers: ["000660"]
      },
      thresholdAdviceReport: {
        generatedAt: "2026-04-05T09:40:00.000Z",
        sampleSize: 3,
        currentPolicy: {
          newsLiveFetchWarningPercent: 70,
          newsLiveFetchCriticalPercent: 40,
          validationFallbackWarningPercent: 50,
          validationFallbackCriticalPercent: 80
        },
        observations: {
          averageWarningIncidents: 0,
          averageCriticalIncidents: 0,
          averageAuditFailures: 0,
          latestLiveFetchPercent: 90,
          latestValidationFallbackCount: 1,
          latestValidationFallbackPercent: 10
        },
        recommendations: []
      },
      postLaunchHistory: [
        {
          checkedAt: "2026-04-05T11:00:00.000Z",
          healthStatus: "ok",
          overallStatus: "ok",
          dailyTaskRegistered: true,
          autoHealTaskRegistered: true,
          incidents: { criticalCount: 0, warningCount: 0 },
          audits: { total: 1, failureCount: 0, warningCount: 0 }
        }
      ],
      now
    });

    expect(summary).toMatchObject({
      status: "healthy",
      missingCount: 0,
      blockingCount: 0
    });
  });

  it("returns blocked when required runtime reports are missing", () => {
    const summary = buildRuntimeSyncTrustSummary({
      opsHealthReport: null,
      dailyCycleReport: null,
      autoHealReport: null,
      newsFetchReport: null,
      snapshotGenerationReport: null,
      thresholdAdviceReport: null,
      postLaunchHistory: [],
      now: new Date("2026-04-05T12:00:00.000Z")
    });

    expect(summary.status).toBe("blocked");
    expect(summary.missingCount).toBeGreaterThan(0);
    expect(summary.blockingCount).toBeGreaterThan(0);
  });
});
