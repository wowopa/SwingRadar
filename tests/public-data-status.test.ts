import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  buildStaleDataIndicator: vi.fn(),
  getOperationalPolicy: vi.fn()
}));

vi.mock("@/lib/server/stale-data", () => ({
  buildStaleDataIndicator: mocks.buildStaleDataIndicator
}));

vi.mock("@/lib/server/operations-policy", () => ({
  getOperationalPolicy: mocks.getOperationalPolicy
}));

import { buildPublicDataStatusSummary } from "@/lib/server/public-data-status";

describe("buildPublicDataStatusSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOperationalPolicy.mockReturnValue({
      stale: {
        warningMinutes: 1560,
        criticalMinutes: 3000
      }
    });
  });

  it("returns daily-friendly copy for healthy snapshots", () => {
    mocks.buildStaleDataIndicator.mockReturnValue({
      label: "analysis",
      generatedAt: "2026-03-09T09:00:00.000Z",
      ageMinutes: 820,
      stale: false,
      severity: "ok"
    });

    const summary = buildPublicDataStatusSummary("analysis", "2026-03-09T09:00:00.000Z");

    expect(summary.badge).toBe("오늘 기준");
    expect(summary.summary).toContain("정상 반영");
  });

  it("returns delayed-copy for critical snapshots", () => {
    mocks.buildStaleDataIndicator.mockReturnValue({
      label: "analysis",
      generatedAt: "2026-03-07T09:00:00.000Z",
      ageMinutes: 3120,
      stale: true,
      severity: "critical"
    });

    const summary = buildPublicDataStatusSummary("analysis", "2026-03-07T09:00:00.000Z");

    expect(summary.badge).toBe("배치 지연");
    expect(summary.detail).toContain("확인이 필요");
  });
});
