import type {
  DailyCandidateDto,
  RecommendationListItemDto,
  RecommendationsResponseDto
} from "@/lib/api-contracts/swing-radar";
import { getDataProvider } from "@/lib/providers";
import { getDailyCandidates, type DailyCandidate } from "@/lib/repositories/daily-candidates";
import {
  buildTodayActionBoard,
  buildRecommendationTradePlan,
  buildTodayOperatingWorkflow,
  buildTodayOperatingSummary,
  createRecommendationTradePlanInput,
  resolveRecommendationActionBucket
} from "@/lib/recommendations/action-plan";
import { listOpeningRecheckDecisions } from "@/lib/server/opening-recheck-board";
import type { RecommendationsQuery } from "@/lib/server/query-schemas";
import { getSymbolByTicker } from "@/lib/symbols/master";
import { formatPrice } from "@/lib/utils";

function toNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatRiskRewardRatio(entryPrice?: number | null, targetPrice?: number | null, invalidationPrice?: number | null) {
  const entry = Number(entryPrice ?? 0);
  const target = Number(targetPrice ?? 0);
  const invalidation = Number(invalidationPrice ?? 0);

  if (!Number.isFinite(entry) || !Number.isFinite(target) || !Number.isFinite(invalidation)) {
    return null;
  }

  const riskDistance = entry - invalidation;
  const rewardDistance = target - entry;
  if (riskDistance <= 0 || rewardDistance <= 0) {
    return null;
  }

  return `1 : ${Math.max(0.1, rewardDistance / riskDistance).toFixed(2)}`;
}

function formatCandidateCheckpoint(value: number | null | undefined, fallback: string) {
  return typeof value === "number" && Number.isFinite(value) ? formatPrice(value) : fallback;
}

function resolveHoldingSector(
  ticker: string,
  sources: {
    recommendationSector?: string | null;
    candidateSector?: string | null;
  }
) {
  const recommendationSector = sources.recommendationSector?.trim();
  if (recommendationSector) {
    return recommendationSector;
  }

  const candidateSector = sources.candidateSector?.trim();
  if (candidateSector) {
    return candidateSector;
  }

  const symbolSector = getSymbolByTicker(ticker)?.sector?.trim();
  if (symbolSector && !["주권", "기타"].includes(symbolSector)) {
    return symbolSector;
  }

  return "미분류";
}

function enrichRecommendationItem(item: RecommendationListItemDto, dailyCandidate?: DailyCandidate | null): RecommendationListItemDto {
  const activationScore = dailyCandidate?.activationScore ?? item.activationScore;
  const actionBucket = resolveRecommendationActionBucket({
    signalTone: item.signalTone,
    score: item.score,
    activationScore,
    featuredRank: item.featuredRank,
    trackingDiagnostic: item.trackingDiagnostic,
    actionBucket: item.actionBucket
  });

  return {
    ...item,
    activationScore,
    actionBucket,
    tradePlan:
      item.tradePlan ??
      buildRecommendationTradePlan({
        item: createRecommendationTradePlanInput({
          ...item,
          activationScore,
          actionBucket
        }),
        candidate: dailyCandidate
      })
  };
}

function enrichDailyCandidateItem(
  candidate: DailyCandidate,
  sourceItem?: RecommendationListItemDto,
  openingRecheck?: DailyCandidateDto["openingRecheck"]
): DailyCandidateDto {
  const activationScore = sourceItem?.activationScore ?? candidate.activationScore;
  const riskRewardRatio =
    formatRiskRewardRatio(
      toNullableNumber(candidate.confirmationPrice),
      toNullableNumber(candidate.expansionPrice),
      toNullableNumber(candidate.invalidationPrice)
    ) ?? sourceItem?.riskRewardRatio;
  const actionBucket = resolveRecommendationActionBucket({
    signalTone: candidate.signalTone,
    score: candidate.score,
    activationScore,
    trackingDiagnostic: sourceItem?.trackingDiagnostic
  });

  return {
    ...candidate,
    activationScore,
    actionBucket,
    openingRecheck,
    tradePlan: buildRecommendationTradePlan({
      item: {
        signalTone: candidate.signalTone,
        score: candidate.score,
        activationScore,
        trackingDiagnostic: sourceItem?.trackingDiagnostic,
        actionBucket,
        invalidation: candidate.invalidation,
        checkpoints: [
          candidate.invalidation,
          formatCandidateCheckpoint(candidate.confirmationPrice, "확인 가격 재설정 필요"),
          formatCandidateCheckpoint(candidate.expansionPrice, "목표 가격 재설정 필요")
        ],
        observationWindow: candidate.observationWindow,
        riskRewardRatio
      },
      candidate
    })
  };
}

