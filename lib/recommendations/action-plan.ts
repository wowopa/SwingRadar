import type { DailyCandidate } from "@/lib/repositories/daily-candidates";
import { formatPrice } from "@/lib/utils";
import type {
  Recommendation,
  RecommendationActionBucket,
  RecommendationTradePlan,
  SignalTone,
  TodayActionSummary,
  TrackingDiagnostic
} from "@/types/recommendation";

type TrackingStage = Pick<TrackingDiagnostic, "isEntryEligible" | "isWatchEligible" | "stage">;

export type { RecommendationActionBucket };

export interface ActionSignalInput {
  signalTone: SignalTone;
  score?: number | null;
  activationScore?: number | null;
  featuredRank?: number | null;
  trackingDiagnostic?: Partial<TrackingStage> | null;
  actionBucket?: RecommendationActionBucket | null;
}

export interface RecommendationActionItem extends ActionSignalInput {
  ticker: string;
  company: string;
  score: number;
  signalLabel?: string;
  candidateScore?: number | null;
}

interface RecommendationTradePlanInput extends ActionSignalInput {
  invalidation: string;
  checkpoints: string[];
  observationWindow: string;
  riskRewardRatio?: string | null;
}

export interface ActionBucketMeta {
  label: string;
  shortLabel: string;
  description: string;
  variant: "positive" | "neutral" | "caution";
}

export type TodayOperatingSummary = TodayActionSummary;

const ACTION_BUCKET_META: Record<RecommendationActionBucket, ActionBucketMeta> = {
  buy_now: {
    label: "오늘 매수 가능",
    shortLabel: "매수 가능",
    description: "조건이 맞으면 오늘 실제 진입까지 검토할 수 있는 종목입니다.",
    variant: "positive"
  },
  watch_only: {
    label: "관찰만",
    shortLabel: "관찰만",
    description: "흐름은 좋지만 확인 가격과 거래 반응을 더 봐야 하는 종목입니다.",
    variant: "neutral"
  },
  avoid: {
    label: "보류",
    shortLabel: "보류",
    description: "지금은 추격보다 관망이 더 나은 종목입니다.",
    variant: "caution"
  }
};

function comparePriority(left: RecommendationActionItem, right: RecommendationActionItem) {
  const leftRank = left.featuredRank ?? Number.MAX_SAFE_INTEGER;
  const rightRank = right.featuredRank ?? Number.MAX_SAFE_INTEGER;
  if (leftRank !== rightRank) {
    return leftRank - rightRank;
  }

  const leftCandidate = left.candidateScore ?? Number.NEGATIVE_INFINITY;
  const rightCandidate = right.candidateScore ?? Number.NEGATIVE_INFINITY;
  if (leftCandidate !== rightCandidate) {
    return rightCandidate - leftCandidate;
  }

  if (left.score !== right.score) {
    return right.score - left.score;
  }

  return left.company.localeCompare(right.company, "ko");
}

