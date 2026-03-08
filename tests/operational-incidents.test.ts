import { describe, expect, it } from "vitest";

import { buildOperationalIncidents } from "@/lib/server/operational-incidents";

describe("buildOperationalIncidents", () => {
  it("escalates repeated provider fallback and failed daily cycle into incidents", () => {
    const result = buildOperationalIncidents({
      health: {
        status: "critical",
        service: "swing-radar",
        timestamp: "2026-03-09T09:00:00.000Z",
        dataProvider: {
          configured: { provider: "postgresDataProvider", mode: "external" },
          fallback: { provider: "fileDataProvider", mode: "file" },
          lastUsed: { provider: "fileDataProvider", mode: "file" },
          fallbackTriggered: true
        },
        freshness: [
          {
            label: "analysis",
            generatedAt: "2026-03-08T20:00:00.000Z",
            ageMinutes: 780,
            stale: true,
            severity: "critical"
          }
        ],
        warnings: ["analysis snapshot is 780 minutes old (critical)"],
        recentAuditCount: 4
      },
      opsHealthReport: {
        checkedAt: "2026-03-09T09:05:00.000Z",
        mode: "auto-recover",
        initialHealth: { status: "warning", warnings: ["analysis stale"] },
        recovery: {
          attempted: true,
          timings: { refreshExternalMs: 2400, ingestPostgresMs: 1300 }
        },
        finalHealth: { status: "warning", warnings: ["analysis still stale"] }
      },
      dailyCycleReport: {
        startedAt: "2026-03-09T18:10:00.000Z",
        completedAt: "2026-03-09T18:12:00.000Z",
        status: "failed",
        steps: [],
        summary: null,
        error: "scan-universe-batches failed"
      },
      audits: [
        {
          id: 1,
          eventType: "provider_fallback",
          actor: "system",
          status: "warning",
          requestId: "req-1",
          summary: "fallback 1",
          metadata: {},
          createdAt: "2026-03-09T08:40:00.000Z"
        },
        {
          id: 2,
          eventType: "provider_fallback",
          actor: "system",
          status: "warning",
          requestId: "req-2",
          summary: "fallback 2",
          metadata: {},
          createdAt: "2026-03-09T08:50:00.000Z"
        },
        {
          id: 3,
          eventType: "provider_fallback",
          actor: "system",
          status: "failure",
          requestId: "req-3",
          summary: "fallback 3",
          metadata: {},
          createdAt: "2026-03-09T09:00:00.000Z"
        }
      ]
    });

    expect(result.overallStatus).toBe("critical");
    expect(result.incidents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "provider-fallback",
          severity: "critical"
        }),
        expect.objectContaining({
          id: "daily-cycle-failed",
          severity: "critical"
        }),
        expect.objectContaining({
          id: "ops-recovery-warning",
          severity: "critical"
        })
      ])
    );
  });
});
