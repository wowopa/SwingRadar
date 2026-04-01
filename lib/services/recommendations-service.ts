import type {
  DailyCandidateDto,
  OpeningCheckLearningInsightDto,
  OpeningRecheckDecisionDto,
  RecommendationListItemDto,
  RecommendationsResponseDto,
  TickerAnalysisDto
} from "@/lib/api-contracts/swing-radar";
import { buildAnalysisTradePlan } from "@/lib/analysis/action-plan";
import {
  buildPortfolioOpeningCheckAnalytics,
  groupPortfolioJournalByTicker
} from "@/lib/portfolio/journal-insights";
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
import { buildHoldingActionBoard } from "@/lib/recommendations/holding-management";
import { buildOpeningRecheckReview } from "@/lib/recommendations/opening-recheck-review";
import { listOpeningRecheckDecisions, listOpeningRecheckScans } from "@/lib/server/opening-recheck-board";
import { loadPortfolioJournalForUser } from "@/lib/server/portfolio-journal";
import {
  isPortfolioProfileConfigured,
  loadPortfolioProfileDocument,
  loadPortfolioProfileForUser
} from "@/lib/server/portfolio-profile";
import { getSymbolByTicker } from "@/lib/server/runtime-symbol-master";
import { listUserOpeningRecheckDecisions, listUserOpeningRecheckScans } from "@/lib/server/user-opening-recheck-board";
import type { RecommendationsQuery } from "@/lib/server/query-schemas";
import { formatPrice } from "@/lib/utils";

const DEFAULT_OPENING_CHECK_LIMIT = 5;

function toNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function getOpeningCheckLimit() {
  return parsePositiveInt(process.env.SWING_RADAR_OPENING_CHECK_LIMIT, DEFAULT_OPENING_CHECK_LIMIT);
}

function buildOpeningCheckLearningInsight(
  analytics: ReturnType<typeof buildPortfolioOpeningCheckAnalytics>
): OpeningCheckLearningInsightDto | undefined {
  if (!analytics) {
    return undefined;
  }

  const bestStatus = [...analytics.statusInsights].sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }

    return right.winRate - left.winRate;
  })[0];
  const bestPattern = analytics.patterns[0];

  if (!bestStatus && !bestPattern) {
    return undefined;
  }

  const headline = bestStatus
    ? `${bestStatus.label} ${bestStatus.count}건, 승률 ${bestStatus.winRate}%`
    : analytics.headline;
  const primaryLesson = bestPattern
    ? `${bestPattern.title} 조합 ${bestPattern.count}건 · 승률 ${bestPattern.winRate}%`
    : analytics.summary;

  let secondaryLesson: string | undefined;
  if (analytics.overrideCount > 0) {
    secondaryLesson = `보류/제외인데 진입한 거래 ${analytics.overrideCount}건`;
  } else if (analytics.lossCount > 0) {
    secondaryLesson = `손실 종료 ${analytics.lossCount}건도 함께 복기해 보세요.`;
  } else if (analytics.unmatchedCount > 0) {
    secondaryLesson = `장초 기록이 없는 종료 거래 ${analytics.unmatchedCount}건`;
  }

  return {
    headline,
    primaryLesson,
    secondaryLesson
  };
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
  openingRecheck?: DailyCandidateDto["openingRecheck"],
  sharedOpeningRecheck?: DailyCandidateDto["sharedOpeningRecheck"]
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
    sharedOpeningRecheck,
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

function enrichAnalysisItem(
  analysisItem: TickerAnalysisDto,
  dailyCandidate?: DailyCandidate | null,
  featuredRank?: number
) {
  const score = dailyCandidate?.score ?? analysisItem.score;
  const activationScore = dailyCandidate?.activationScore ?? analysisItem.activationScore;

  return {
    ...analysisItem,
    score,
    activationScore,
    tradePlan:
      analysisItem.tradePlan ??
      buildAnalysisTradePlan({
        analysis: {
          ...analysisItem,
          score,
          activationScore
        },
        dailyCandidate,
        featuredRank
      })
  };
}

