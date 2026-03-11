import Link from "next/link";

import { FavoriteTickerButton } from "@/components/shared/favorite-ticker-button";
import { SignalToneBadge } from "@/components/shared/signal-tone-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTimeShort, formatPercent, formatScore } from "@/lib/utils";
import type { Recommendation, ValidationBasis } from "@/types/recommendation";

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

function buildWhyNow(item: Recommendation) {
  const reasons = [];

  if (item.featuredRank) {
    reasons.push(`오늘 후보 순위 ${item.featuredRank}위 안에 들어 있습니다.`);
  }
  if (item.validation.hitRate >= 55) {
    reasons.push(`유사 사례 적중률이 ${item.validation.hitRate}%로 비교적 안정적입니다.`);
  }
  if (item.validation.avgReturn > 0) {
    reasons.push(`과거 유사 구간 평균 수익은 ${formatPercent(item.validation.avgReturn)}입니다.`);
  }
  if (item.invalidationDistance <= -8) {
    reasons.push(`무효화 여유가 ${formatPercent(item.invalidationDistance)}로 너무 타이트하지 않습니다.`);
  }
  if (item.eventCoverage && item.eventCoverage !== "취약") {
    reasons.push(`이벤트 근거는 ${item.eventCoverage} 수준입니다.`);
  }

  if (!reasons.length) {
    reasons.push(item.signalLabel);
  }

  return reasons.slice(0, 3);
}

function buildWatchouts(item: Recommendation, validationBasis: ValidationBasis) {
  const watchouts = [];

  if (item.signalTone === "주의") {
    watchouts.push("신호 톤이 주의라서 추격 진입보다 추가 확인 쪽이 낫습니다.");
  }
  if (validationBasis === "보수 계산") {
    watchouts.push("실측 표본이 아직 충분하지 않아 보수 계산 비중이 큽니다.");
  }
  if (item.validation.avgReturn <= 0) {
    watchouts.push("과거 유사 구간 평균 수익이 아직 뚜렷한 플러스 구간은 아닙니다.");
  }
  if (item.invalidationDistance > -5) {
    watchouts.push("무효화 기준이 가까워 손절 관리가 더 타이트해질 수 있습니다.");
  }
  if (item.eventCoverage === "취약" || !item.eventCoverage) {
    watchouts.push("뉴스나 이벤트 근거가 약해 차트와 거래 흐름 비중이 더 큽니다.");
  }

  if (!watchouts.length) {
    watchouts.push("조건은 무난하지만 눌림 확인과 거래량 유지 여부를 같이 보는 편이 좋습니다.");
  }

  return watchouts.slice(0, 2);
}

function buildHistoricalSummary(item: Recommendation, validationBasis: ValidationBasis) {
  return `${validationBasis} 기준 표본 ${item.validation.sampleSize}건, 적중률 ${item.validation.hitRate}%, 평균 수익 ${formatPercent(item.validation.avgReturn)}, 최대 하락 ${formatPercent(item.validation.maxDrawdown)}`;
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
  const validationBasis = resolveValidationBasis(item);
  const whyNow = buildWhyNow(item);
  const watchouts = buildWatchouts(item, validationBasis);
  const historicalSummary = buildHistoricalSummary(item, validationBasis);

  return (
    <Card className="h-full rounded-[28px]">
      <CardHeader className="gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs text-muted-foreground">{item.sector}</p>
              {item.featuredRank ? (
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
                  오늘 후보 #{item.featuredRank}
                </span>
              ) : null}
            </div>
            <CardTitle className="mt-2 text-2xl text-foreground">
              {item.company} <span className="text-base font-medium text-muted-foreground">{item.ticker}</span>
            </CardTitle>
            <p className="mt-2 text-sm text-primary">{item.signalLabel}</p>
            {summaryLabel ? <p className="mt-2 text-xs font-medium text-foreground/70">{summaryLabel}</p> : null}
          </div>
          <div className="flex items-center gap-2">
            <FavoriteTickerButton active={isFavorite} label={`${item.company} 즐겨찾기`} onClick={() => onToggleFavorite(item.ticker)} />
            <SignalToneBadge tone={item.signalTone} />
          </div>
        </div>

        {summaryReasons?.length ? (
          <div className="flex flex-wrap gap-2">
            {summaryReasons.map((reason) => (
              <span
                key={`${item.ticker}-${reason}`}
                className="rounded-full border border-border/70 bg-secondary/30 px-3 py-1 text-xs text-foreground/80"
              >
                {reason}
              </span>
            ))}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <QuickMetric label="기본 신호" value={formatScore(item.score)} />
          <QuickMetric label="적중률" value={`${item.validation.hitRate}%`} />
          <QuickMetric label="평균 수익" value={formatPercent(item.validation.avgReturn)} />
          <QuickMetric label="표본 수" value={`${item.validation.sampleSize}건`} />
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <section className="rounded-2xl border border-border/70 bg-background/35 p-4">
          <div className="border-b border-border/60 pb-3">
            <p className="text-sm font-semibold text-foreground">핵심 판단</p>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">왜 보는가</p>
              <ul className="space-y-2 text-sm leading-7 text-foreground/80">
                {whyNow.map((reason) => (
                  <li key={`${item.ticker}-${reason}`}>{reason}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">무엇을 조심할까</p>
              <ul className="space-y-2 text-sm leading-7 text-foreground/80">
                {watchouts.map((watchout) => (
                  <li key={`${item.ticker}-${watchout}`}>{watchout}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-sm leading-6 text-muted-foreground">
            무효화 기준: {item.invalidation}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)]">
          <div className="rounded-2xl border border-border/70 bg-background/35 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-foreground">과거 검증 요약</p>
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${getValidationToneClasses(validationBasis)}`}>
                {validationBasis}
              </span>
            </div>
            <p className="mt-3 text-sm leading-7 text-foreground/80">{historicalSummary}</p>
            <p className="mt-2 line-clamp-4 text-sm leading-7 text-muted-foreground">{item.validationSummary}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            <CompactStat label="무효화 여유" value={formatPercent(item.invalidationDistance)} />
            <CompactStat label="기대 손익" value={item.riskRewardRatio} />
            <CompactStat label="업데이트" value={formatDateTimeShort(item.updatedAt)} />
          </div>
        </section>

        {(item.checkpoints.length || item.eventCoverage || item.candidateScore) && (
          <section className="rounded-2xl border border-border/70 bg-secondary/20 p-4">
            <p className="text-sm font-semibold text-foreground">판단 메모</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.eventCoverage ? (
                <span className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs text-foreground/80">
                  이벤트 커버리지 {item.eventCoverage}
                </span>
              ) : null}
              {item.candidateScore ? (
                <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs text-primary">
                  오늘 랭킹 점수 {item.candidateScore}
                </span>
              ) : null}
              {item.checkpoints.map((checkpoint) => (
                <span key={checkpoint} className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs text-foreground/80">
                  {checkpoint}
                </span>
              ))}
            </div>
            <p className="mt-4 line-clamp-5 text-sm leading-7 text-foreground/80">{item.rationale}</p>
          </section>
        )}

        <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-secondary/45 px-4 py-3 text-sm text-muted-foreground">
          <span>관찰 기간 {item.observationWindow}</span>
          <Link className="font-medium text-primary transition hover:text-primary/80" href={`/analysis/${item.ticker}`}>
            상세 분석 보기
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-border/70 bg-background/65 px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
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
