const DEFAULT_WARNING_MINUTES = 180;
const DEFAULT_CRITICAL_MINUTES = 360;

export interface StaleDataIndicator {
  label: string;
  generatedAt: string;
  ageMinutes: number;
  stale: boolean;
  severity: "ok" | "warning" | "critical";
}

function getThresholds() {
  return {
    warningMinutes: Number(process.env.SWING_RADAR_STALE_WARNING_MINUTES ?? DEFAULT_WARNING_MINUTES),
    criticalMinutes: Number(process.env.SWING_RADAR_STALE_CRITICAL_MINUTES ?? DEFAULT_CRITICAL_MINUTES)
  };
}

export function buildStaleDataIndicator(label: string, generatedAt: string): StaleDataIndicator {
  const generatedTime = new Date(generatedAt).getTime();
  const ageMinutes = Math.max(0, Math.round((Date.now() - generatedTime) / 60000));
  const thresholds = getThresholds();

  let severity: StaleDataIndicator["severity"] = "ok";
  if (ageMinutes >= thresholds.criticalMinutes) {
    severity = "critical";
  } else if (ageMinutes >= thresholds.warningMinutes) {
    severity = "warning";
  }

  return {
    label,
    generatedAt,
    ageMinutes,
    stale: severity !== "ok",
    severity
  };
}
