import { getOperationalPolicy } from "@/lib/server/operations-policy";

export interface StaleDataIndicator {
  label: string;
  generatedAt: string;
  ageMinutes: number;
  stale: boolean;
  severity: "ok" | "warning" | "critical";
}

export function buildStaleDataIndicator(label: string, generatedAt: string): StaleDataIndicator {
  const generatedTime = new Date(generatedAt).getTime();
  const ageMinutes = Math.max(0, Math.round((Date.now() - generatedTime) / 60000));
  const thresholds = getOperationalPolicy().stale;

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
