import { getOperationalPolicy } from "@/lib/server/operations-policy";
import { buildStaleDataIndicator } from "@/lib/server/stale-data";

export interface PublicDataStatusSummary {
  label: string;
  generatedAt: string;
  ageMinutes: number;
  freshness: "ok" | "warning" | "critical";
  badge: string;
  sourceLabel: string;
  summary: string;
  detail: string;
}

function getSourceLabel() {
  const provider = process.env.SWING_RADAR_DATA_PROVIDER ?? "mock";

  if (provider === "postgres") {
    return "자동 갱신 데이터";
  }

  if (provider === "file") {
    return "저장된 데이터";
  }

  return "예시 데이터";
}

export function buildPublicDataStatusSummary(label: string, generatedAt: string): PublicDataStatusSummary {
  const indicator = buildStaleDataIndicator(label, generatedAt);
  const policy = getOperationalPolicy();

  if (indicator.severity === "critical") {
    return {
      label,
      generatedAt,
      ageMinutes: indicator.ageMinutes,
      freshness: indicator.severity,
      badge: "업데이트 지연",
      sourceLabel: getSourceLabel(),
      summary: "업데이트가 많이 늦어졌습니다.",
      detail: `마지막 갱신 후 ${indicator.ageMinutes}분이 지났습니다. 참고용으로만 보고 최신 가격을 함께 확인해 주세요.`
    };
  }

  if (indicator.severity === "warning") {
    return {
      label,
      generatedAt,
      ageMinutes: indicator.ageMinutes,
      freshness: indicator.severity,
      badge: "점검 필요",
      sourceLabel: getSourceLabel(),
      summary: "업데이트가 다소 늦어졌습니다.",
      detail: `현재 기준은 ${policy.stale.warningMinutes}분 이내 갱신입니다. 가격과 뉴스는 한 번 더 확인해 주세요.`
    };
  }

  return {
    label,
    generatedAt,
    ageMinutes: indicator.ageMinutes,
    freshness: indicator.severity,
    badge: "최신",
    sourceLabel: getSourceLabel(),
    summary: "최근 데이터로 업데이트되어 있습니다.",
    detail: `자동 갱신 기준 안에서 반영된 상태입니다. 마지막 갱신 후 ${indicator.ageMinutes}분이 지났습니다.`
  };
}
