import type { ComponentType } from "react";
import Link from "next/link";
import { ArrowRight, ShieldAlert, Sparkles, Target } from "lucide-react";

import { FavoriteTickerButton } from "@/components/shared/favorite-ticker-button";
import { SignalToneBadge } from "@/components/shared/signal-tone-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTimeShort, formatPercent, formatScore } from "@/lib/utils";
import type { Recommendation, ValidationBasis } from "@/types/recommendation";

function getValidationToneClasses(basis: ValidationBasis) {
  if (basis === "실측 기반") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
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

export function RecommendationCard({
  item,
  isFavorite,
  onToggleFavorite
}: {
  item: Recommendation;
  isFavorite: boolean;
  onToggleFavorite: (ticker: string) => void;
}) {
  const validationBasis = resolveValidationBasis(item);

  return (
    <Card className="h-full">
      <CardHeader className="gap-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">{item.sector}</p>
              {item.featuredRank ? (
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
                  오늘의 후보 #{item.featuredRank}
                </span>
              ) : null}
            </div>
            <CardTitle className="mt-2 text-2xl text-foreground">
              {item.company} <span className="text-base font-medium text-muted-foreground">{item.ticker}</span>
            </CardTitle>
            <p className="mt-2 text-sm text-primary">{item.signalLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <FavoriteTickerButton active={isFavorite} label={`${item.company} 즐겨찾기`} onClick={() => onToggleFavorite(item.ticker)} />
            <SignalToneBadge tone={item.signalTone} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 rounded-[24px] border border-border/80 bg-background/40 p-4 xl:grid-cols-4">
          <Metric label="점수" value={formatScore(item.score)} icon={Sparkles} />
          <Metric label="검증 승률" value={`${item.validation.hitRate}%`} icon={Target} />
          <Metric label="평균 수익" value={formatPercent(item.validation.avgReturn)} icon={ArrowRight} />
          <Metric label="최대 하락" value={formatPercent(item.validation.maxDrawdown)} icon={ShieldAlert} />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="space-y-2">
          <p className="text-sm font-semibold text-muted-foreground">관찰 근거</p>
          <p className="text-sm leading-7 text-foreground/80">{item.rationale}</p>
        </section>
        <section className="space-y-2">
          <p className="text-sm font-semibold text-muted-foreground">기준 이탈</p>
          <p className="text-sm leading-7 text-foreground/72">{item.invalidation}</p>
        </section>
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <DetailStat label="이탈 여유" value={formatPercent(item.invalidationDistance)} />
          <DetailStat label="기대 손익" value={item.riskRewardRatio} />
          <DetailStat label="업데이트" value={formatDateTimeShort(item.updatedAt)} />
        </section>
        <section className="space-y-2">
          <p className="text-sm font-semibold text-muted-foreground">체크포인트</p>
          <div className="flex flex-wrap gap-2">
            {item.checkpoints.map((checkpoint) => (
              <span key={checkpoint} className="rounded-full border border-border/70 bg-secondary/45 px-3 py-1.5 text-xs text-foreground/80">
                {checkpoint}
              </span>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border border-border/70 bg-background/35 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-muted-foreground">검증 메모</p>
                <span
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${getValidationToneClasses(validationBasis)}`}
                >
                  {validationBasis}
                </span>
              </div>
              <p className="mt-2 text-sm leading-7 text-foreground/80">{item.validationSummary}</p>
            </div>
            {item.candidateScore ? (
              <div className="shrink-0 rounded-2xl border border-primary/30 bg-primary/10 px-3 py-2 text-right">
                <p className="text-[11px] text-primary/80">오늘 후보 점수</p>
                <p className="mt-1 text-sm font-semibold text-primary">{item.candidateScore}</p>
              </div>
            ) : null}
          </div>
          {item.eventCoverage ? <p className="mt-3 text-xs text-muted-foreground">이벤트 커버리지: {item.eventCoverage}</p> : null}
        </section>
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

function Metric({
  label,
  value,
  icon: Icon
}: {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex flex-col items-center justify-center space-y-2 rounded-[20px] bg-white/45 p-3 text-center">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="space-y-1">
        <p className="min-h-[2.5rem] text-xs leading-5 text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-border/70 bg-secondary/35 p-4">
      <p className="text-xs leading-5 text-muted-foreground">{label}</p>
      <p className="mt-2 break-all text-sm font-semibold leading-6 text-foreground">{value}</p>
    </div>
  );
}
