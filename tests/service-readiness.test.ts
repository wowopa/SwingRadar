import { describe, expect, it } from "vitest";

import { buildServiceReadinessSummary } from "@/lib/server/service-readiness";
import type { HealthReport } from "@/lib/services/health-service";

function createHealth(overrides?: Partial<HealthReport>): HealthReport {
  return {
    status: "ok",
    service: "swing-radar",
    timestamp: "2026-04-05T00:00:00.000Z",
    dataProvider: {
      configured: { provider: "postgresDataProvider", mode: "external" },
      fallbackTriggered: false
    },
    freshness: [],
    warnings: [],
    recentAuditCount: 0,
    ...overrides
  };
}

describe("buildServiceReadinessSummary", () => {
  it("marks readiness as ready when all operational checks pass", () => {
    const summary = buildServiceReadinessSummary({
      overallStatus: "ok",
      health: createHealth(),
      dailyCycleReport: {
        startedAt: "2026-04-05T06:00:00.000Z",
        completedAt: "2026-04-05T06:10:00.000Z",
        status: "ok",
        steps: [],
        summary: {
          generatedAt: "2026-04-05T06:10:00.000Z",
          topCandidateCount: 12,
          totalBatches: 5,
          succeededBatches: 5,
          failedBatchCount: 0,
          batchSize: 20
        },
        error: null
      },
      autoHealReport: {
        startedAt: "2026-04-05T06:20:00.000Z",
        completedAt: "2026-04-05T06:21:00.000Z",
        status: "ok",
        triggers: [],
        actions: [],
        error: null
      },
      incidents: [],
      postLaunchHistory: [],
      opsVerification: {
        status: "ready",
        label: "운영 검증 준비",
        summary: "ready",
        nextAction: "none",
        passCount: 5,
        warningCount: 0,
        failureCount: 0,
        blockers: [],
        updatedAt: "2026-04-05T06:30:00.000Z",
        updatedBy: "ops",
        checks: []
      },
      statusWarnings: [],
      dataQualitySummary: {
        validationFallbackPercent: 12,
        measuredValidationPercent: 62,
        failedBatchCount: 0,
        newsLiveFetchPercent: 88
      }
    });

    expect(summary).toMatchObject({
      status: "ready",
      passCount: 6,
      warningCount: 0,
      failureCount: 0
    });
  });

  it("marks readiness as blocked when scheduler and data quality checks fail", () => {
    const summary = buildServiceReadinessSummary({
      overallStatus: "critical",
      health: createHealth({ status: "critical", warnings: ["analysis stale"] }),
      dailyCycleReport: null,
      autoHealReport: null,
      incidents: [
        {
          id: "health-analysis",
          severity: "critical",
          source: "health",
          summary: "analysis stale",
          detail: "critical stale snapshot",
          detectedAt: "2026-04-05T07:00:00.000Z"
        }
      ],
      postLaunchHistory: [],
      opsVerification: {
        status: "blocked",
        label: "운영 증빙 필요",
        summary: "blocked",
        nextAction: "ops",
        passCount: 0,
        warningCount: 0,
        failureCount: 5,
        blockers: ["스케줄러 증빙"],
        updatedAt: "",
        updatedBy: null,
        checks: []
      },
      statusWarnings: ["status-health: unavailable"],
      dataQualitySummary: {
        validationFallbackPercent: 85,
        measuredValidationPercent: 10,
        failedBatchCount: null,
        newsLiveFetchPercent: 35
      }
    });

    expect(summary.status).toBe("blocked");
    expect(summary.failureCount).toBeGreaterThanOrEqual(4);
    expect(summary.blockers).toEqual(
      expect.arrayContaining([
        expect.stringContaining("헬스 상태"),
        expect.stringContaining("자동화 등록"),
        expect.stringContaining("일일 배치"),
        expect.stringContaining("검증 품질"),
        expect.stringContaining("뉴스 신선도")
      ])
    );
  });
});
