import type {
  DailyCandidateDto,
  OpeningCheckLearningInsightDto,
  OpeningCheckPositivePatternDto,
  OpeningCheckRiskPatternDto,
  OpeningRecheckDecisionDto,
  PersonalRuleAlertDto,
  PersonalRuleReminderDto,
  RecommendationListItemDto,
  RecommendationsResponseDto,
  StrategyPerformanceHintDto,
  TickerAnalysisDto
} from "@/lib/api-contracts/swing-radar";
import { buildAnalysisTradePlan } from "@/lib/analysis/action-plan";
import {
  buildPortfolioOpeningCheckAnalytics,
  buildPortfolioPerformanceDashboard,
  filterPortfolioGroupsByDays,
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
import { loadPortfolioCloseReviewsForUser } from "@/lib/server/portfolio-close-reviews";
import { loadPortfolioJournalForUser } from "@/lib/server/portfolio-journal";
import { loadPortfolioPersonalRulesForUser } from "@/lib/server/portfolio-personal-rules";
import {
  isPortfolioProfileConfigured,
  loadPortfolioProfileDocument,
  loadPortfolioProfileForUser
} from "@/lib/server/portfolio-profile";
import { getKrxMarketSessionStatus } from "@/lib/server/krx-market-calendar";
import { getSymbolByTicker } from "@/lib/server/runtime-symbol-master";
import { buildTodayCommunityStats } from "@/lib/server/today-community-stats";
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

function buildOpeningCheckRiskPatterns(
  analytics: ReturnType<typeof buildPortfolioOpeningCheckAnalytics>
): OpeningCheckRiskPatternDto[] {
  if (!analytics) {
    return [];
  }

  return analytics.patterns
    .filter((pattern) => pattern.count >= 2)
    .map((pattern) => ({
      id: pattern.id,
      title: pattern.title,
      count: pattern.count,
      profitableCount: pattern.profitableCount,
      lossCount: pattern.lossCount,
      winRate: pattern.winRate
    }));
}

function buildOpeningCheckPositivePattern(
  analytics: ReturnType<typeof buildPortfolioOpeningCheckAnalytics>
): OpeningCheckPositivePatternDto | undefined {
  if (!analytics) {
    return undefined;
  }

  const pattern = [...analytics.patterns]
    .filter((item) => item.count >= 2 && item.profitableCount > item.lossCount && item.winRate >= 60)
    .sort((left, right) => {
      if (right.winRate !== left.winRate) {
        return right.winRate - left.winRate;
      }
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return right.profitableCount - left.profitableCount;
    })[0];

  if (!pattern) {
    return undefined;
  }

  return {
    id: pattern.id,
    title: pattern.title,
    count: pattern.count,
    profitableCount: pattern.profitableCount,
    lossCount: pattern.lossCount,
    winRate: pattern.winRate,
    headline: `최근 잘 맞은 장초 조합`,
    detail: `${pattern.title} 조합은 최근 ${pattern.count}건 중 ${pattern.profitableCount}건이 수익 종료로 이어졌습니다.`
  };
}

function buildStrategyPerformanceHint(
  journal: Awaited<ReturnType<typeof loadPortfolioJournalForUser>> | null
): StrategyPerformanceHintDto | undefined {
  if (!journal?.events.length) {
    return undefined;
  }

  const grouped = groupPortfolioJournalByTicker(journal.events);
  const recentGroups = filterPortfolioGroupsByDays(grouped, 30);
  const performance = buildPortfolioPerformanceDashboard(recentGroups);
  const bestTag = performance.strategyTags
    .filter((tag) => tag.count >= 2 && tag.realizedPnl > 0 && tag.winRate >= 50)
    .sort((left, right) => {
      if (right.realizedPnl !== left.realizedPnl) {
        return right.realizedPnl - left.realizedPnl;
      }
      if (right.winRate !== left.winRate) {
        return right.winRate - left.winRate;
      }

      return right.count - left.count;
    })[0];

  if (!bestTag) {
    return undefined;
  }

  return {
    key: bestTag.key,
    label: bestTag.label,
    count: bestTag.count,
    winRate: bestTag.winRate,
    realizedPnl: bestTag.realizedPnl,
    headline: "최근 잘 맞은 전략 태그",
    detail: `${bestTag.label} 메모가 붙은 최근 ${bestTag.count}건이 승률 ${bestTag.winRate}%로 마감됐습니다.`
  };
}

function normalizeRuleText(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized || undefined;
}

function buildPersonalRuleReminder(
  closeReviews: Awaited<ReturnType<typeof loadPortfolioCloseReviewsForUser>>,
  personalRules: Awaited<ReturnType<typeof loadPortfolioPersonalRulesForUser>>
): PersonalRuleReminderDto | undefined {
  const entries = Object.values(closeReviews);
  if (!entries.length && !personalRules.length) {
    return undefined;
  }

  const noteStats = new Map<
    string,
    { count: number; latestAt: number; kind: "next" | "watch" }
  >();

  for (const entry of entries) {
    const updatedAt = new Date(entry.updatedAt).getTime() || 0;
    const nextRule = normalizeRuleText(entry.nextRuleNote);
    const watchout = normalizeRuleText(entry.watchoutsNote);

    if (nextRule) {
      const current = noteStats.get(nextRule);
      noteStats.set(nextRule, {
        count: (current?.count ?? 0) + 1,
        latestAt: Math.max(current?.latestAt ?? 0, updatedAt),
        kind: "next"
      });
    }

    if (watchout) {
      const current = noteStats.get(watchout);
      noteStats.set(watchout, {
        count: (current?.count ?? 0) + 1,
        latestAt: Math.max(current?.latestAt ?? 0, updatedAt),
        kind: current?.kind ?? "watch"
      });
    }
  }

  for (const rule of personalRules) {
    const current = noteStats.get(rule.text);
    const updatedAt = new Date(rule.updatedAt).getTime() || 0;
    noteStats.set(rule.text, {
      count: Math.max((current?.count ?? 0) + 2, 2),
      latestAt: Math.max(current?.latestAt ?? 0, updatedAt),
      kind: "next"
    });
  }

  const sortedNotes = [...noteStats.entries()]
    .sort((left, right) => {
      if (right[1].kind !== left[1].kind) {
        return left[1].kind === "next" ? -1 : 1;
      }
      if (right[1].count !== left[1].count) {
        return right[1].count - left[1].count;
      }

      return right[1].latestAt - left[1].latestAt;
    })
    .map(([text, meta]) => ({
      text,
      ...meta
    }));

  if (!sortedNotes.length) {
    return undefined;
  }

  const primary = sortedNotes[0];
  const secondaryRules = sortedNotes.slice(1, 3).map((item) => item.text);
  const repeatedCount = sortedNotes.filter((item) => item.count > 1).length;

  return {
    headline: primary.kind === "next" ? "오늘 먼저 기억할 규칙" : "오늘 먼저 피할 실수",
    primaryRule: primary.text,
    secondaryRules,
    note:
      primary.count > 1
        ? `최근 종료 거래 ${primary.count}건에서 반복된 문장입니다.`
        : repeatedCount > 0
          ? "최근 회고에서 자주 나온 주의점입니다."
          : "최근 회고에서 직접 남긴 개인 규칙입니다."
  };
}

function buildPersonalRuleAlert(
  analytics: ReturnType<typeof buildPortfolioOpeningCheckAnalytics>,
  reminder?: PersonalRuleReminderDto
): PersonalRuleAlertDto | undefined {
  if (!analytics || analytics.overrideCount < 2) {
    return undefined;
  }

  const riskyStatuses = analytics.statusInsights.filter((item) => {
    return item.status === "avoid" || item.status === "excluded";
  });

  if (!riskyStatuses.length) {
    return undefined;
  }

  const dominantRisk = [...riskyStatuses].sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }
    if (right.lossCount !== left.lossCount) {
      return right.lossCount - left.lossCount;
    }

    return left.winRate - right.winRate;
  })[0];

  const riskyLossCount = riskyStatuses.reduce((sum, item) => sum + item.lossCount, 0);
  const riskyProfitCount = riskyStatuses.reduce((sum, item) => sum + item.profitableCount, 0);
  const repeatedRule = reminder?.primaryRule;

  return {
    headline: `보류·제외 판단 강행 ${analytics.overrideCount}건`,
    detail: repeatedRule
      ? `${repeatedRule} 규칙이 있었지만 최근 ${dominantRisk.count}건에서 ${dominantRisk.label} 판단 이후에도 진입했습니다.`
      : `${dominantRisk.label} 판단 이후에도 진입한 거래가 반복되고 있습니다. 오늘은 장초 확인 저장 전 규칙을 다시 확인하세요.`,
    statLine: `손실 종료 ${riskyLossCount}건 · 수익 종료 ${riskyProfitCount}건`,
    ctaLabel: "장초 확인 먼저",
    ctaHref: "/opening-check"
  };
}

