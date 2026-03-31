import Link from "next/link";

import { ActionBucketBadge } from "@/components/recommendations/action-bucket-badge";
import { FavoriteTickerButton } from "@/components/shared/favorite-ticker-button";
import { SignalToneBadge } from "@/components/shared/signal-tone-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFeaturedRankLabel, getValidationBasisDisplayLabel, normalizeActionLanguage } from "@/lib/copy/action-language";
import {
  buildRecommendationTradePlan,
  createRecommendationTradePlanInput,
  getRecommendationActionMeta,
  resolveRecommendationActionBucket
} from "@/lib/recommendations/action-plan";
import { describeSignalScore, formatDateTimeShort, formatPercent, formatScore } from "@/lib/utils";
import type { Recommendation, ValidationBasis, ValidationInsight } from "@/types/recommendation";

function getValidationToneClasses(basis: ValidationBasis) {
  if (basis === "실측 기반") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (basis === "공용 추적 참고") {
    return "border-teal-200 bg-teal-50 text-teal-700";
  }

  if (basis === "유사 업종 참고") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  if (basis === "유사 흐름 참고") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-rose-200 bg-rose-50 text-rose-700";
}

function resolveValidationBasis(item: Recommendation): ValidationBasis {
  if (item.validationBasis) {
    return item.validationBasis;
  }

  if (item.validation.sampleSize >= 25 && !item.validationSummary.includes("참고") && !item.validationSummary.includes("보수")) {
    return "실측 기반";
  }

  return "보수 계산";
}

function resolveValidationInsight(item: Recommendation, validationBasis: ValidationBasis): ValidationInsight {
  if (item.validationInsight) {
    return item.validationInsight;
  }

  const level =
    validationBasis === "실측 기반"
      ? "높음"
      : validationBasis === "공용 추적 참고" || validationBasis === "유사 흐름 참고" || validationBasis === "유사 업종 참고"
        ? "보통"
        : "주의";
  const samplesToMeasured = validationBasis === "실측 기반" ? 0 : Math.max(0, 8 - item.validation.sampleSize);

  return {
    level,
    basis: validationBasis,
    headline: `${validationBasis} 기준으로 표본 ${item.validation.sampleSize}건을 참고합니다.`,
    detail:
      validationBasis === "실측 기반"
        ? `과거 이력 기준 확률은 ${item.validation.hitRate}% / 평균 수익은 ${formatPercent(item.validation.avgReturn)}입니다.`
        : samplesToMeasured > 0
          ? `실측 기반 확정 전까지는 참고 표본 ${samplesToMeasured}건 정도가 더 필요합니다.`
          : "표본 수는 확보됐지만 아직 참고 해석 비중이 더 큽니다.",
    samplesToMeasured
  };
}

function getValidationLevelClasses(level: ValidationInsight["level"]) {
  if (level === "높음") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (level === "보통") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-rose-200 bg-rose-50 text-rose-700";
}

function buildWhyNow(item: Recommendation, reasons?: string[]) {
  if (reasons?.length) {
    return reasons.slice(0, 3);
  }

  const next: string[] = [];

  if (item.tradePlan?.entryLabel) {
    next.push(`진입 구간은 ${item.tradePlan.entryLabel}입니다.`);
  }
  if (item.featuredRank) {
    next.push(`오늘 우선순위 ${item.featuredRank}위 안에 들어 있습니다.`);
  }
  if (item.validation.hitRate >= 55) {
    next.push(`유사 흐름 확률이 ${item.validation.hitRate}%로 비교적 안정적입니다.`);
  }
  if (item.validation.avgReturn > 0) {
    next.push(`과거 유사 구간 평균 수익은 ${formatPercent(item.validation.avgReturn)}입니다.`);
  }

  if (!next.length) {
    next.push(item.signalLabel);
  }

  return next.slice(0, 3);
}

function buildWatchouts(item: Recommendation, validationBasis: ValidationBasis) {
  const watchouts: string[] = [];

  if (item.signalTone === "주의") {
    watchouts.push("신호가 주의 단계라서 추격 진입보다 추가 확인이 먼저입니다.");
  }
  if (validationBasis === "보수 계산") {
    watchouts.push("실측 표본이 아직 충분하지 않아 보수 계산 비중이 큽니다.");
  }
  if (item.invalidationDistance > -5) {
    watchouts.push("손절 기준이 가까워서 진입 시 리스크 관리가 더 중요합니다.");
  }
  if (item.trackingDiagnostic?.blockers.length) {
    watchouts.push(...item.trackingDiagnostic.blockers.slice(0, 2).map((entry) => normalizeActionLanguage(entry)));
  }

  if (!watchouts.length) {
    watchouts.push("확인 가격과 거래 반응이 함께 나오는지 보고 접근하는 편이 좋습니다.");
  }

  return watchouts.slice(0, 3);
}

