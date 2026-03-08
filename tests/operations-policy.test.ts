import { afterEach, describe, expect, it } from "vitest";

import { getOperationalPolicy } from "@/lib/server/operations-policy";
import { buildStaleDataIndicator } from "@/lib/server/stale-data";

describe("operations policy", () => {
  const originalWarning = process.env.SWING_RADAR_STALE_WARNING_MINUTES;
  const originalCritical = process.env.SWING_RADAR_STALE_CRITICAL_MINUTES;
  const originalHealthAuditLimit = process.env.SWING_RADAR_HEALTH_AUDIT_LIMIT;
  const originalAdminAuditLimit = process.env.SWING_RADAR_ADMIN_AUDIT_LIMIT;

  afterEach(() => {
    if (originalWarning === undefined) {
      delete process.env.SWING_RADAR_STALE_WARNING_MINUTES;
    } else {
      process.env.SWING_RADAR_STALE_WARNING_MINUTES = originalWarning;
    }

    if (originalCritical === undefined) {
      delete process.env.SWING_RADAR_STALE_CRITICAL_MINUTES;
    } else {
      process.env.SWING_RADAR_STALE_CRITICAL_MINUTES = originalCritical;
    }

    if (originalHealthAuditLimit === undefined) {
      delete process.env.SWING_RADAR_HEALTH_AUDIT_LIMIT;
    } else {
      process.env.SWING_RADAR_HEALTH_AUDIT_LIMIT = originalHealthAuditLimit;
    }

    if (originalAdminAuditLimit === undefined) {
      delete process.env.SWING_RADAR_ADMIN_AUDIT_LIMIT;
    } else {
      process.env.SWING_RADAR_ADMIN_AUDIT_LIMIT = originalAdminAuditLimit;
    }
  });

  it("returns defaults when no overrides are configured", () => {
    delete process.env.SWING_RADAR_STALE_WARNING_MINUTES;
    delete process.env.SWING_RADAR_STALE_CRITICAL_MINUTES;
    delete process.env.SWING_RADAR_HEALTH_AUDIT_LIMIT;
    delete process.env.SWING_RADAR_ADMIN_AUDIT_LIMIT;

    expect(getOperationalPolicy()).toEqual({
      stale: {
        warningMinutes: 180,
        criticalMinutes: 360
      },
      audit: {
        healthLookbackLimit: 5,
        adminListLimit: 30
      }
    });
  });

  it("normalizes invalid values and ensures critical is not lower than warning", () => {
    process.env.SWING_RADAR_STALE_WARNING_MINUTES = "240";
    process.env.SWING_RADAR_STALE_CRITICAL_MINUTES = "60";
    process.env.SWING_RADAR_HEALTH_AUDIT_LIMIT = "7";
    process.env.SWING_RADAR_ADMIN_AUDIT_LIMIT = "-5";

    expect(getOperationalPolicy()).toEqual({
      stale: {
        warningMinutes: 240,
        criticalMinutes: 240
      },
      audit: {
        healthLookbackLimit: 7,
        adminListLimit: 30
      }
    });
  });

  it("uses the shared policy thresholds for stale severity decisions", () => {
    process.env.SWING_RADAR_STALE_WARNING_MINUTES = "10";
    process.env.SWING_RADAR_STALE_CRITICAL_MINUTES = "20";

    const now = Date.now();
    const warningTimestamp = new Date(now - 12 * 60_000).toISOString();
    const criticalTimestamp = new Date(now - 25 * 60_000).toISOString();

    expect(buildStaleDataIndicator("analysis", warningTimestamp)).toMatchObject({
      stale: true,
      severity: "warning"
    });
    expect(buildStaleDataIndicator("tracking", criticalTimestamp)).toMatchObject({
      stale: true,
      severity: "critical"
    });
  });
});
