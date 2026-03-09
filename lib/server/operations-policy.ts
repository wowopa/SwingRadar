const DEFAULT_STALE_WARNING_MINUTES = 180;
const DEFAULT_STALE_CRITICAL_MINUTES = 360;
const DEFAULT_HEALTH_AUDIT_LOOKBACK = 5;
const DEFAULT_ADMIN_AUDIT_LIMIT = 30;
const DEFAULT_PROVIDER_FALLBACK_ESCALATION_COUNT = 3;
const DEFAULT_NEWS_LIVE_FETCH_WARNING_PERCENT = 70;
const DEFAULT_NEWS_LIVE_FETCH_CRITICAL_PERCENT = 40;
const DEFAULT_VALIDATION_FALLBACK_WARNING_COUNT = 1;
const DEFAULT_VALIDATION_FALLBACK_CRITICAL_COUNT = 3;

export interface OperationalPolicy {
  stale: {
    warningMinutes: number;
    criticalMinutes: number;
  };
  audit: {
    healthLookbackLimit: number;
    adminListLimit: number;
  };
  escalation: {
    providerFallbackAuditCount: number;
    newsLiveFetchWarningPercent: number;
    newsLiveFetchCriticalPercent: number;
    validationFallbackWarningCount: number;
    validationFallbackCriticalCount: number;
  };
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

export function getOperationalPolicy(): OperationalPolicy {
  const warningMinutes = parsePositiveInt(process.env.SWING_RADAR_STALE_WARNING_MINUTES, DEFAULT_STALE_WARNING_MINUTES);
  const requestedCriticalMinutes = parsePositiveInt(process.env.SWING_RADAR_STALE_CRITICAL_MINUTES, DEFAULT_STALE_CRITICAL_MINUTES);

  return {
    stale: {
      warningMinutes,
      criticalMinutes: Math.max(requestedCriticalMinutes, warningMinutes)
    },
    audit: {
      healthLookbackLimit: parsePositiveInt(process.env.SWING_RADAR_HEALTH_AUDIT_LIMIT, DEFAULT_HEALTH_AUDIT_LOOKBACK),
      adminListLimit: parsePositiveInt(process.env.SWING_RADAR_ADMIN_AUDIT_LIMIT, DEFAULT_ADMIN_AUDIT_LIMIT)
    },
    escalation: {
      providerFallbackAuditCount: parsePositiveInt(
        process.env.SWING_RADAR_PROVIDER_FALLBACK_ESCALATION_COUNT,
        DEFAULT_PROVIDER_FALLBACK_ESCALATION_COUNT
      ),
      newsLiveFetchWarningPercent: parsePositiveInt(
        process.env.SWING_RADAR_NEWS_LIVE_FETCH_WARNING_PERCENT,
        DEFAULT_NEWS_LIVE_FETCH_WARNING_PERCENT
      ),
      newsLiveFetchCriticalPercent: parsePositiveInt(
        process.env.SWING_RADAR_NEWS_LIVE_FETCH_CRITICAL_PERCENT,
        DEFAULT_NEWS_LIVE_FETCH_CRITICAL_PERCENT
      ),
      validationFallbackWarningCount: parsePositiveInt(
        process.env.SWING_RADAR_VALIDATION_FALLBACK_WARNING_COUNT,
        DEFAULT_VALIDATION_FALLBACK_WARNING_COUNT
      ),
      validationFallbackCriticalCount: parsePositiveInt(
        process.env.SWING_RADAR_VALIDATION_FALLBACK_CRITICAL_COUNT,
        DEFAULT_VALIDATION_FALLBACK_CRITICAL_COUNT
      )
    }
  };
}
