import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRecommendations: vi.fn(),
  getAnalysis: vi.fn(),
  getTracking: vi.fn(),
  getProviderMeta: vi.fn(),
  listAuditLogs: vi.fn(),
  recordAuditLog: vi.fn(),
  buildStaleDataIndicator: vi.fn()
}));

vi.mock("@/lib/providers", () => ({
  getDataProvider: () => ({
    getRecommendations: mocks.getRecommendations,
    getAnalysis: mocks.getAnalysis,
    getTracking: mocks.getTracking,
    getProviderMeta: mocks.getProviderMeta
  })
}));

vi.mock("@/lib/server/audit-log", () => ({
  listAuditLogs: mocks.listAuditLogs,
  recordAuditLog: mocks.recordAuditLog
}));

vi.mock("@/lib/server/stale-data", () => ({
  buildStaleDataIndicator: mocks.buildStaleDataIndicator
}));

import { getHealthReport } from "@/lib/services/health-service";

describe("getHealthReport", () => {
  const originalHealthAuditLimit = process.env.SWING_RADAR_HEALTH_AUDIT_LIMIT;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SWING_RADAR_HEALTH_AUDIT_LIMIT = "7";

    mocks.getRecommendations.mockResolvedValue({ generatedAt: "2026-03-08T00:00:00.000Z" });
    mocks.getAnalysis.mockResolvedValue({ generatedAt: "2026-03-08T00:00:00.000Z" });
    mocks.getTracking.mockResolvedValue({ generatedAt: "2026-03-08T00:00:00.000Z" });
    mocks.getProviderMeta.mockReturnValue({
      configured: { provider: "postgres", mode: "external" },
      fallback: { provider: "file", mode: "mock" },
      lastUsed: { provider: "file", mode: "mock" },
      fallbackTriggered: true
    });
    mocks.listAuditLogs.mockResolvedValue([]);
    mocks.recordAuditLog.mockResolvedValue(undefined);
    mocks.buildStaleDataIndicator
      .mockReturnValueOnce({ label: "recommendations", stale: false, ageMinutes: 2, severity: "ok" })
      .mockReturnValueOnce({ label: "analysis", stale: true, ageMinutes: 42, severity: "warning" })
      .mockReturnValueOnce({ label: "tracking", stale: false, ageMinutes: 5, severity: "ok" });
  });

  afterEach(() => {
    if (originalHealthAuditLimit === undefined) {
      delete process.env.SWING_RADAR_HEALTH_AUDIT_LIMIT;
    } else {
      process.env.SWING_RADAR_HEALTH_AUDIT_LIMIT = originalHealthAuditLimit;
    }
  });

  it("returns warning status and records an audit when stale or fallback is detected", async () => {
    const result = await getHealthReport("req-health");

    expect(mocks.listAuditLogs).toHaveBeenCalledWith(7);
    expect(result.status).toBe("warning");
    expect(result.warnings).toEqual([
      "analysis snapshot is 42 minutes old (warning)",
      "Primary provider fallback triggered. Serving from file."
    ]);
    expect(mocks.recordAuditLog).toHaveBeenCalledTimes(1);
    expect(mocks.recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "provider_fallback",
        status: "warning",
        requestId: "req-health"
      })
    );
  });

  it("escalates to critical when a stale snapshot is critical", async () => {
    mocks.getProviderMeta.mockReturnValue({
      configured: { provider: "postgres", mode: "external" },
      fallback: { provider: "file", mode: "mock" },
      lastUsed: { provider: "postgres", mode: "external" },
      fallbackTriggered: false
    });
    mocks.listAuditLogs.mockResolvedValue([]);
    mocks.buildStaleDataIndicator
      .mockReset()
      .mockReturnValueOnce({ label: "recommendations", stale: false, ageMinutes: 2, severity: "ok" })
      .mockReturnValueOnce({ label: "analysis", stale: true, ageMinutes: 401, severity: "critical" })
      .mockReturnValueOnce({ label: "tracking", stale: false, ageMinutes: 5, severity: "ok" });

    const result = await getHealthReport("req-health");

    expect(result.status).toBe("critical");
    expect(mocks.recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "health_warning",
        status: "failure",
        requestId: "req-health"
      })
    );
  });
});
