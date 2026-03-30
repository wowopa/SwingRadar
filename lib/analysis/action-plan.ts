import type { DailyCandidate } from "@/lib/repositories/daily-candidates";
import {
  getRecommendationActionMeta,
  resolveRecommendationActionBucket,
  type RecommendationActionBucket
} from "@/lib/recommendations/action-plan";
import { formatPrice } from "@/lib/utils";
import type { AnalysisTradePlan, TickerAnalysis } from "@/types/analysis";

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
      title: "지금은 매수 계획까지 볼 수 있는 구간입니다",
      summary: "아무 가격에 추격 매수하는 뜻은 아닙니다. 확인 가격과 손절 기준을 지키는 계획형 진입이 필요합니다."
    };
  }

  if (bucket === "watch_only") {
    return {
      title: "아직은 관찰이 더 어울리는 구간입니다",
      summary: "흐름은 살아 있지만 지금 바로 추격하기보다 확인 가격과 거래 반응이 붙는지 보는 편이 낫습니다."
    };
  }

  return {
    title: "지금은 보류가 우선인 구간입니다",
    summary: "급한 진입보다 구조가 다시 정리되거나 과열이 식는지 확인하는 쪽이 더 안전합니다."
  };
}

function buildNextStep(bucket: RecommendationActionBucket, confirmationPrice: number | null, stopPrice: number | null) {
  if (bucket === "buy_now") {
    if (confirmationPrice !== null) {
      return `${formatPrice(confirmationPrice)} 전후의 지지 또는 돌파 반응을 보고 분할 진입을 검토합니다.`;
    }

    return "확인 가격과 거래량이 함께 붙는지 본 뒤에만 진입을 검토합니다.";
  }

  if (bucket === "watch_only") {
    if (confirmationPrice !== null) {
      return `${formatPrice(confirmationPrice)} 반응이 확인될 때까지는 관찰만 유지합니다.`;
    }

    return "확인 가격이 다시 살아나는지 먼저 기다립니다.";
  }

  if (stopPrice !== null) {
    return `${formatPrice(stopPrice)} 아래 구조가 다시 정리되기 전까지는 신규 진입을 미룹니다.`;
  }

  return "지금은 새로운 진입보다 보류가 더 나은 구간입니다.";
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
      entryLabel: formatPriceRange(low, high, "확인 가격 전후"),
      entryGuide:
        currentPrice !== null && confirmationPrice !== null && currentPrice > confirmationPrice
          ? "이미 확인 가격 위에 있다면 눌림과 지지 여부를 다시 본 뒤에만 무리하지 않고 접근합니다."
          : "확인 가격 전후에서 거래량이 붙는지 보고 분할 진입을 검토합니다.",
      entryReference: confirmationPrice ?? currentPrice
    };
  }

  if (bucket === "watch_only") {
    return {
      entryLabel: confirmationPrice === null ? "확인 가격 재설정 필요" : `${formatPrice(confirmationPrice)} 돌파/지지 확인`,
      entryGuide: "지금은 바로 사기보다 확인 가격을 넘기거나 다시 지지하는 모습이 나오는지 보는 구간입니다.",
      entryReference: confirmationPrice ?? currentPrice
    };
  }

  return {
    entryLabel: "지금은 대기",
    entryGuide: "현재는 진입 가격을 계산하기보다 관찰 또는 보류가 더 중요합니다.",
    entryReference: currentPrice ?? confirmationPrice
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

  return bucket === "avoid" ? "지금은 목표가보다 진입 회피가 더 중요합니다." : "목표 구간은 추가 확인이 필요합니다.";
}

function buildStretchTarget(targetPrice: number | null, confirmationPrice: number | null, stopPrice: number | null) {
  if (targetPrice === null || confirmationPrice === null || stopPrice === null) {
    return null;
  }

  const extension = Math.max(targetPrice - confirmationPrice, confirmationPrice - stopPrice);
  return Math.round(targetPrice + extension);
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
  if (analysis.tradePlan) {
    return analysis.tradePlan;
  }

  const bucket = resolveRecommendationActionBucket({
    signalTone: analysis.signalTone,
    score: analysis.score,
    activationScore: dailyCandidate?.activationScore ?? analysis.activationScore,
    featuredRank,
    trackingDiagnostic: analysis.trackingDiagnostic,
    actionBucket: analysis.actionBucket
  });
  const meta = getRecommendationActionMeta(bucket);
  const currentPrice = dailyCandidate?.currentPrice ?? getLatestClose(analysis);
  const confirmationPrice = dailyCandidate?.confirmationPrice ?? parsePriceText(analysis.keyLevels[1]?.price);
  const stopPrice =
    dailyCandidate?.invalidationPrice ??
    parsePriceText(analysis.keyLevels[0]?.price) ??
    parsePriceText(analysis.invalidation);
  const targetPrice = dailyCandidate?.expansionPrice ?? parsePriceText(analysis.keyLevels[2]?.price);
  const stretchTargetPrice = buildStretchTarget(targetPrice, confirmationPrice, stopPrice);
  const actionTexts = buildActionTexts(bucket);
  const entryPlan = buildEntryPlan(bucket, currentPrice, confirmationPrice);

  return {
    bucket,
    bucketLabel: meta.label,
    bucketDescription: meta.description,
    title: actionTexts.title,
    summary: actionTexts.summary,
    headline: analysis.headline,
    currentPrice,
    currentPriceLabel: formatPriceLabel(currentPrice, "현재가 확인 필요"),
    entryPriceLow: undefined,
    entryPriceHigh: undefined,
    confirmationPrice: confirmationPrice ?? undefined,
    entryLabel: entryPlan.entryLabel,
    stopPrice: stopPrice ?? undefined,
    stopLabel: formatPriceLabel(stopPrice, "손절 기준 확인 필요"),
    targetPrice: targetPrice ?? undefined,
    targetLabel: formatPriceLabel(targetPrice, "1차 목표 확인 필요"),
    stretchTargetPrice: stretchTargetPrice ?? undefined,
    stretchTargetLabel: formatPriceLabel(stretchTargetPrice, "추가 확장 확인"),
    holdWindowLabel: dailyCandidate?.observationWindow ?? getDefaultHoldWindow(analysis.signalTone),
    riskRewardLabel: formatRiskRewardLabel(entryPlan.entryReference ?? null, stopPrice, targetPrice),
    nextStep: buildNextStep(bucket, confirmationPrice, stopPrice),
    entryGuide: entryPlan.entryGuide,
    stopGuide: buildStopGuide(stopPrice, analysis),
    targetGuide: buildTargetGuide(targetPrice, bucket),
    supportPoints: buildSupportPoints(analysis),
    cautionPoints: buildCautionPoints(analysis)
  };
}
