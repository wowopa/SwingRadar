import type { RecommendationListItemDto, RecommendationsResponseDto } from "@/lib/api-contracts/swing-radar";
import { getDataProvider } from "@/lib/providers";
import { getDailyCandidates, type DailyCandidate } from "@/lib/repositories/daily-candidates";
import {
  buildRecommendationTradePlan,
  buildTodayOperatingSummary,
  createRecommendationTradePlanInput,
  resolveRecommendationActionBucket
} from "@/lib/recommendations/action-plan";
import type { RecommendationsQuery } from "@/lib/server/query-schemas";

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

export async function listRecommendations(query: RecommendationsQuery): Promise<RecommendationsResponseDto> {
  const [source, dailyCandidates] = await Promise.all([getDataProvider().getRecommendations(), getDailyCandidates()]);
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

  return {
    generatedAt: dailyCandidates?.generatedAt ?? source.generatedAt,
    items,
    dailyScan: dailyCandidates
      ? {
          generatedAt: dailyCandidates.generatedAt,
          batchSize: dailyCandidates.batchSize,
          concurrency: dailyCandidates.concurrency,
          topCandidatesLimit: dailyCandidates.topCandidatesLimit,
          totalTickers: dailyCandidates.totalTickers,
          totalBatches: dailyCandidates.totalBatches,
          succeededBatches: dailyCandidates.succeededBatches,
          failedBatches: dailyCandidates.failedBatches,
          topCandidates: dailyCandidates.topCandidates.map((candidate) => ({
            ...candidate,
            activationScore: sourceByTicker.get(candidate.ticker)?.activationScore ?? candidate.activationScore
          }))
        }
      : null,
    todaySummary: buildTodayOperatingSummary(items)
  };
}
