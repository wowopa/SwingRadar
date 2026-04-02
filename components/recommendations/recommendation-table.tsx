import Link from "next/link";

import { FavoriteTickerButton } from "@/components/shared/favorite-ticker-button";
import { PersonalActionStatusBadge } from "@/components/recommendations/personal-action-status-badge";
import { SignalToneBadge } from "@/components/shared/signal-tone-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type {
  OpeningCheckPositivePatternDto,
  OpeningCheckRiskPatternDto,
  TodayActionBoardItemDto
} from "@/lib/api-contracts/swing-radar";
import { getValidationBasisDisplayLabel } from "@/lib/copy/action-language";
import { buildOpeningCheckPatternPreview } from "@/lib/recommendations/opening-check-pattern-preview";
import { resolveRecommendationActionBucket } from "@/lib/recommendations/action-plan";
import { cn, formatPercent } from "@/lib/utils";
import type { Recommendation } from "@/types/recommendation";

function resolveValidationBasis(item: Recommendation) {
  if (item.validationBasis) {
    return item.validationBasis;
  }

  if (item.validation.sampleSize >= 25 && !item.validationSummary.includes("참고") && !item.validationSummary.includes("보수")) {
    return "실측 기반";
  }

  return "보수 계산";
}

export function RecommendationTable({
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
  const hasOpeningRiskPatterns = openingCheckRiskPatterns.length > 0;

  return (
    <Card className="border-border/80 bg-white/90 shadow-[0_18px_46px_-32px_rgba(24,32,42,0.2)]">
      <CardHeader>
        <CardTitle>종목 비교표</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full">
          <table className="min-w-[980px] w-full table-fixed text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
              <tr className="border-b border-border/80">
                <th className="w-[72px] whitespace-nowrap pb-3 pr-6">순위</th>
                <th className="w-[88px] whitespace-nowrap pb-3 pr-6">즐겨찾기</th>
                <th className="w-[150px] whitespace-nowrap pb-3 pr-6">종목</th>
                <th className="w-[88px] whitespace-nowrap pb-3 pr-6">톤</th>
                <th className="w-[72px] whitespace-nowrap pb-3 pr-6">점수</th>
                <th className="w-[96px] whitespace-nowrap pb-3 pr-6">관찰 점수</th>
                <th className="w-[180px] whitespace-nowrap pb-3 pr-6">신호 메모</th>
                <th className="w-[72px] whitespace-nowrap pb-3 pr-6">표본 수</th>
                <th className="w-[92px] whitespace-nowrap pb-3 pr-6">검증 근거</th>
                <th className="w-[72px] whitespace-nowrap pb-3 pr-6">적중률</th>
                <th className="w-[96px] whitespace-nowrap pb-3 pr-6">평균 수익</th>
                <th className="w-[104px] whitespace-nowrap pb-3 pr-6">무효화 거리</th>
                <th className="w-[92px] whitespace-nowrap pb-3 pr-6">상세</th>
              </tr>
            </thead>
            <tbody>
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
                return (
                  <tr
                    key={item.ticker}
                    className={cn(
                      "border-b border-border/60 text-foreground/82 transition hover:bg-[hsl(42_38%_97%)] last:border-0",
                      item.featuredRank && item.featuredRank <= 5 ? "bg-primary/[0.035]" : ""
                    )}
                  >
                    <td className="py-4 pr-6">
                      <span className="rounded-full border border-primary/24 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
                        #{displayRank}
                      </span>
                    </td>
                    <td className="py-4 pr-6">
                      <FavoriteTickerButton active={favorites.includes(item.ticker)} label={`${item.company} 즐겨찾기`} onClick={() => onToggleFavorite(item.ticker)} />
                    </td>
                    <td className="py-4 pr-6">
                      <div className="font-medium text-foreground">{item.company}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">{item.ticker}</span>
                        {isOpeningCheckCandidate ? (
                          <>
                            <Badge variant="secondary" className="h-5 px-2 text-[10px]">
                              장초 확인
                            </Badge>
                            <PersonalActionStatusBadge item={personalActionItem} className="h-5 px-2 text-[10px]" />
                            {patternPreview ? (
                              <Badge
                                variant={patternPreview.kind === "risk" ? "caution" : "positive"}
                                className="h-5 px-2 text-[10px]"
                                title={patternPreview.detail}
                              >
                                {patternPreview.label}
                              </Badge>
                            ) : hasOpeningRiskPatterns ? (
                              <Badge variant="neutral" className="h-5 px-2 text-[10px]">
                                장초 기준 확인
                              </Badge>
                            ) : null}
                          </>
                        ) : personalActionItem ? (
                          <PersonalActionStatusBadge item={personalActionItem} className="h-5 px-2 text-[10px]" />
                        ) : null}
                      </div>
                    </td>
                    <td className="py-4 pr-6"><SignalToneBadge tone={item.signalTone} /></td>
                    <td className="py-4 pr-6">{item.score}</td>
                    <td className="py-4 pr-6">{typeof item.activationScore === "number" ? item.activationScore : "-"}</td>
                    <td className="py-4 pr-6">
                      <div className="min-w-[140px] break-keep text-foreground">{item.signalLabel}</div>
                      <div className="text-xs text-muted-foreground">{item.observationWindow}</div>
                    </td>
                    <td className="py-4 pr-6">{item.validation.sampleSize}</td>
                    <td className="py-4 pr-6">{getValidationBasisDisplayLabel(resolveValidationBasis(item))}</td>
                    <td className="py-4 pr-6">{item.validation.hitRate}%</td>
                    <td className="py-4 pr-6">{formatPercent(item.validation.avgReturn)}</td>
                    <td className="py-4 pr-6">{formatPercent(item.invalidationDistance)}</td>
                    <td className="py-4">
                      <Link
                        className="inline-flex h-8 items-center rounded-full border border-primary/24 bg-primary/10 px-3 text-xs font-medium text-primary transition hover:bg-primary/14"
                        href={`/analysis/${item.ticker}`}
                      >
                        상세 보기
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
