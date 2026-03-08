const DEFAULT_STALE_WARNING_MINUTES = 180;
const DEFAULT_STALE_CRITICAL_MINUTES = 360;
const DEFAULT_HEALTH_AUDIT_LOOKBACK = 5;
const DEFAULT_ADMIN_AUDIT_LIMIT = 30;

export interface OperationalPolicy {
  stale: {
    warningMinutes: number;
    criticalMinutes: number;
  };
  audit: {
    healthLookbackLimit: number;
    adminListLimit: number;
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
    }
  };
}
