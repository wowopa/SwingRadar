import type {
  OpeningActionIntent,
  OpeningConfirmationCheck,
  OpeningGapCheck,
  OpeningRecheckChecklist,
  OpeningRecheckDecision,
  OpeningRecheckStatus
} from "@/types/recommendation";

export const OPENING_RECHECK_STATUSES = ["pending", "passed", "watch", "avoid", "excluded"] as const;
export const OPENING_RECHECK_DECISION_STATUSES = ["passed", "watch", "avoid", "excluded"] as const;
export const OPENING_GAP_CHECKS = ["normal", "elevated", "overheated"] as const;
export const OPENING_CONFIRMATION_CHECKS = ["confirmed", "mixed", "failed"] as const;
export const OPENING_ACTION_INTENTS = ["review", "watch", "hold"] as const;

export interface OpeningRecheckStatusMeta {
  label: string;
  description: string;
  variant: "default" | "secondary" | "positive" | "neutral" | "caution";
}

export interface OpeningRecheckOptionMeta {
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
    description: "아직 장초 확인 전입니다.",
    variant: "secondary"
  },
  passed: {
    label: "통과",
    description: "장초 확인을 통과해 오늘 행동 후보로 유지합니다.",
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

const OPENING_GAP_META: Record<OpeningGapCheck, OpeningRecheckOptionMeta> = {
  normal: {
    label: "정상 갭",
    description: "시초가가 계획 범위 안쪽이거나 과열이 아닙니다.",
    variant: "positive"
  },
  elevated: {
    label: "약간 높음",
    description: "지금 바로 매수보다 조금 더 확인이 필요한 갭입니다.",
    variant: "neutral"
  },
  overheated: {
    label: "갭 과열",
    description: "계획 진입가보다 너무 높게 떠서 추격에 가깝습니다.",
    variant: "caution"
  }
};

const OPENING_CONFIRMATION_META: Record<OpeningConfirmationCheck, OpeningRecheckOptionMeta> = {
  confirmed: {
    label: "확인 가격 유지",
    description: "확인 가격 전후에서 버티거나 돌파 반응이 붙습니다.",
    variant: "positive"
  },
  mixed: {
    label: "아직 애매함",
    description: "구조는 살아 있지만 바로 판단하긴 이른 흐름입니다.",
    variant: "neutral"
  },
  failed: {
    label: "확인 실패",
    description: "확인 가격 반응이 무너졌거나 구조가 약해졌습니다.",
    variant: "caution"
  }
};

const OPENING_ACTION_META: Record<OpeningActionIntent, OpeningRecheckOptionMeta> = {
  review: {
    label: "오늘 진입 검토",
    description: "오늘 실제 매수 검토까지 열어둘 생각입니다.",
    variant: "positive"
  },
  watch: {
    label: "조금 더 관찰",
    description: "구조는 있지만 지금은 조금 더 보고 싶습니다.",
    variant: "neutral"
  },
  hold: {
    label: "오늘 보류",
    description: "오늘은 따라붙지 않고 넘기는 쪽이 낫습니다.",
    variant: "caution"
  }
};

export function getOpeningRecheckStatusMeta(status: OpeningRecheckStatus) {
  return OPENING_RECHECK_STATUS_META[status];
}

export function getOpeningGapMeta(status: OpeningGapCheck) {
  return OPENING_GAP_META[status];
}

export function getOpeningConfirmationMeta(status: OpeningConfirmationCheck) {
  return OPENING_CONFIRMATION_META[status];
}

export function getOpeningActionIntentMeta(status: OpeningActionIntent) {
  return OPENING_ACTION_META[status];
}

export function suggestOpeningRecheckStatus(checklist: OpeningRecheckChecklist): Exclude<OpeningRecheckStatus, "pending"> {
  if (checklist.confirmation === "failed") {
    return "excluded";
  }

  if (checklist.gap === "overheated") {
    return "avoid";
  }

  if (checklist.action === "hold") {
    return "avoid";
  }

  if (checklist.confirmation === "mixed") {
    return "watch";
  }

  if (checklist.action === "watch") {
    return "watch";
  }

  if (checklist.gap === "elevated") {
    return "watch";
  }

  return "passed";
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
