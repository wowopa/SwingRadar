import { buildStaleDataIndicator } from "@/lib/server/stale-data";

export interface PublicDataStatusSummary {
  label: string;
  title: string;
  generatedAt: string;
  ageMinutes: number;
  freshness: "ok" | "warning" | "critical";
  sourceLabel: string;
}

function getSourceLabel() {
  const provider = process.env.SWING_RADAR_DATA_PROVIDER ?? "mock";

  if (provider === "postgres") {
    return "자동 갱신 스냅샷";
  }

  if (provider === "file") {
    return "저장된 기준 스냅샷";
  }

  return "예시 데이터";
}

function getStatusTitle(label: string) {
  if (label === "recommendations") {
    return "관찰 종목";
  }

  if (label === "daily-candidates") {
    return "추천 랭킹";
  }

  if (label === "analysis") {
    return "상세 분석";
  }

  if (label === "tracking") {
    return "추적 기록";
  }

  return "데이터";
}

export function buildPublicDataStatusSummary(label: string, generatedAt: string): PublicDataStatusSummary {
  const indicator = buildStaleDataIndicator(label, generatedAt);

  return {
    label,
    title: getStatusTitle(label),
    generatedAt,
    ageMinutes: indicator.ageMinutes,
    freshness: indicator.severity,
    sourceLabel: getSourceLabel()
  };
}