function buildClosedMarketTodaySummary(
  summary: ReturnType<typeof buildTodayOperatingSummary>,
  marketSession: ReturnType<typeof getKrxMarketSessionStatus>
) {
  return {
    ...summary,
    marketStance: "watch" as const,
    marketStanceLabel: "복기·계획",
    summary: marketSession.headline,
    maxNewPositions: 0,
    focusNote: marketSession.detail
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
  const marketSession = getKrxMarketSessionStatus();
  const isMarketClosed = !marketSession.isOpenDay;
  const provider = getDataProvider();
  const emptyOpeningRecheckByTicker: Record<string, OpeningRecheckDecisionDto> = {};
  const [source, analysisSource, dailyCandidates, tracking, portfolioProfile, portfolioJournal, userOpeningRecheckScans, closeReviews, personalRules] =
    await Promise.all([
    provider.getRecommendations(),
    provider.getAnalysis().catch(() => null),
    getDailyCandidates(),
    provider.getTracking(),
    options?.userId ? loadPortfolioProfileForUser(options.userId) : loadPortfolioProfileDocument(),
    options?.userId ? loadPortfolioJournalForUser(options.userId) : Promise.resolve(null),
    options?.userId ? listUserOpeningRecheckScans(options.userId) : Promise.resolve([]),
    options?.userId ? loadPortfolioCloseReviewsForUser(options.userId) : Promise.resolve({}),
    options?.userId ? loadPortfolioPersonalRulesForUser(options.userId) : Promise.resolve([])
  ]);
  const [sharedOpeningRecheckByTicker, userOpeningRecheckByTicker, openingRecheckScans] = await Promise.all([
    dailyCandidates && !isMarketClosed
      ? listOpeningRecheckDecisions(dailyCandidates.generatedAt)
      : Promise.resolve(emptyOpeningRecheckByTicker),
    dailyCandidates && options?.userId && !isMarketClosed
      ? listUserOpeningRecheckDecisions(options.userId, dailyCandidates.generatedAt)
      : Promise.resolve(emptyOpeningRecheckByTicker),
    isMarketClosed ? Promise.resolve([]) : listOpeningRecheckScans()
  ]);
  const todayCommunityStats = await buildTodayCommunityStats({
    scanKey: dailyCandidates?.generatedAt ?? null
  });
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

  const baseTodaySummary = buildTodayOperatingSummary(items);
  const todaySummary = isMarketClosed
    ? buildClosedMarketTodaySummary(baseTodaySummary, marketSession)
    : baseTodaySummary;
  const dailyScanCandidates = dailyCandidates
    ? dailyCandidates.topCandidates.map((candidate) =>
        enrichDailyCandidateItem(candidate, sourceByTicker.get(candidate.ticker), options?.userId
          ? userOpeningRecheckByTicker[candidate.ticker]
          : sharedOpeningRecheckByTicker[candidate.ticker],
          sharedOpeningRecheckByTicker[candidate.ticker]
        )
      )
    : null;
  const openingCheckLimit = isMarketClosed ? 0 : getOpeningCheckLimit();
  const openingCheckCandidates = isMarketClosed ? [] : dailyScanCandidates?.slice(0, openingCheckLimit) ?? [];
  const todayActionBoard = !isMarketClosed && openingCheckCandidates.length
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
  const openingCheckAnalytics = portfolioJournal
    ? buildPortfolioOpeningCheckAnalytics(
        groupPortfolioJournalByTicker(portfolioJournal.events),
        userOpeningRecheckScans
      )
    : undefined;
  const openingCheckLearning = buildOpeningCheckLearningInsight(openingCheckAnalytics);
  const openingCheckRiskPatterns = buildOpeningCheckRiskPatterns(openingCheckAnalytics);
  const openingCheckPositivePattern = buildOpeningCheckPositivePattern(openingCheckAnalytics);
  const strategyPerformanceHint = buildStrategyPerformanceHint(portfolioJournal);
  const personalRuleReminder = buildPersonalRuleReminder(closeReviews, personalRules);
  const personalRuleAlert = buildPersonalRuleAlert(openingCheckAnalytics, personalRuleReminder);

  return {
    generatedAt: dailyCandidates?.generatedAt ?? source.generatedAt,
    items,
    marketSession,
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
          openingCheckCandidates
        }
      : null,
    todaySummary,
    operatingWorkflow: buildTodayOperatingWorkflow(todaySummary),
    todayActionBoard,
    holdingActionBoard,
    openingReview,
    openingCheckLearning,
    openingCheckRiskPatterns,
    openingCheckPositivePattern,
    strategyPerformanceHint,
    personalRuleReminder,
    personalRuleAlert,
    todayCommunityStats
  };
}
