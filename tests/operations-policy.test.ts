import { afterEach, describe, expect, it } from "vitest";

import { getOperationalPolicy } from "@/lib/server/operations-policy";
import { buildStaleDataIndicator } from "@/lib/server/stale-data";

describe("operations policy", () => {
  const originalWarning = process.env.SWING_RADAR_STALE_WARNING_MINUTES;
  const originalCritical = process.env.SWING_RADAR_STALE_CRITICAL_MINUTES;
  const originalHealthAuditLimit = process.env.SWING_RADAR_HEALTH_AUDIT_LIMIT;
  const originalAdminAuditLimit = process.env.SWING_RADAR_ADMIN_AUDIT_LIMIT;
  const originalNewsLiveWarning = process.env.SWING_RADAR_NEWS_LIVE_FETCH_WARNING_PERCENT;
  const originalNewsLiveCritical = process.env.SWING_RADAR_NEWS_LIVE_FETCH_CRITICAL_PERCENT;
  const originalValidationWarning = process.env.SWING_RADAR_VALIDATION_FALLBACK_WARNING_PERCENT;
  const originalValidationCritical = process.env.SWING_RADAR_VALIDATION_FALLBACK_CRITICAL_PERCENT;

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

    if (originalNewsLiveWarning === undefined) {
      delete process.env.SWING_RADAR_NEWS_LIVE_FETCH_WARNING_PERCENT;
    } else {
      process.env.SWING_RADAR_NEWS_LIVE_FETCH_WARNING_PERCENT = originalNewsLiveWarning;
    }

    if (originalNewsLiveCritical === undefined) {
      delete process.env.SWING_RADAR_NEWS_LIVE_FETCH_CRITICAL_PERCENT;
    } else {
      process.env.SWING_RADAR_NEWS_LIVE_FETCH_CRITICAL_PERCENT = originalNewsLiveCritical;
    }

    if (originalValidationWarning === undefined) {
      delete process.env.SWING_RADAR_VALIDATION_FALLBACK_WARNING_PERCENT;
    } else {
      process.env.SWING_RADAR_VALIDATION_FALLBACK_WARNING_PERCENT = originalValidationWarning;
    }

    if (originalValidationCritical === undefined) {
      delete process.env.SWING_RADAR_VALIDATION_FALLBACK_CRITICAL_PERCENT;
    } else {
      process.env.SWING_RADAR_VALIDATION_FALLBACK_CRITICAL_PERCENT = originalValidationCritical;
    }
  });

  it("returns defaults when no overrides are configured", () => {
    delete process.env.SWING_RADAR_STALE_WARNING_MINUTES;
    delete process.env.SWING_RADAR_STALE_CRITICAL_MINUTES;
    delete process.env.SWING_RADAR_HEALTH_AUDIT_LIMIT;
    delete process.env.SWING_RADAR_ADMIN_AUDIT_LIMIT;

    expect(getOperationalPolicy()).toEqual({
      stale: {
        warningMinutes: 1560,
        criticalMinutes: 3000
      },
      audit: {
        healthLookbackLimit: 5,
        adminListLimit: 30
      },
      escalation: {
        providerFallbackAuditCount: 3,
        newsLiveFetchWarningPercent: 70,
        newsLiveFetchCriticalPercent: 40,
        validationFallbackWarningPercent: 50,
        validationFallbackCriticalPercent: 80
      }
    });
  });

  it("normalizes invalid values and ensures critical is not lower than warning", () => {
    process.env.SWING_RADAR_STALE_WARNING_MINUTES = "240";
    process.env.SWING_RADAR_STALE_CRITICAL_MINUTES = "60";
    process.env.SWING_RADAR_HEALTH_AUDIT_LIMIT = "7";
    process.env.SWING_RADAR_ADMIN_AUDIT_LIMIT = "-5";
    process.env.SWING_RADAR_NEWS_LIVE_FETCH_WARNING_PERCENT = "65";
    process.env.SWING_RADAR_NEWS_LIVE_FETCH_CRITICAL_PERCENT = "30";
    process.env.SWING_RADAR_VALIDATION_FALLBACK_WARNING_PERCENT = "45";
    process.env.SWING_RADAR_VALIDATION_FALLBACK_CRITICAL_PERCENT = "75";

    expect(getOperationalPolicy()).toEqual({
      stale: {
        warningMinutes: 240,
        criticalMinutes: 240
      },
      audit: {
        healthLookbackLimit: 7,
        adminListLimit: 30
      },
      escalation: {
        providerFallbackAuditCount: 3,
        newsLiveFetchWarningPercent: 65,
        newsLiveFetchCriticalPercent: 30,
        validationFallbackWarningPercent: 45,
        validationFallbackCriticalPercent: 75
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
