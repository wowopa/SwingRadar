import { describe, expect, it } from "vitest";

import type { PostLaunchHistoryEntry } from "@/lib/server/ops-reports";
import { buildPrelaunchDryRunSummary } from "@/lib/server/prelaunch-dry-run";
import type { ServiceReadinessSummary } from "@/lib/server/service-readiness";

function createReadiness(overrides?: Partial<ServiceReadinessSummary>): ServiceReadinessSummary {
  return {
    status: "ready",
    label: "공개 가능",
    summary: "ready",
    nextAction: "none",
    passCount: 6,
    warningCount: 0,
    failureCount: 0,
    blockers: [],
    checks: [],
    ...overrides
  };
}

function createHistory(overrides?: Partial<PostLaunchHistoryEntry>): PostLaunchHistoryEntry {
  return {
    checkedAt: "2026-04-05T06:00:00.000Z",
    healthStatus: "ok",
    overallStatus: "ok",
    dailyTaskRegistered: true,
    autoHealTaskRegistered: true,
    incidents: {
      criticalCount: 0,
      warningCount: 0
    },
    audits: {
      total: 4,
      failureCount: 0,
      warningCount: 0
    },
    ...overrides
  };
}

describe("buildPrelaunchDryRunSummary", () => {
  it("marks the dry run as ready when stability and feedback signals are healthy", () => {
    const summary = buildPrelaunchDryRunSummary({
      serviceReadiness: createReadiness(),
      postLaunchHistory: Array.from({ length: 8 }, (_, index) =>
        createHistory({
          checkedAt: `2026-04-${String(index + 1).padStart(2, "0")}T06:00:00.000Z`
        })
      ),
      recentAuditCount: 6,
      uniqueVisitorsLast7Days: 14
    });

    expect(summary).toMatchObject({
      status: "ready",
      label: "비공개 베타 가능",
      recommendedCohort: "20명 내외 · 10거래일",
      passCount: 4,
      warningCount: 0,
      failureCount: 0
    });
  });

  it("keeps the dry run in small pilot mode when observation and feedback are still thin", () => {
    const summary = buildPrelaunchDryRunSummary({
      serviceReadiness: createReadiness({
        status: "monitor",
        label: "모니터링 필요",
        warningCount: 2,
        passCount: 4
      }),
      postLaunchHistory: [
        createHistory({
          overallStatus: "warning",
          incidents: { criticalCount: 0, warningCount: 1 }
        }),
        createHistory()
      ],
      recentAuditCount: 2,
      uniqueVisitorsLast7Days: 3
    });

    expect(summary.status).toBe("trial");
    expect(summary.warningCount).toBeGreaterThanOrEqual(2);
    expect(summary.recommendedCohort).toBe("10명 내외 · 5거래일");
  });

  it("blocks the dry run when critical readiness issues remain", () => {
    const summary = buildPrelaunchDryRunSummary({
      serviceReadiness: createReadiness({
        status: "blocked",
        label: "공개 보류",
        failureCount: 2,
        passCount: 2,
        blockers: ["운영 안정성"]
      }),
      postLaunchHistory: [
        createHistory({
          overallStatus: "critical",
          incidents: { criticalCount: 1, warningCount: 0 }
        })
      ],
      recentAuditCount: 0,
      uniqueVisitorsLast7Days: null
    });

    expect(summary.status).toBe("blocked");
    expect(summary.failureCount).toBeGreaterThanOrEqual(1);
    expect(summary.blockers).toEqual(expect.arrayContaining([expect.stringContaining("운영 안정성")]));
  });
});
