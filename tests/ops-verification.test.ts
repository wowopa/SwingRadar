import { describe, expect, it } from "vitest";

import { buildOpsVerificationSummary } from "@/lib/server/ops-verification";

function createDocument(overrides?: Partial<Parameters<typeof buildOpsVerificationSummary>[0]["document"]>) {
  return {
    scheduler: { checkedAt: "2026-04-05T06:00:00.000Z", checkedBy: "ops", note: "windows task ok" },
    backup: { checkedAt: "2026-04-05T06:10:00.000Z", checkedBy: "ops", note: "backup generated" },
    restore: { checkedAt: "2026-04-01T06:10:00.000Z", checkedBy: "ops", note: "restore rehearsal ok" },
    rollback: { checkedAt: "2026-04-01T06:15:00.000Z", checkedBy: "ops", note: "rollback drill ok" },
    smoke: { checkedAt: "2026-04-05T06:30:00.000Z", checkedBy: "ops", note: "core routes checked" },
    updatedAt: "2026-04-05T06:30:00.000Z",
    updatedBy: "ops",
    ...overrides
  };
}

function createDailyCycle() {
  return {
    startedAt: "2026-04-05T06:00:00.000Z",
    completedAt: "2026-04-05T06:10:00.000Z",
    status: "ok" as const,
    steps: [],
    summary: {
      generatedAt: "2026-04-05T06:10:00.000Z",
      topCandidateCount: 12,
      totalBatches: 4,
      succeededBatches: 4,
      failedBatchCount: 0,
      batchSize: 20
    },
    error: null
  };
}

function createAutoHeal() {
  return {
    startedAt: "2026-04-05T06:15:00.000Z",
    completedAt: "2026-04-05T06:16:00.000Z",
    status: "ok" as const,
    triggers: [],
    actions: [],
    error: null
  };
}

describe("buildOpsVerificationSummary", () => {
  it("returns ready when all checkpoints are recent", () => {
    const summary = buildOpsVerificationSummary({
      document: createDocument(),
      dailyCycleReport: createDailyCycle(),
      autoHealReport: createAutoHeal(),
      now: new Date("2026-04-05T09:00:00.000Z")
    });

    expect(summary).toMatchObject({
      status: "ready",
      passCount: 5,
      warningCount: 0,
      failureCount: 0
    });
  });

  it("blocks readiness when proof checkpoints are missing", () => {
    const summary = buildOpsVerificationSummary({
      document: createDocument({
        scheduler: { checkedAt: null, checkedBy: null, note: "" },
        backup: { checkedAt: null, checkedBy: null, note: "" },
        smoke: { checkedAt: null, checkedBy: null, note: "" }
      }),
      dailyCycleReport: createDailyCycle(),
      autoHealReport: createAutoHeal(),
      now: new Date("2026-04-05T09:00:00.000Z")
    });

    expect(summary.status).toBe("blocked");
    expect(summary.failureCount).toBeGreaterThanOrEqual(3);
    expect(summary.blockers).toEqual(
      expect.arrayContaining([
        expect.stringContaining("스케줄러 증빙"),
        expect.stringContaining("백업 확인"),
        expect.stringContaining("배포 스모크")
      ])
    );
  });

  it("moves to monitor when checkpoints are stale", () => {
    const summary = buildOpsVerificationSummary({
      document: createDocument({
        backup: { checkedAt: "2026-03-20T06:10:00.000Z", checkedBy: "ops", note: "old backup check" },
        restore: { checkedAt: "2026-02-20T06:10:00.000Z", checkedBy: "ops", note: "old restore drill" }
      }),
      dailyCycleReport: createDailyCycle(),
      autoHealReport: createAutoHeal(),
      now: new Date("2026-04-05T09:00:00.000Z")
    });

    expect(summary.status).toBe("monitor");
    expect(summary.warningCount).toBeGreaterThanOrEqual(2);
  });
});
