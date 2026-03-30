import type { SignalTone, TrackingDiagnostic } from "@/types/recommendation";

export type RecommendationActionBucket = "buy_now" | "watch_only" | "avoid";

type TrackingStage = Pick<TrackingDiagnostic, "isEntryEligible" | "isWatchEligible" | "stage">;

export interface ActionSignalInput {
  signalTone: SignalTone;
  activationScore?: number | null;
  featuredRank?: number | null;
  trackingDiagnostic?: Partial<TrackingStage> | null;
}

export interface RecommendationActionItem extends ActionSignalInput {
  ticker: string;
  company: string;
  score: number;
  signalLabel?: string;
  candidateScore?: number | null;
}

export interface ActionBucketMeta {
  label: string;
  shortLabel: string;
  description: string;
  variant: "positive" | "neutral" | "caution";
}

export interface TodayOperatingSummary {
  marketStance: "공격 가능" | "선별 매수" | "관찰 우위";
  summary: string;
  maxNewPositions: number;
  maxConcurrentPositions: number;
  bucketCounts: Record<RecommendationActionBucket, number>;
  focusNote: string;
}

const ACTION_BUCKET_META: Record<RecommendationActionBucket, ActionBucketMeta> = {
  buy_now: {
    label: "오늘 매수 가능",
    shortLabel: "매수 가능",
    description: "조건이 확인돼 지금 매수 계획까지 볼 수 있는 종목입니다.",
    variant: "positive"
  },
  watch_only: {
    label: "관찰만",
    shortLabel: "관찰만",
    description: "흐름은 좋지만 아직 기다리거나 확인이 더 필요한 종목입니다.",
    variant: "neutral"
  },
  avoid: {
    label: "보류",
    shortLabel: "보류",
    description: "지금은 추격하지 않거나 우선순위를 낮춰야 하는 종목입니다.",
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

export function getRecommendationActionMeta(bucket: RecommendationActionBucket) {
  return ACTION_BUCKET_META[bucket];
}

export function resolveRecommendationActionBucket(input: ActionSignalInput): RecommendationActionBucket {
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

  for (const key of Object.keys(grouped) as RecommendationActionBucket[]) {
    grouped[key].sort(comparePriority);
  }

  return grouped;
}

export function buildTodayOperatingSummary(items: RecommendationActionItem[]): TodayOperatingSummary {
  const grouped = bucketRecommendationActions(items);
  const bucketCounts = {
    buy_now: grouped.buy_now.length,
    watch_only: grouped.watch_only.length,
    avoid: grouped.avoid.length
  } satisfies Record<RecommendationActionBucket, number>;

  if (bucketCounts.buy_now >= 2) {
    return {
      marketStance: "공격 가능",
      summary: "오늘은 조건이 맞는 종목만 선별적으로 신규 매수할 수 있는 날입니다. 그래도 상위 몇 종목만 좁혀서 봐야 합니다.",
      maxNewPositions: 2,
      maxConcurrentPositions: 5,
      bucketCounts,
      focusNote: `매수 가능 ${bucketCounts.buy_now}개, 관찰 ${bucketCounts.watch_only}개입니다. 보류 ${bucketCounts.avoid}개는 추격보다 제외에 가깝습니다.`
    };
  }

  if (bucketCounts.buy_now >= 1 || bucketCounts.watch_only >= 3) {
    return {
      marketStance: "선별 매수",
      summary: "오늘은 강하게 넓게 사는 날이 아니라, 가장 좋은 한두 종목만 좁혀서 보는 구간입니다.",
      maxNewPositions: 1,
      maxConcurrentPositions: 4,
      bucketCounts,
      focusNote: `매수 가능 ${bucketCounts.buy_now}개만 우선 검토하고, 나머지 ${bucketCounts.watch_only}개는 관찰 위주로 봅니다.`
    };
  }

  return {
    marketStance: "관찰 우위",
    summary: "오늘은 신규 매수보다 대기와 관찰에 무게를 두는 편이 좋습니다. 보유 중인 종목 관리가 더 중요합니다.",
    maxNewPositions: 0,
    maxConcurrentPositions: 4,
    bucketCounts,
    focusNote: `관찰 후보 ${bucketCounts.watch_only}개가 보이지만, 보류 ${bucketCounts.avoid}개가 많아 추격 매수는 피하는 편이 좋습니다.`
  };
}