export async function listRecommendations(query: RecommendationsQuery): Promise<RecommendationsResponseDto> {
  const provider = getDataProvider();
  const [source, dailyCandidates, tracking] = await Promise.all([
    provider.getRecommendations(),
    getDailyCandidates(),
    provider.getTracking()
  ]);
  const openingRecheckByTicker = dailyCandidates
    ? await listOpeningRecheckDecisions(dailyCandidates.generatedAt)
    : {};
  const sourceByTicker = new Map(source.items.map((item) => [item.ticker, item]));
  const dailyCandidateByTicker = new Map((dailyCandidates?.topCandidates ?? []).map((candidate) => [candidate.ticker, candidate]));

  const featuredCandidateMap = new Map(
    (dailyCandidates?.topCandidates ?? []).map((candidate, index) => [
      candidate.ticker,
      {
        candidate,
        rank: index + 1,
        candidateScore: candidate.candidateScore,
        activationScore: sourceByTicker.get(candidate.ticker)?.activationScore ?? candidate.activationScore,
        eventCoverage: candidate.eventCoverage,
        batch: candidate.batch,
        riskRewardRatio: formatRiskRewardRatio(
          toNullableNumber(candidate.confirmationPrice),
          toNullableNumber(candidate.expansionPrice),
          toNullableNumber(candidate.invalidationPrice)
        )
      }
    ])
  );

  let items = dailyCandidates
    ? dailyCandidates.topCandidates.flatMap((candidate, index) => {
        const item = sourceByTicker.get(candidate.ticker);
        if (!item) {
          return [];
        }

        return [
          enrichRecommendationItem(
            {
              ...item,
              score: candidate.score ?? item.score,
              riskRewardRatio:
                formatRiskRewardRatio(
                  toNullableNumber(candidate.confirmationPrice),
                  toNullableNumber(candidate.expansionPrice),
                  toNullableNumber(candidate.invalidationPrice)
                ) ?? item.riskRewardRatio,
              featuredRank: index + 1,
              candidateScore: candidate.candidateScore,
              activationScore: sourceByTicker.get(candidate.ticker)?.activationScore ?? candidate.activationScore,
              eventCoverage: candidate.eventCoverage,
              candidateBatch: candidate.batch
            },
            candidate
          )
        ];
      })
    : source.items.map((item) => {
        const featuredCandidate = featuredCandidateMap.get(item.ticker);
        const mergedItem = featuredCandidate
          ? {
              ...item,
              riskRewardRatio: featuredCandidate.riskRewardRatio ?? item.riskRewardRatio,
              featuredRank: featuredCandidate.rank,
              candidateScore: featuredCandidate.candidateScore,
              activationScore: featuredCandidate.activationScore,
              eventCoverage: featuredCandidate.eventCoverage,
              candidateBatch: featuredCandidate.batch
            }
          : item;

        return enrichRecommendationItem(mergedItem, featuredCandidate?.candidate ?? dailyCandidateByTicker.get(item.ticker));
      });

  if (query.signalTone) {
    items = items.filter((item) => item.signalTone === query.signalTone);
  }

  if (query.sort === "score_desc") {
    items.sort((left, right) => {
      const leftRank = left.featuredRank ?? Number.MAX_SAFE_INTEGER;
      const rightRank = right.featuredRank ?? Number.MAX_SAFE_INTEGER;
      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      return right.score - left.score;
    });
  } else if (query.sort === "updatedAt_desc") {
    items.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  } else if (query.sort === "hitRate_desc") {
    items.sort((left, right) => right.validation.hitRate - left.validation.hitRate);
  }

  if (query.limit) {
    items = items.slice(0, query.limit);
  }

  const todaySummary = buildTodayOperatingSummary(items);
  const dailyScanCandidates = dailyCandidates
    ? dailyCandidates.topCandidates.map((candidate) =>
        enrichDailyCandidateItem(
          candidate,
          sourceByTicker.get(candidate.ticker),
          openingRecheckByTicker[candidate.ticker]
        )
      )
    : null;
  const todayActionBoard = dailyScanCandidates
    ? buildTodayActionBoard(
        dailyScanCandidates.map((candidate, index) => ({
          ticker: candidate.ticker,
          company: candidate.company,
          sector: candidate.sector,
          signalTone: candidate.signalTone,
          featuredRank: index + 1,
          candidateScore: candidate.candidateScore,
          activationScore: candidate.activationScore,
          actionBucket: candidate.actionBucket,
          tradePlan: candidate.tradePlan,
          openingRecheck: candidate.openingRecheck
        })),
        todaySummary,
        {
          activeHoldings: tracking.history
            .filter((item) => item.result === "진행중")
            .map((item) => ({
              ticker: item.ticker,
              company: item.company,
              sector: resolveHoldingSector(item.ticker, {
                recommendationSector: sourceByTicker.get(item.ticker)?.sector,
                candidateSector: dailyCandidateByTicker.get(item.ticker)?.sector
              })
            }))
        }
      )
    : undefined;

  return {
    generatedAt: dailyCandidates?.generatedAt ?? source.generatedAt,
    items,
    dailyScan: dailyCandidates && dailyScanCandidates
      ? {
          generatedAt: dailyCandidates.generatedAt,
          batchSize: dailyCandidates.batchSize,
          concurrency: dailyCandidates.concurrency,
          topCandidatesLimit: dailyCandidates.topCandidatesLimit,
          totalTickers: dailyCandidates.totalTickers,
          totalBatches: dailyCandidates.totalBatches,
          succeededBatches: dailyCandidates.succeededBatches,
          failedBatches: dailyCandidates.failedBatches,
          topCandidates: dailyScanCandidates
        }
      : null,
    todaySummary,
    operatingWorkflow: buildTodayOperatingWorkflow(todaySummary),
    todayActionBoard
  };
}
