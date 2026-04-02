import type { RecommendationActionBucket, RecommendationTradePlan } from "@/types/recommendation";

type TradePlanPreview = Pick<
  RecommendationTradePlan,
  "currentPrice" | "confirmationPrice" | "entryPriceHigh" | "entryPriceLow"
>;

export interface OpeningCheckPatternPreviewRiskLike {
  id: string;
  title: string;
  count: number;
  profitableCount: number;
  lossCount: number;
  winRate: number;
}

export interface OpeningCheckPatternPreviewPositiveLike {
  id: string;
  title: string;
  count: number;
  profitableCount: number;
  lossCount: number;
  winRate: number;
  headline?: string;
  detail?: string;
}

export interface OpeningCheckPatternPreviewInput {
  actionBucket?: RecommendationActionBucket | null;
  tradePlan?: TradePlanPreview | null;
}

export interface OpeningCheckPatternPreviewResult {
  id: string;
  kind: "risk" | "positive";
  label: string;
  detail: string;
  title: string;
}

function resolvePreviewAction(actionBucket?: RecommendationActionBucket | null) {
  if (actionBucket === "buy_now") {
    return "review";
  }

  if (actionBucket === "watch_only") {
    return "watch";
  }

  return "hold";
}

function resolvePreviewReferencePrice(tradePlan?: TradePlanPreview | null) {
  if (!tradePlan) {
    return null;
  }

  return tradePlan.confirmationPrice ?? tradePlan.entryPriceHigh ?? tradePlan.entryPriceLow ?? tradePlan.currentPrice ?? null;
}

function resolvePreviewGap(tradePlan?: TradePlanPreview | null) {
  const referencePrice = resolvePreviewReferencePrice(tradePlan);
  const currentPrice = tradePlan?.currentPrice ?? null;

  if (!referencePrice || !currentPrice || referencePrice <= 0) {
    return "normal";
  }

  const gapRatio = (currentPrice - referencePrice) / referencePrice;

  if (gapRatio >= 0.03) {
    return "overheated";
  }

  if (gapRatio >= 0) {
    return "elevated";
  }

  return "normal";
}

function resolvePreviewConfirmation(
  actionBucket?: RecommendationActionBucket | null,
  tradePlan?: TradePlanPreview | null
) {
  const referencePrice = resolvePreviewReferencePrice(tradePlan);
  const currentPrice = tradePlan?.currentPrice ?? null;

  if (!referencePrice || !currentPrice || referencePrice <= 0) {
    return actionBucket === "buy_now" ? "confirmed" : "mixed";
  }

  return currentPrice >= referencePrice ? "confirmed" : "mixed";
}

function buildPreviewPatternId(input: OpeningCheckPatternPreviewInput) {
  return `${resolvePreviewGap(input.tradePlan)}:${resolvePreviewConfirmation(input.actionBucket, input.tradePlan)}:${resolvePreviewAction(
    input.actionBucket
  )}`;
}

export function buildOpeningCheckPatternPreview(
  input: OpeningCheckPatternPreviewInput,
  options: {
    riskPatterns?: OpeningCheckPatternPreviewRiskLike[];
    positivePattern?: OpeningCheckPatternPreviewPositiveLike;
  }
): OpeningCheckPatternPreviewResult | null {
  if (!input.actionBucket) {
    return null;
  }

  const patternId = buildPreviewPatternId(input);
  const riskPattern = options.riskPatterns?.find((pattern) => pattern.id === patternId);
  const riskIsMeaningful =
    riskPattern &&
    riskPattern.count >= 2 &&
    (riskPattern.lossCount > riskPattern.profitableCount || riskPattern.winRate <= 40);

  if (riskPattern && riskIsMeaningful) {
    return {
      id: riskPattern.id,
      kind: "risk",
      label: "최근 장초 주의",
      title: riskPattern.title,
      detail: `${riskPattern.title} 조합은 최근 ${riskPattern.count}건 중 ${riskPattern.lossCount}건이 손실이었습니다.`
    };
  }

  if (options.positivePattern?.id === patternId) {
    return {
      id: options.positivePattern.id,
      kind: "positive",
      label: "최근 잘 맞음",
      title: options.positivePattern.title,
      detail:
        options.positivePattern.detail ??
        `${options.positivePattern.title} 조합은 최근 ${options.positivePattern.count}건 중 ${options.positivePattern.profitableCount}건이 수익 종료였습니다.`
    };
  }

  return null;
}
