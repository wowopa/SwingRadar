import { getValidationBasisDisplayLabel } from "@/lib/copy/action-language";
import type { OpeningCheckPatternPreviewResult } from "@/lib/recommendations/opening-check-pattern-preview";
import type {
  TrackingDiagnostic,
  ValidationBasis,
  ValidationInsight,
  ValidationStats
} from "@/types/recommendation";

type TrustLevel = "high" | "medium" | "low";

export interface RecommendationTrustSummary {
  level: TrustLevel;
  levelLabel: string;
  levelTone: "positive" | "neutral" | "caution";
  summary: string;
  basis: ValidationBasis;
  basisLabel: string;
  basisDetail: string;
  patternLabel: string;
  patternDetail: string;
  sampleSize: number;
  hitRate: number;
  avgReturn: number;
  stageLabel?: string;
}

export function resolveRecommendationValidationBasis(input: {
  validationBasis?: ValidationBasis;
  validationSummary?: string;
  validation: Pick<ValidationStats, "sampleSize">;
}) {
  if (input.validationBasis) {
    return input.validationBasis;
  }

  if (
    input.validation.sampleSize >= 25 &&
    !input.validationSummary?.includes("참고") &&
    !input.validationSummary?.includes("보수")
  ) {
    return "실측 기반";
  }

  return "보수 계산";
}

function getBasisDetail(
  basis: ValidationBasis,
  validation: ValidationStats,
  insight?: ValidationInsight
) {
  if (insight?.headline) {
    return insight.headline;
  }

  if (basis === "실측 기반") {
    return `직접 관측 ${validation.sampleSize}건으로 검증했습니다.`;
  }

  if (basis === "공용 추적 참고") {
    return `공용 추적 ${validation.sampleSize}건을 참고해 해석합니다.`;
  }

  if (basis === "유사 업종 참고") {
    return "직접 표본이 얇아 유사 업종 fallback을 함께 씁니다.";
  }

  if (basis === "유사 흐름 참고") {
    return "직접 표본이 얇아 유사 흐름 fallback을 함께 씁니다.";
  }

  return "직접 표본이 얇아 보수 계산 중심으로 해석합니다.";
}

function getPatternSummary(patternPreview?: OpeningCheckPatternPreviewResult | null) {
  if (patternPreview?.kind === "positive") {
    return {
      label: "최근 장초 패턴 강함",
      detail: patternPreview.detail
    };
  }

  if (patternPreview?.kind === "risk") {
    return {
      label: "최근 장초 패턴 약함",
      detail: patternPreview.detail
    };
  }

  return {
    label: "최근 장초 패턴 대기",
    detail: "이 종목과 바로 겹치는 장초 패턴 힌트는 아직 뚜렷하지 않습니다."
  };
}

function getTrustLevel({
  basis,
  validation,
  insight,
  patternPreview
}: {
  basis: ValidationBasis;
  validation: ValidationStats;
  insight?: ValidationInsight;
  patternPreview?: OpeningCheckPatternPreviewResult | null;
}) {
  const patternRisk = patternPreview?.kind === "risk";
  const patternPositive = patternPreview?.kind === "positive";
  const weakSamples = validation.sampleSize < 8;
  const measured = basis === "실측 기반";
  const sharedTracking = basis === "공용 추적 참고";
  const fallback =
    basis === "유사 업종 참고" || basis === "유사 흐름 참고" || basis === "보수 계산";

  if (patternRisk || fallback || insight?.level === "주의" || weakSamples) {
    return "low";
  }

  if (
    (measured && validation.sampleSize >= 25) || (sharedTracking && validation.sampleSize >= 20)
  ) {
    return patternPositive ? "high" : "medium";
  }

  if (patternPositive && (measured || sharedTracking)) {
    return "high";
  }

  return "medium";
}

function getLevelMeta(level: TrustLevel) {
  if (level === "high") {
    return {
      label: "신뢰 높음",
      tone: "positive" as const
    };
  }

  if (level === "low") {
    return {
      label: "신뢰 주의",
      tone: "caution" as const
    };
  }

  return {
    label: "신뢰 보통",
    tone: "neutral" as const
  };
}

function getSummaryCopy({
  level,
  basis,
  patternPreview
}: {
  level: TrustLevel;
  basis: ValidationBasis;
  patternPreview?: OpeningCheckPatternPreviewResult | null;
}) {
  const basisLabel = getValidationBasisDisplayLabel(basis);

  if (level === "high") {
    return patternPreview?.kind === "positive"
      ? `${basisLabel}이고 최근 장초 조합도 강해 오늘 해석 근거가 비교적 직접적입니다.`
      : `${basisLabel}이라 오늘 해석 근거가 비교적 직접적입니다.`;
  }

  if (level === "low") {
    return patternPreview?.kind === "risk"
      ? `${basisLabel}에 더해 최근 장초 패턴도 약해 한 단계 보수적으로 보는 편이 좋습니다.`
      : `${basisLabel} 성격이 강해 오늘은 fallback 전제를 두고 읽는 편이 안전합니다.`;
  }

  return `${basisLabel}는 확보됐지만 장초 반응과 개인 기준을 함께 봐야 신뢰도가 올라갑니다.`;
}

export function buildRecommendationTrustSummary(input: {
  validation: ValidationStats;
  validationBasis?: ValidationBasis;
  validationSummary?: string;
  validationInsight?: ValidationInsight;
  trackingDiagnostic?: TrackingDiagnostic;
  patternPreview?: OpeningCheckPatternPreviewResult | null;
}) {
  const basis = resolveRecommendationValidationBasis({
    validation: input.validation,
    validationBasis: input.validationBasis,
    validationSummary: input.validationSummary
  });
  const level = getTrustLevel({
    basis,
    validation: input.validation,
    insight: input.validationInsight,
    patternPreview: input.patternPreview
  });
  const levelMeta = getLevelMeta(level);
  const patternSummary = getPatternSummary(input.patternPreview);

  return {
    level,
    levelLabel: levelMeta.label,
    levelTone: levelMeta.tone,
    summary: getSummaryCopy({
      level,
      basis,
      patternPreview: input.patternPreview
    }),
    basis,
    basisLabel: getValidationBasisDisplayLabel(basis),
    basisDetail: getBasisDetail(basis, input.validation, input.validationInsight),
    patternLabel: patternSummary.label,
    patternDetail: patternSummary.detail,
    sampleSize: input.validation.sampleSize,
    hitRate: input.validation.hitRate,
    avgReturn: input.validation.avgReturn,
    stageLabel: input.trackingDiagnostic?.stage
  } satisfies RecommendationTrustSummary;
}
