import type { OpeningRecheckDecision, OpeningRecheckStatus } from "@/types/recommendation";

export const OPENING_RECHECK_STATUSES = ["pending", "passed", "watch", "avoid", "excluded"] as const;
export const OPENING_RECHECK_DECISION_STATUSES = ["passed", "watch", "avoid", "excluded"] as const;

export interface OpeningRecheckStatusMeta {
  label: string;
  description: string;
  variant: "default" | "secondary" | "positive" | "neutral" | "caution";
}

export interface OpeningRecheckCounts {
  pending: number;
  passed: number;
  watch: number;
  avoid: number;
  excluded: number;
}

const OPENING_RECHECK_STATUS_META: Record<OpeningRecheckStatus, OpeningRecheckStatusMeta> = {
  pending: {
    label: "대기",
    description: "아직 장초 재판정 전입니다.",
    variant: "secondary"
  },
  passed: {
    label: "통과",
    description: "장초 재판정을 통과해 오늘 행동 후보로 유지합니다.",
    variant: "positive"
  },
  watch: {
    label: "관찰 유지",
    description: "구조는 유지되지만 바로 행동하지 않고 더 지켜봅니다.",
    variant: "neutral"
  },
  avoid: {
    label: "추격 금지",
    description: "갭상승이나 과열 때문에 지금은 따라붙지 않습니다.",
    variant: "caution"
  },
  excluded: {
    label: "제외",
    description: "손절 기준 훼손 또는 구조 악화로 오늘 후보에서 뺍니다.",
    variant: "default"
  }
};

export function getOpeningRecheckStatusMeta(status: OpeningRecheckStatus) {
  return OPENING_RECHECK_STATUS_META[status];
}

export function buildOpeningRecheckCounts(
  tickers: string[],
  decisions: Record<string, OpeningRecheckDecision | undefined>
): OpeningRecheckCounts {
  const counts: OpeningRecheckCounts = {
    pending: 0,
    passed: 0,
    watch: 0,
    avoid: 0,
    excluded: 0
  };

  for (const ticker of tickers) {
    const status = decisions[ticker]?.status ?? "pending";
    counts[status] += 1;
  }

  return counts;
}
