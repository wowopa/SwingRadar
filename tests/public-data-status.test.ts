import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  buildStaleDataIndicator: vi.fn()
}));

vi.mock("@/lib/server/stale-data", () => ({
  buildStaleDataIndicator: mocks.buildStaleDataIndicator
}));

import { buildPublicDataStatusSummary } from "@/lib/server/public-data-status";

describe("buildPublicDataStatusSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("returns section title for healthy snapshots", () => {
    mocks.buildStaleDataIndicator.mockReturnValue({
      label: "analysis",
      generatedAt: "2026-03-09T09:00:00.000Z",
      ageMinutes: 820,
      stale: false,
      severity: "ok"
    });

    const summary = buildPublicDataStatusSummary("analysis", "2026-03-09T09:00:00.000Z");

    expect(summary.title).toBe("상세 분석");
    expect(summary.freshness).toBe("ok");
  });

  it("preserves freshness for critical snapshots", () => {
    mocks.buildStaleDataIndicator.mockReturnValue({
      label: "analysis",
      generatedAt: "2026-03-07T09:00:00.000Z",
      ageMinutes: 3120,
      stale: true,
      severity: "critical"
    });

    const summary = buildPublicDataStatusSummary("analysis", "2026-03-07T09:00:00.000Z");

    expect(summary.title).toBe("상세 분석");
    expect(summary.freshness).toBe("critical");
  });

  it("returns provider-specific source labels", () => {
    mocks.buildStaleDataIndicator.mockReturnValue({
      label: "analysis",
      generatedAt: "2026-03-09T09:00:00.000Z",
      ageMinutes: 20,
      stale: false,
      severity: "ok"
    });

    vi.stubEnv("SWING_RADAR_DATA_PROVIDER", "postgres");

    const summary = buildPublicDataStatusSummary("analysis", "2026-03-09T09:00:00.000Z");

    expect(summary.sourceLabel).toBe("자동 갱신 스냅샷");
  });
});
