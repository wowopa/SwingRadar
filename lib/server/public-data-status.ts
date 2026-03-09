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
    return "저장된 스냅샷";
  }

  return "예시 데이터";
}

function formatAge(ageMinutes: number) {
  if (ageMinutes < 60) {
    return `${ageMinutes}분 전`;
  }

  const hours = Math.floor(ageMinutes / 60);
  const minutes = ageMinutes % 60;

  if (minutes === 0) {
    return `${hours}시간 전`;
  }

  return `${hours}시간 ${minutes}분 전`;
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
      badge: "배치 지연",
      sourceLabel: getSourceLabel(),
      summary: "예정된 일일 업데이트가 아직 반영되지 않았습니다.",
      detail: `마지막 갱신은 ${formatAge(indicator.ageMinutes)}입니다. 일일 배치 기준으로 보면 새 스냅샷 반영이 늦어지고 있어 확인이 필요합니다.`
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
      summary: "최근 배치 시각을 한 번 더 확인해보면 좋습니다.",
      detail: `현재 주의 구간은 ${policy.stale.warningMinutes}분 이후부터입니다. 마지막 갱신은 ${formatAge(indicator.ageMinutes)}입니다.`
    };
  }

  return {
    label,
    generatedAt,
    ageMinutes: indicator.ageMinutes,
    freshness: indicator.severity,
    badge: "오늘 기준",
    sourceLabel: getSourceLabel(),
    summary: "최근 일일 배치가 정상 반영된 상태입니다.",
    detail: `마지막 갱신은 ${formatAge(indicator.ageMinutes)}이며, 오늘 기준으로 확인하기에 무리가 없는 상태입니다.`
  };
}