function parsePriceText(value?: string | null) {
  if (!value) {
    return null;
  }

  const match = value.match(/-?\d[\d,]*/);
  if (!match) {
    return null;
  }

  const parsed = Number(match[0].replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatPriceLabel(value: number | null, fallback: string) {
  return value === null ? fallback : formatPrice(value);
}

function formatPriceRange(low: number | null, high: number | null, fallback: string) {
  if (low === null && high === null) {
    return fallback;
  }

  if (low !== null && high !== null) {
    return low === high ? formatPrice(low) : `${formatPrice(low)} ~ ${formatPrice(high)}`;
  }

  return formatPrice(low ?? high ?? 0);
}

function getDefaultHoldWindow(signalTone: SignalTone) {
  if (signalTone === "긍정") {
    return "5~15거래일";
  }

  if (signalTone === "중립") {
    return "3~10거래일";
  }

  return "1~7거래일";
}

function formatRiskRewardLabel(
  entryReference: number | null,
  stopPrice: number | null,
  targetPrice: number | null,
  fallback?: string | null
) {
  if (entryReference === null || stopPrice === null || targetPrice === null) {
    return fallback?.trim() ? fallback : "계산 중";
  }

  const risk = entryReference - stopPrice;
  const reward = targetPrice - entryReference;
  if (risk <= 0 || reward <= 0) {
    return fallback?.trim() ? fallback : "매력 낮음";
  }

  return `1 : ${(reward / risk).toFixed(1)}`;
}

function buildNextStep(bucket: RecommendationActionBucket, confirmationPrice: number | null, stopPrice: number | null) {
  if (bucket === "buy_now") {
    if (confirmationPrice !== null) {
      return `${formatPrice(confirmationPrice)} 돌파 또는 지지 확인 뒤에 분할 진입을 검토합니다.`;
    }

    return "확인 가격과 거래량이 함께 붙는지 먼저 보고 진입 여부를 결정합니다.";
  }

  if (bucket === "watch_only") {
    if (confirmationPrice !== null) {
      return `${formatPrice(confirmationPrice)} 전후 반응을 볼 때까지는 관찰만 유지합니다.`;
    }

    return "확인 가격과 거래 반응이 다시 살아나는지 기다립니다.";
  }

  if (stopPrice !== null) {
    return `${formatPrice(stopPrice)} 부근 구조가 다시 정리되기 전까지는 신규 진입을 미룹니다.`;
  }

  return "지금은 새로 사기보다 보류가 더 나은 구간입니다.";
}

function buildStretchTarget(targetPrice: number | null, confirmationPrice: number | null, stopPrice: number | null) {
  if (targetPrice === null || confirmationPrice === null || stopPrice === null) {
    return null;
  }

  const extension = Math.max(targetPrice - confirmationPrice, confirmationPrice - stopPrice);
  return Math.round(targetPrice + extension);
}

function buildEntryPlan(
  bucket: RecommendationActionBucket,
  currentPrice: number | null,
  confirmationPrice: number | null
) {
  if (bucket === "buy_now") {
    const low =
      currentPrice !== null && confirmationPrice !== null
        ? Math.min(currentPrice, confirmationPrice)
        : (confirmationPrice ?? currentPrice);
    const high =
      currentPrice !== null && confirmationPrice !== null
        ? Math.max(currentPrice, confirmationPrice)
        : (confirmationPrice ?? currentPrice);

    return {
      entryPriceLow: low,
      entryPriceHigh: high,
      entryLabel: formatPriceRange(low, high, "확인 가격 전후"),
      entryReference: confirmationPrice ?? currentPrice
    };
  }

  if (bucket === "watch_only") {
    return {
      entryPriceLow: confirmationPrice,
      entryPriceHigh: confirmationPrice,
      entryLabel: confirmationPrice === null ? "확인 가격 재설정 필요" : `${formatPrice(confirmationPrice)} 돌파/지지 확인`,
      entryReference: confirmationPrice ?? currentPrice
    };
  }

  return {
    entryPriceLow: null,
    entryPriceHigh: null,
    entryLabel: "지금은 대기",
    entryReference: currentPrice ?? confirmationPrice
  };
}

export function getRecommendationActionMeta(bucket: RecommendationActionBucket) {
  return ACTION_BUCKET_META[bucket];
}

export function resolveRecommendationActionBucket(input: ActionSignalInput): RecommendationActionBucket {
  if (input.actionBucket) {
    return input.actionBucket;
  }

  if (input.trackingDiagnostic?.isEntryEligible || input.trackingDiagnostic?.stage === "진입 추적 가능") {
    return "buy_now";
  }

  if (input.trackingDiagnostic?.isWatchEligible || input.trackingDiagnostic?.stage === "자동 감시 가능") {
    return "watch_only";
  }

  if (input.signalTone === "긍정" && typeof input.activationScore === "number" && input.activationScore >= 68) {
    return "buy_now";
  }

  if (input.signalTone !== "주의" && typeof input.activationScore === "number" && input.activationScore >= 52) {
    return "watch_only";
  }

  if (input.signalTone === "긍정" && (input.featuredRank ?? Number.MAX_SAFE_INTEGER) <= 5) {
    return "watch_only";
  }

  if (input.signalTone !== "주의" && typeof input.score === "number" && input.score >= 60) {
    return "watch_only";
  }

  return "avoid";
}

export function bucketRecommendationActions(items: RecommendationActionItem[]) {
  const grouped: Record<RecommendationActionBucket, RecommendationActionItem[]> = {
    buy_now: [],
    watch_only: [],
    avoid: []
  };

  for (const item of items) {
    grouped[resolveRecommendationActionBucket(item)].push(item);
  }

  for (const bucket of Object.keys(grouped) as RecommendationActionBucket[]) {
    grouped[bucket].sort(comparePriority);
  }

  return grouped;
}

export function buildTodayOperatingSummary(items: RecommendationActionItem[]): TodayOperatingSummary {
  const grouped = bucketRecommendationActions(items);
  const bucketCounts = {
    buy_now: grouped.buy_now.length,
    watch_only: grouped.watch_only.length,
    avoid: grouped.avoid.length
  };

  if (bucketCounts.buy_now >= 2) {
    return {
      marketStance: "attack",
      marketStanceLabel: "공격 가능",
      summary: "오늘은 조건이 맞는 종목이 여러 개 보이지만, 상위 1~2개만 선별해 진입을 검토하는 날입니다.",
      maxNewPositions: 2,
      maxConcurrentPositions: 5,
      bucketCounts,
      focusNote: `매수 가능 ${bucketCounts.buy_now}개, 관찰 ${bucketCounts.watch_only}개입니다. 보류 ${bucketCounts.avoid}개는 추격보다 제외에 가깝습니다.`
    };
  }

  if (bucketCounts.buy_now >= 1 || bucketCounts.watch_only >= 3) {
    return {
      marketStance: "selective",
      marketStanceLabel: "선별 매수",
      summary: "오늘은 강하게 넓게 사는 날이 아니라, 가장 좋은 1개만 신중하게 보는 날입니다.",
      maxNewPositions: 1,
      maxConcurrentPositions: 4,
      bucketCounts,
      focusNote: `매수 가능 ${bucketCounts.buy_now}개만 우선 검토하고, 나머지 ${bucketCounts.watch_only}개는 관찰 위주로 대응합니다.`
    };
  }

  return {
    marketStance: "watch",
    marketStanceLabel: "관찰 우위",
    summary: "오늘은 신규 매수보다 기존 보유 관리와 관찰에 무게를 두는 편이 좋습니다.",
    maxNewPositions: 0,
    maxConcurrentPositions: 4,
    bucketCounts,
    focusNote: `관찰 후보 ${bucketCounts.watch_only}개가 있어도 보류 ${bucketCounts.avoid}개가 많아 추격 매수는 피하는 편이 좋습니다.`
  };
}

export function buildRecommendationTradePlan({
  item,
  candidate
}: {
  item: RecommendationTradePlanInput;
  candidate?: DailyCandidate | null;
}): RecommendationTradePlan {
  const bucket = resolveRecommendationActionBucket(item);
  const currentPrice = candidate?.currentPrice ?? null;
  const confirmationPrice = candidate?.confirmationPrice ?? parsePriceText(item.checkpoints[1] ?? item.checkpoints[0]);
  const stopPrice = candidate?.invalidationPrice ?? parsePriceText(item.invalidation);
  const targetPrice = candidate?.expansionPrice ?? parsePriceText(item.checkpoints[2] ?? item.checkpoints[1]);
  const stretchTargetPrice = buildStretchTarget(targetPrice, confirmationPrice, stopPrice);
  const entryPlan = buildEntryPlan(bucket, currentPrice, confirmationPrice);

  return {
    currentPrice,
    currentPriceLabel: formatPriceLabel(currentPrice, "현재가 확인 필요"),
    entryPriceLow: entryPlan.entryPriceLow ?? undefined,
    entryPriceHigh: entryPlan.entryPriceHigh ?? undefined,
    confirmationPrice: confirmationPrice ?? undefined,
    entryLabel: entryPlan.entryLabel,
    stopPrice: stopPrice ?? undefined,
    stopLabel: stopPrice === null ? item.invalidation : formatPrice(stopPrice),
    targetPrice: targetPrice ?? undefined,
    targetLabel: formatPriceLabel(targetPrice, "1차 목표 확인 필요"),
    stretchTargetPrice: stretchTargetPrice ?? undefined,
    stretchTargetLabel: formatPriceLabel(stretchTargetPrice, "추가 목표 확인"),
    holdWindowLabel: item.observationWindow || getDefaultHoldWindow(item.signalTone),
    riskRewardLabel: formatRiskRewardLabel(entryPlan.entryReference ?? null, stopPrice, targetPrice, item.riskRewardRatio),
    nextStep: buildNextStep(bucket, confirmationPrice, stopPrice)
  };
}

export function createRecommendationTradePlanInput(
  recommendation: Pick<
    Recommendation,
    | "signalTone"
    | "score"
    | "activationScore"
    | "featuredRank"
    | "trackingDiagnostic"
    | "actionBucket"
    | "invalidation"
    | "checkpoints"
    | "observationWindow"
    | "riskRewardRatio"
  >
): RecommendationTradePlanInput {
  return {
    signalTone: recommendation.signalTone,
    score: recommendation.score,
    activationScore: recommendation.activationScore,
    featuredRank: recommendation.featuredRank,
    trackingDiagnostic: recommendation.trackingDiagnostic,
    actionBucket: recommendation.actionBucket,
    invalidation: recommendation.invalidation,
    checkpoints: recommendation.checkpoints,
    observationWindow: recommendation.observationWindow || getDefaultHoldWindow(recommendation.signalTone),
    riskRewardRatio: recommendation.riskRewardRatio
  };
}