export async function listRecommendations(
  query: RecommendationsQuery,
  options?: { userId?: string | null }
): Promise<RecommendationsResponseDto> {
  const provider = getDataProvider();
  const emptyOpeningRecheckByTicker: Record<string, OpeningRecheckDecisionDto> = {};
  const [source, analysisSource, dailyCandidates, tracking, portfolioProfile, portfolioJournal, userOpeningRecheckScans] =
    await Promise.all([
    provider.getRecommendations(),
    provider.getAnalysis().catch(() => null),
    getDailyCandidates(),
    provider.getTracking(),
    options?.userId ? loadPortfolioProfileForUser(options.userId) : loadPortfolioProfileDocument(),
    options?.userId ? loadPortfolioJournalForUser(options.userId) : Promise.resolve(null),
    options?.userId ? listUserOpeningRecheckScans(options.userId) : Promise.resolve([])
  ]);
  const [sharedOpeningRecheckByTicker, userOpeningRecheckByTicker, openingRecheckScans] = await Promise.all([
    dailyCandidates
      ? listOpeningRecheckDecisions(dailyCandidates.generatedAt)
      : Promise.resolve(emptyOpeningRecheckByTicker),
    dailyCandidates && options?.userId
      ? listUserOpeningRecheckDecisions(options.userId, dailyCandidates.generatedAt)
      : Promise.resolve(emptyOpeningRecheckByTicker),
    listOpeningRecheckScans()
  ]);
  const sourceByTicker = new Map(source.items.map((item) => [item.ticker, item]));
  const dailyCandidateByTicker = new Map((dailyCandidates?.topCandidates ?? []).map((candidate) => [candidate.ticker, candidate]));
  const featuredRankByTicker = new Map(
    (dailyCandidates?.topCandidates ?? []).map((candidate, index) => [candidate.ticker, index + 1])
  );
  const analysisByTicker = new Map((analysisSource?.items ?? []).map((item) => [item.ticker, item]));

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
        enrichDailyCandidateItem(candidate, sourceByTicker.get(candidate.ticker), options?.userId
          ? userOpeningRecheckByTicker[candidate.ticker]
          : sharedOpeningRecheckByTicker[candidate.ticker],
          sharedOpeningRecheckByTicker[candidate.ticker]
        )
      )
    : null;
  const openingCheckLimit = getOpeningCheckLimit();
  const openingCheckCandidates = dailyScanCandidates?.slice(0, openingCheckLimit) ?? null;
  const todayActionBoard = openingCheckCandidates
    ? buildTodayActionBoard(
        openingCheckCandidates.map((candidate, index) => ({
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
        {
          ...todaySummary,
          maxConcurrentPositions:
            isPortfolioProfileConfigured(portfolioProfile) && portfolioProfile.maxConcurrentPositions > 0
              ? portfolioProfile.maxConcurrentPositions
              : todaySummary.maxConcurrentPositions
        },
        {
          activeHoldings: isPortfolioProfileConfigured(portfolioProfile)
            ? portfolioProfile.positions.map((position) => ({
                ticker: position.ticker,
                company: position.company,
                sector: position.sector
              }))
            : tracking.history
                .filter((item) => item.result === "진행중")
                .map((item) => ({
                  ticker: item.ticker,
                  company: item.company,
                  sector: resolveHoldingSector(item.ticker, {
                    recommendationSector: sourceByTicker.get(item.ticker)?.sector,
                    candidateSector: dailyCandidateByTicker.get(item.ticker)?.sector
                  })
                })),
          sectorLimit:
            isPortfolioProfileConfigured(portfolioProfile) && portfolioProfile.sectorLimit > 0
              ? portfolioProfile.sectorLimit
              : undefined,
          profileName: isPortfolioProfileConfigured(portfolioProfile) ? portfolioProfile.name : undefined,
          totalCapital: isPortfolioProfileConfigured(portfolioProfile) ? portfolioProfile.totalCapital : undefined,
          availableCash: isPortfolioProfileConfigured(portfolioProfile) ? portfolioProfile.availableCash : undefined,
          maxRiskPerTradePercent: isPortfolioProfileConfigured(portfolioProfile)
            ? portfolioProfile.maxRiskPerTradePercent
            : undefined
        }
      )
    : undefined;
  const holdingActionBoard =
    isPortfolioProfileConfigured(portfolioProfile) && portfolioProfile.positions.length
      ? buildHoldingActionBoard({
          generatedAt: dailyCandidates?.generatedAt ?? analysisSource?.generatedAt ?? source.generatedAt,
          profileName: portfolioProfile.name,
          positions: portfolioProfile.positions.map((position) => {
            const dailyCandidate = dailyCandidateByTicker.get(position.ticker);
            const featuredRank = featuredRankByTicker.get(position.ticker);
            const analysisItem = analysisByTicker.get(position.ticker);

            if (analysisItem) {
              const enrichedAnalysis = enrichAnalysisItem(analysisItem, dailyCandidate, featuredRank);

              return {
                ...position,
                signalTone: enrichedAnalysis.signalTone,
                tradePlan: enrichedAnalysis.tradePlan
              };
            }

            const sourceItem = sourceByTicker.get(position.ticker);
            if (sourceItem) {
              const mergedItem = dailyCandidate
                ? {
                    ...sourceItem,
                    score: dailyCandidate.score ?? sourceItem.score,
                    riskRewardRatio:
                      formatRiskRewardRatio(
                        toNullableNumber(dailyCandidate.confirmationPrice),
                        toNullableNumber(dailyCandidate.expansionPrice),
                        toNullableNumber(dailyCandidate.invalidationPrice)
                      ) ?? sourceItem.riskRewardRatio,
                    featuredRank,
                    candidateScore: dailyCandidate.candidateScore,
                    activationScore: sourceItem.activationScore ?? dailyCandidate.activationScore,
                    eventCoverage: dailyCandidate.eventCoverage,
                    candidateBatch: dailyCandidate.batch
                  }
                : sourceItem;
              const enrichedItem = enrichRecommendationItem(mergedItem, dailyCandidate);

              return {
                ...position,
                signalTone: enrichedItem.signalTone,
                tradePlan: enrichedItem.tradePlan
              };
            }

            if (dailyCandidate) {
              const enrichedCandidate = enrichDailyCandidateItem(dailyCandidate);

              return {
                ...position,
                signalTone: dailyCandidate.signalTone,
                tradePlan: enrichedCandidate.tradePlan
              };
            }

            return {
              ...position
            };
          })
        })
      : undefined;
  const openingReview = buildOpeningRecheckReview(openingRecheckScans, tracking.history);
  const openingCheckLearning = buildOpeningCheckLearningInsight(
    portfolioJournal
      ? buildPortfolioOpeningCheckAnalytics(
          groupPortfolioJournalByTicker(portfolioJournal.events),
          userOpeningRecheckScans
        )
      : undefined
  );

  return {
    generatedAt: dailyCandidates?.generatedAt ?? source.generatedAt,
    items,
    dailyScan: dailyCandidates && dailyScanCandidates
      ? {
          generatedAt: dailyCandidates.generatedAt,
          batchSize: dailyCandidates.batchSize,
          concurrency: dailyCandidates.concurrency,
          topCandidatesLimit: dailyCandidates.topCandidatesLimit,
          openingCheckLimit,
          totalTickers: dailyCandidates.totalTickers,
          totalBatches: dailyCandidates.totalBatches,
          succeededBatches: dailyCandidates.succeededBatches,
          failedBatches: dailyCandidates.failedBatches,
          topCandidates: dailyScanCandidates,
          openingCheckCandidates: openingCheckCandidates ?? []
        }
      : null,
    todaySummary,
    operatingWorkflow: buildTodayOperatingWorkflow(todaySummary),
    todayActionBoard,
    holdingActionBoard,
    openingReview,
    openingCheckLearning
  };
}
