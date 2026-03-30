import type { DailyCandidate } from "@/lib/repositories/daily-candidates";
import {
  getRecommendationActionMeta,
  resolveRecommendationActionBucket,
  type RecommendationActionBucket
} from "@/lib/recommendations/action-plan";
import type { TickerAnalysis } from "@/types/analysis";
import { formatPrice } from "@/lib/utils";

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

function getLatestClose(analysis: TickerAnalysis) {
  const latest = analysis.chartSeries.at(-1)?.close;
  return typeof latest === "number" && Number.isFinite(latest) ? latest : null;
}

function getDefaultHoldWindow(signalTone: TickerAnalysis["signalTone"]) {
  if (signalTone === "긍정") {
    return "5~15거래일";
  }
  if (signalTone === "중립") {
    return "3~10거래일";
  }
  return "1~7거래일";
}

function formatPriceLabel(value: number | null, fallback = "확인 필요") {
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

function formatRiskRewardLabel(entryReference: number | null, stopPrice: number | null, targetPrice: number | null) {
  if (entryReference === null || stopPrice === null || targetPrice === null) {
    return "계산 중";
  }

  const risk = entryReference - stopPrice;
  const reward = targetPrice - entryReference;

  if (risk <= 0 || reward <= 0) {
    return "매력 낮음";
  }

  return `1 : ${(reward / risk).toFixed(1)}`;
}

function buildSupportPoints(analysis: TickerAnalysis) {
  if (analysis.trackingDiagnostic?.supports.length) {
    return analysis.trackingDiagnostic.supports.slice(0, 3);
  }

  return analysis.analysisSummary.slice(0, 3).map((item) => `${item.label}: ${item.value}`);
}

function buildCautionPoints(analysis: TickerAnalysis) {
  if (analysis.trackingDiagnostic?.blockers.length) {
    return analysis.trackingDiagnostic.blockers.slice(0, 3);
  }

  const warnings = analysis.riskChecklist
    .filter((item) => item.status !== "양호")
    .map((item) => `${item.label}: ${item.note}`);

  if (warnings.length) {
    return warnings.slice(0, 3);
  }

  return analysis.decisionNotes.slice(0, 3);
}

function buildActionTexts(bucket: RecommendationActionBucket) {
  if (bucket === "buy_now") {
    return {
      title: "지금은 매수 계획까지 볼 수 있는 구간입니다.",
      summary: "다만 아무 가격에 들어가는 것이 아니라, 확인 가격과 손절 기준을 함께 지키는 계획형 접근이 필요합니다."
    };
  }

  if (bucket === "watch_only") {
    return {
      title: "아직은 관찰이 더 적절한 구간입니다.",
      summary: "흐름은 살아 있지만, 지금 바로 추격하기보다 확인 가격과 거래 반응을 더 본 뒤 움직이는 편이 낫습니다."
    };
  }

  return {
    title: "지금은 보류가 우선인 구간입니다.",
    summary: "놓친 가격을 따라가기보다 구조가 다시 정리되거나 과열이 식을 때까지 쉬는 편이 더 낫습니다."
  };
}

function buildNextStep(bucket: RecommendationActionBucket, confirmationPrice: number | null, stopPrice: number | null) {
  if (bucket === "buy_now") {
    if (confirmationPrice !== null) {
      return `${formatPrice(confirmationPrice)} 전후 반응을 보며 분할 접근을 검토합니다.`;
    }

    return "지금은 거래와 지지 유지가 함께 보일 때만 계획된 진입을 검토합니다.";
  }

  if (bucket === "watch_only") {
    if (confirmationPrice !== null) {
      return `${formatPrice(confirmationPrice)} 돌파 또는 재지지 확인 전까지는 관찰만 합니다.`;
    }

    return "확인 가격이 다시 잡히기 전까지는 대기합니다.";
  }

  if (stopPrice !== null) {
    return `${formatPrice(stopPrice)} 부근 훼손 여부와 구조 재정비를 먼저 확인합니다.`;
  }

  return "지금은 신규 진입보다 보류가 우선입니다.";
}

function buildEntryPlan(
  bucket: RecommendationActionBucket,
  currentPrice: number | null,
  confirmationPrice: number | null
) {
  if (bucket === "buy_now") {
    const low = currentPrice !== null && confirmationPrice !== null ? Math.min(currentPrice, confirmationPrice) : confirmationPrice ?? currentPrice;
    const high = currentPrice !== null && confirmationPrice !== null ? Math.max(currentPrice, confirmationPrice) : confirmationPrice ?? currentPrice;

    return {
      entryLabel: formatPriceRange(low, high, "확인 가격 전후"),
      guide:
        currentPrice !== null && confirmationPrice !== null && currentPrice > confirmationPrice
          ? "이미 확인 가격 위에 있다면 눌림 후 지지 유지가 다시 보일 때만 무리하지 않고 접근합니다."
          : "확인 가격 전후에서 거래량이 붙는지 보며 분할 진입을 검토합니다."
    };
  }

  if (bucket === "watch_only") {
    return {
      entryLabel: confirmationPrice === null ? "확인 가격 재정의 필요" : `${formatPrice(confirmationPrice)} 돌파/재지지 확인`,
      guide: "지금은 진입보다, 확인 가격을 넘기거나 다시 지지하는 장면이 나오는지 보는 것이 먼저입니다."
    };
  }

  return {
    entryLabel: "지금은 대기",
    guide: "현재는 진입 가격을 계산하기보다 보류 또는 관찰 유지가 더 중요합니다."
  };
}

function buildStopGuide(stopPrice: number | null, analysis: TickerAnalysis) {
  if (stopPrice !== null) {
    return `${formatPrice(stopPrice)} 아래로 구조가 무너지면 시나리오를 다시 봅니다.`;
  }

  return analysis.invalidation;
}

function buildTargetGuide(targetPrice: number | null, bucket: RecommendationActionBucket) {
  if (targetPrice !== null) {
    return `${formatPrice(targetPrice)} 부근에서는 일부 이익 실현 또는 반응 확인이 필요합니다.`;
  }

  return bucket === "avoid"
    ? "지금은 목표가보다 진입 회피가 더 중요합니다."
    : "목표 구간은 추가 확인이 필요합니다.";
}

function buildStretchTarget(targetPrice: number | null, confirmationPrice: number | null, stopPrice: number | null) {
  if (targetPrice === null || confirmationPrice === null || stopPrice === null) {
    return null;
  }

  const extension = Math.max(targetPrice - confirmationPrice, confirmationPrice - stopPrice);
  return Math.round(targetPrice + extension);
}

export interface AnalysisTradePlan {
  bucket: RecommendationActionBucket;
  bucketLabel: string;
  bucketDescription: string;
  title: string;
  summary: string;
  headline: string;
  currentPriceLabel: string;
  entryLabel: string;
  stopLabel: string;
  targetLabel: string;
  stretchTargetLabel: string;
  holdWindowLabel: string;
  riskRewardLabel: string;
  nextStep: string;
  entryGuide: string;
  stopGuide: string;
  targetGuide: string;
  supportPoints: string[];
  cautionPoints: string[];
}

export function buildAnalysisTradePlan({
  analysis,
  dailyCandidate,
  featuredRank
}: {
  analysis: TickerAnalysis;
  dailyCandidate?: DailyCandidate | null;
  featuredRank?: number;
}): AnalysisTradePlan {
  const bucket = resolveRecommendationActionBucket({
    signalTone: analysis.signalTone,
    activationScore: dailyCandidate?.activationScore ?? analysis.activationScore,
    featuredRank,
    trackingDiagnostic: analysis.trackingDiagnostic
  });
  const meta = getRecommendationActionMeta(bucket);
  const currentPrice = dailyCandidate?.currentPrice ?? getLatestClose(analysis);
  const confirmationPrice = dailyCandidate?.confirmationPrice ?? parsePriceText(analysis.keyLevels[1]?.price);
  const stopPrice = dailyCandidate?.invalidationPrice ?? parsePriceText(analysis.keyLevels[0]?.price) ?? parsePriceText(analysis.invalidation);
  const targetPrice = dailyCandidate?.expansionPrice ?? parsePriceText(analysis.keyLevels[2]?.price);
  const stretchTarget = buildStretchTarget(targetPrice, confirmationPrice, stopPrice);
  const actionTexts = buildActionTexts(bucket);
  const entryPlan = buildEntryPlan(bucket, currentPrice, confirmationPrice);
  const entryReference =
    bucket === "buy_now"
      ? confirmationPrice ?? currentPrice
      : currentPrice ?? confirmationPrice;

  return {
    bucket,
    bucketLabel: meta.label,
    bucketDescription: meta.description,
    title: actionTexts.title,
    summary: actionTexts.summary,
    headline: analysis.headline,
    currentPriceLabel: formatPriceLabel(currentPrice, "현재가 확인 필요"),
    entryLabel: entryPlan.entryLabel,
    stopLabel: formatPriceLabel(stopPrice, "손절 기준 확인 필요"),
    targetLabel: formatPriceLabel(targetPrice, "1차 목표 확인 필요"),
    stretchTargetLabel: formatPriceLabel(stretchTarget, "추가 확장 확인"),
    holdWindowLabel: dailyCandidate?.observationWindow ?? getDefaultHoldWindow(analysis.signalTone),
    riskRewardLabel: formatRiskRewardLabel(entryReference, stopPrice, targetPrice),
    nextStep: buildNextStep(bucket, confirmationPrice, stopPrice),
    entryGuide: entryPlan.guide,
    stopGuide: buildStopGuide(stopPrice, analysis),
    targetGuide: buildTargetGuide(targetPrice, bucket),
    supportPoints: buildSupportPoints(analysis),
    cautionPoints: buildCautionPoints(analysis)
  };
}