export function RecommendationCard({
  item,
  summaryLabel,
  summaryReasons,
  isFavorite,
  onToggleFavorite
}: {
  item: Recommendation;
  summaryLabel?: string;
  summaryReasons?: string[];
  isFavorite: boolean;
  onToggleFavorite: (ticker: string) => void;
}) {
  const actionBucket =
    item.actionBucket ??
    resolveRecommendationActionBucket({
      signalTone: item.signalTone,
      score: item.score,
      activationScore: item.activationScore,
      featuredRank: item.featuredRank,
      trackingDiagnostic: item.trackingDiagnostic
    });
  const actionMeta = getRecommendationActionMeta(actionBucket);
  const tradePlan =
    item.tradePlan ??
    buildRecommendationTradePlan({
      item: createRecommendationTradePlanInput({
        ...item,
        actionBucket
      })
    });
  const validationBasis = resolveValidationBasis(item);
  const validationInsight = resolveValidationInsight(item, validationBasis);
  const whyNow = buildWhyNow(item, summaryReasons);
  const watchouts = buildWatchouts(item, validationBasis);
  const signalScoreLabel = describeSignalScore(item.score);

  return (
    <Card className="h-full rounded-[28px]">
      <CardHeader className="gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <ActionBucketBadge bucket={actionBucket} />
              <SignalToneBadge tone={item.signalTone} />
                  {item.featuredRank ? (
                    <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
                      {getFeaturedRankLabel(item.featuredRank)}
                    </span>
                  ) : null}
            </div>
            <CardTitle className="mt-3 text-2xl text-foreground">
              {item.company} <span className="text-base font-medium text-muted-foreground">{item.ticker}</span>
            </CardTitle>
            <p className="mt-2 text-sm text-primary">{summaryLabel ?? tradePlan.nextStep}</p>
            <p className="mt-2 text-xs text-muted-foreground">{item.sector} · {actionMeta.description}</p>
          </div>
          <FavoriteTickerButton active={isFavorite} label={`${item.company} 즐겨찾기`} onClick={() => onToggleFavorite(item.ticker)} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <QuickMetric label="현재 신호" value={signalScoreLabel} detail={`${formatScore(item.score)}점`} />
          <QuickMetric label="진입 구간" value={tradePlan.entryLabel} />
          <QuickMetric label="손절 기준" value={tradePlan.stopLabel} />
          <QuickMetric label="1차 목표" value={tradePlan.targetLabel} />
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <section className="rounded-2xl border border-primary/20 bg-primary/8 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">다음 행동</p>
          <p className="mt-3 text-sm leading-7 text-foreground/84">{tradePlan.nextStep}</p>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-border/70 bg-background/35 p-4">
            <p className="text-sm font-semibold text-foreground">왜 지금 보는가</p>
            <div className="mt-3 space-y-2">
              {whyNow.map((reason) => (
                <p key={`${item.ticker}-${reason}`} className="text-sm leading-7 text-foreground/82">
                  {reason}
                </p>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-background/35 p-4">
            <p className="text-sm font-semibold text-foreground">조심할 점</p>
            <div className="mt-3 space-y-2">
              {watchouts.map((watchout) => (
                <p key={`${item.ticker}-${watchout}`} className="text-sm leading-7 text-foreground/82">
                  {watchout}
                </p>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="rounded-2xl border border-border/70 bg-background/35 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-foreground">검증 메모</p>
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${getValidationToneClasses(validationBasis)}`}>
                {getValidationBasisDisplayLabel(validationBasis)}
              </span>
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${getValidationLevelClasses(validationInsight.level)}`}>
                신뢰도 {validationInsight.level}
              </span>
            </div>
            <p className="mt-3 text-sm leading-7 text-foreground/80">{normalizeActionLanguage(validationInsight.headline)}</p>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">{normalizeActionLanguage(validationInsight.detail)}</p>
            <p className="mt-2 line-clamp-4 text-sm leading-7 text-muted-foreground">{normalizeActionLanguage(item.validationSummary)}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <CompactStat label="관찰 점수" value={typeof item.activationScore === "number" ? `${formatScore(item.activationScore)}점` : "계산 중"} />
            <CompactStat label="손절 거리" value={formatPercent(item.invalidationDistance)} />
            <CompactStat label="기대 손익비" value={tradePlan.riskRewardLabel || item.riskRewardRatio} />
            <CompactStat label="업데이트" value={formatDateTimeShort(item.updatedAt)} />
          </div>
        </section>

        <section className="rounded-2xl border border-border/70 bg-secondary/20 p-4">
          <p className="text-sm font-semibold text-foreground">운용 메모</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {item.validationBasis ? (
              <span className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs text-foreground/80">
                검증 기준 {getValidationBasisDisplayLabel(item.validationBasis)}
              </span>
            ) : null}
            {item.candidateScore ? (
              <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs text-primary">
                우선순위 점수 {item.candidateScore}
              </span>
            ) : null}
            <span className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs text-foreground/80">
              관찰 기간 {tradePlan.holdWindowLabel}
            </span>
          </div>
          <p className="mt-4 line-clamp-5 text-sm leading-7 text-foreground/80">{normalizeActionLanguage(item.rationale)}</p>
        </section>

        <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-secondary/45 px-4 py-3 text-sm text-muted-foreground">
          <span>{normalizeActionLanguage(item.signalLabel)}</span>
          <Link className="font-medium text-primary transition hover:text-primary/80" href={`/analysis/${item.ticker}`}>
            상세 분석 보기
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickMetric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-[20px] border border-border/70 bg-background/65 px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
      {detail ? <p className="mt-1 text-xs text-muted-foreground">{detail}</p> : null}
    </div>
  );
}

function CompactStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-border/70 bg-secondary/35 p-4">
      <p className="text-xs leading-5 text-muted-foreground">{label}</p>
      <p className="mt-2 break-all text-sm font-semibold leading-6 text-foreground">{value}</p>
    </div>
  );
}
