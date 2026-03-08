import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPostgresPool: vi.fn()
}));

vi.mock("@/lib/server/postgres", () => ({
  getPostgresPool: mocks.getPostgresPool
}));

import { ApiError } from "@/lib/server/api-error";
import { listAuditLogs, recordAuditLog } from "@/lib/server/audit-log";

describe("audit log store", () => {
  const originalDatabaseUrl = process.env.SWING_RADAR_DATABASE_URL;
  let infoSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    infoSpy.mockRestore();

    if (originalDatabaseUrl === undefined) {
      delete process.env.SWING_RADAR_DATABASE_URL;
    } else {
      process.env.SWING_RADAR_DATABASE_URL = originalDatabaseUrl;
    }
  });

  it("writes audit events to console when no database is configured", async () => {
    delete process.env.SWING_RADAR_DATABASE_URL;

    await recordAuditLog({
      eventType: "health_warning",
      actor: "system",
      status: "warning",
      requestId: "req-audit",
      summary: "Stale snapshot detected",
      metadata: { warnings: ["analysis snapshot is stale"] }
    });

    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy.mock.calls[0]?.[0]).toContain("\"scope\":\"audit\"");
    expect(mocks.getPostgresPool).not.toHaveBeenCalled();
  });

  it("inserts audit events into postgres when configured", async () => {
    process.env.SWING_RADAR_DATABASE_URL = "postgres://localhost/swing_radar";
    const query = vi.fn().mockResolvedValue({ rows: [] });
    mocks.getPostgresPool.mockReturnValue({ query });

    await recordAuditLog({
      eventType: "admin_publish",
      actor: "admin-editor",
      status: "success",
      requestId: "req-publish",
      summary: "Editorial draft published",
      metadata: { diffCount: 1 }
    });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("insert into audit_logs"),
      [
        "admin_publish",
        "admin-editor",
        "success",
        "req-publish",
        "Editorial draft published",
        JSON.stringify({ diffCount: 1 })
      ]
    );
  });

  it("returns normalized audit log rows from postgres", async () => {
    process.env.SWING_RADAR_DATABASE_URL = "postgres://localhost/swing_radar";
    const query = vi.fn().mockResolvedValue({
      rows: [
        {
          id: 12,
          event_type: "provider_fallback",
          actor: "system",
          status: "warning",
          request_id: "req-health",
          summary: "Provider fallback detected by health check",
          metadata: { configuredProvider: "postgres" },
          created_at: "2026-03-08T00:00:00.000Z"
        }
      ]
    });
    mocks.getPostgresPool.mockReturnValue({ query });

    const result = await listAuditLogs(5);

    expect(query).toHaveBeenCalledWith(expect.stringContaining("select id, event_type"), [5]);
    expect(result).toEqual([
      {
        id: 12,
        eventType: "provider_fallback",
        actor: "system",
        status: "warning",
        requestId: "req-health",
        summary: "Provider fallback detected by health check",
        metadata: { configuredProvider: "postgres" },
        createdAt: "2026-03-08T00:00:00.000Z"
      }
    ]);
  });

  it("wraps audit query failures in an ApiError", async () => {
    process.env.SWING_RADAR_DATABASE_URL = "postgres://localhost/swing_radar";
    mocks.getPostgresPool.mockReturnValue({
      query: vi.fn().mockRejectedValue(new Error("db down"))
    });

    await expect(listAuditLogs()).rejects.toMatchObject<ApiError>({
      code: "AUDIT_QUERY_FAILED",
      status: 500
    });
  });
});
