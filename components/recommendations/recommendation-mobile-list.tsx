"use client";

import Link from "next/link";

import { FavoriteTickerButton } from "@/components/shared/favorite-ticker-button";
import { PersonalActionStatusBadge } from "@/components/recommendations/personal-action-status-badge";
import { RecommendationTrustSummary } from "@/components/recommendations/recommendation-trust-summary";
import { SignalToneBadge } from "@/components/shared/signal-tone-badge";
import { Badge } from "@/components/ui/badge";
import type {
  OpeningCheckPositivePatternDto,
  OpeningCheckRiskPatternDto,
  TodayActionBoardItemDto
} from "@/lib/api-contracts/swing-radar";
import { resolveRecommendationActionBucket } from "@/lib/recommendations/action-plan";
import { buildOpeningCheckPatternPreview } from "@/lib/recommendations/opening-check-pattern-preview";
import { buildRecommendationTrustSummary } from "@/lib/recommendations/recommendation-trust";
import type { Recommendation } from "@/types/recommendation";

export function RecommendationMobileList({
  items,
  favorites,
  onToggleFavorite,
  openingCheckRiskPatterns = [],
  openingCheckPositivePattern,
  openingCheckCandidateTickers = [],
  personalActionByTicker = {}
}: {
  items: Recommendation[];
  favorites: string[];
  onToggleFavorite: (ticker: string) => void;
  openingCheckRiskPatterns?: OpeningCheckRiskPatternDto[];
  openingCheckPositivePattern?: OpeningCheckPositivePatternDto;
  openingCheckCandidateTickers?: string[];
  personalActionByTicker?: Record<string, TodayActionBoardItemDto>;
}) {
  const openingCheckCandidateSet = new Set(openingCheckCandidateTickers.map((ticker) => ticker.toUpperCase()));

  return (
    <div className="space-y-3 lg:hidden">
      {items.map((item, index) => {
        const displayRank = item.featuredRank ?? index + 1;
        const isOpeningCheckCandidate = openingCheckCandidateSet.has(item.ticker.toUpperCase());
        const personalActionItem = personalActionByTicker[item.ticker];
        const patternPreview = isOpeningCheckCandidate
          ? buildOpeningCheckPatternPreview(
              {
                actionBucket:
                  item.actionBucket ??
                  resolveRecommendationActionBucket({
                    signalTone: item.signalTone,
                    score: item.score,
                    activationScore: item.activationScore,
                    featuredRank: item.featuredRank,
                    trackingDiagnostic: item.trackingDiagnostic
                  }),
                tradePlan: item.tradePlan
              },
              {
                riskPatterns: openingCheckRiskPatterns,
                positivePattern: openingCheckPositivePattern
              }
            )
          : null;
        const trustSummary = buildRecommendationTrustSummary({
          validation: item.validation,
          validationBasis: item.validationBasis,
          validationSummary: item.validationSummary,
          validationInsight: item.validationInsight,
          trackingDiagnostic: item.trackingDiagnostic,
          patternPreview
        });

        return (
          <article
            key={item.ticker}
            className="rounded-[24px] border border-border/80 bg-white/92 p-4 shadow-[0_18px_46px_-34px_rgba(24,32,42,0.2)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-primary/24 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                    #{displayRank}
                  </span>
                  <SignalToneBadge tone={item.signalTone} />
                  {isOpeningCheckCandidate ? <Badge variant="secondary">장초 확인</Badge> : null}
                  {personalActionItem ? <PersonalActionStatusBadge item={personalActionItem} /> : null}
                </div>
                <p className="mt-3 text-base font-semibold text-foreground">
                  {item.company}
                  <span className="ml-2 text-xs font-medium text-muted-foreground">{item.ticker}</span>
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {item.sector} · 점수 {item.score}
                  {typeof item.activationScore === "number" ? ` · 관찰 ${item.activationScore}` : ""}
                </p>
              </div>
              <FavoriteTickerButton
                active={favorites.includes(item.ticker)}
                label={`${item.company} 즐겨찾기`}
                onClick={() => onToggleFavorite(item.ticker)}
              />
            </div>

            {patternPreview ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant={patternPreview.kind === "risk" ? "caution" : "positive"}>
                  {patternPreview.label}
                </Badge>
                <p className="text-xs leading-5 text-muted-foreground">{patternPreview.title}</p>
              </div>
            ) : null}

            <div className="mt-4">
              <RecommendationTrustSummary summary={trustSummary} mode="compact" />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <MiniPlanCard label="진입" value={item.tradePlan?.entryLabel ?? "분석 확인"} />
              <MiniPlanCard label="손절" value={item.tradePlan?.stopLabel ?? item.invalidation} />
              <MiniPlanCard label="목표" value={item.tradePlan?.targetLabel ?? "분석 확인"} />
            </div>

            <div className="mt-4 rounded-[20px] border border-border/80 bg-[hsl(42_38%_97%)] px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">지금 읽어야 할 메모</p>
              <p className="mt-2 text-sm leading-6 text-foreground/82">{item.signalLabel}</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {personalActionItem?.boardReason ?? item.observationWindow}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={`/analysis/${item.ticker}`}
                className="inline-flex h-9 items-center rounded-full border border-primary/24 bg-primary/10 px-3.5 text-xs font-medium text-primary transition hover:bg-primary/14"
              >
                상세 분석
              </Link>
              <Link
                href={`/opening-check?ticker=${item.ticker}`}
                className="inline-flex h-9 items-center rounded-full border border-border/80 bg-white px-3.5 text-xs font-medium text-foreground/78 transition hover:border-primary/24 hover:text-primary"
              >
                장초 흐름 보기
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function MiniPlanCard({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[18px] border border-border/80 bg-[hsl(42_40%_97%)] px-3 py-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
