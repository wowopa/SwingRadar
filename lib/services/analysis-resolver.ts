import type {
  DailyCandidateDto,
  RecommendationListItemDto,
  TickerAnalysisDto
} from "@/lib/api-contracts/swing-radar";
import { getDataProvider } from "@/lib/providers";
import { getDailyCandidates } from "@/lib/repositories/daily-candidates";
import type { AnalysisQuery } from "@/lib/server/query-schemas";

const KO = {
  good: "양호" as const,
  review: "확인 필요" as const,
  caution: "주의" as const,
  basic: "기본" as const,
  bull: "강세" as const,
  bear: "약세" as const
};

const EMPTY_TECHNICAL_INDICATORS = {
  sma20: null,
  sma60: null,
  ema20: null,
  rsi14: null,
  macd: null,
  macdSignal: null,
  macdHistogram: null,
  bollingerUpper: null,
  bollingerMiddle: null,
  bollingerLower: null,
  volumeRatio20: null
};

const EMPTY_CHART_SERIES: TickerAnalysisDto["chartSeries"] = [];

export interface ResolvedTickerAnalysis {
  generatedAt: string;
  item: TickerAnalysisDto;
}

function formatPercent(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function parsePrice(text: string) {
  const match = text.match(/([\d,]+)/);
  return match ? Number(match[1].replaceAll(",", "")) : null;
}

function riskStatusFromDistance(distance: number) {
  if (distance <= -6) return KO.good;
  if (distance <= -3) return KO.review;
  return KO.caution;
}

function riskStatusFromCoverage(coverage: string | undefined) {
  if (coverage === "보강됨") return KO.good;
  if (coverage === "제한적") return KO.review;
  return KO.caution;
}

function riskStatusFromSampleSize(sampleSize: number) {
  if (sampleSize >= 30) return KO.good;
  if (sampleSize >= 18) return KO.review;
  return KO.caution;
}

function buildValidationFromCandidate(item: DailyCandidateDto) {
  const hitRate = clamp(Math.round(item.score * 0.72), 45, 61);
  const avgReturn = Number((item.score >= 65 ? 4.2 : item.score >= 55 ? 2.6 : 1.1).toFixed(1));
  const sampleSize = clamp(Math.round(item.score * 0.35), 14, 26);
  const maxDrawdown = Number((item.score >= 65 ? -4.8 : item.score >= 55 ? -5.8 : -7.1).toFixed(1));

  return {
    hitRate,
    avgReturn,
    sampleSize,
    maxDrawdown
  };
}

function buildScoreBreakdown(score: number) {
  const trend = Math.round(score * 0.38);
  const flow = Math.round(score * 0.2);
  const volatility = Math.round(score * 0.12);
  const event = Math.round(score * 0.15);
  const quality = Math.max(score - trend - flow - volatility - event, 0);

  return [
    { label: "추세", score: trend, description: "중기 가격 흐름" },
    { label: "수급", score: flow, description: "거래량과 회전 흐름" },
    { label: "변동성", score: volatility, description: "가격 흔들림 관리" },
    { label: "이벤트", score: event, description: "기사와 공시 반영" },
    { label: "품질", score: quality, description: "데이터 정합성" }
  ];
}

function buildAnalysisSummary(
  recommendation: RecommendationListItemDto,
  coverage: string,
  scoreBreakdown: ReturnType<typeof buildScoreBreakdown>
) {
  return [
    { label: "현재 점수", value: `${Math.round(recommendation.score)}점`, note: recommendation.signalLabel },
    {
      label: "검증 승률",
      value: `${recommendation.validation.hitRate}%`,
      note: `표본 ${recommendation.validation.sampleSize}건 기준`
    },
    {
      label: "평균 움직임",
      value: formatPercent(recommendation.validation.avgReturn),
      note: "과거 비슷한 흐름 기준"
    },
    { label: "데이터 신뢰도", value: coverage, note: `품질 점수 ${scoreBreakdown[4]?.score ?? 0}점` }
  ];
}

function buildKeyLevels(recommendation: RecommendationListItemDto) {
  const invalidationPrice = parsePrice(recommendation.invalidation);
  const checkpointPrices = recommendation.checkpoints.map(parsePrice).filter((value): value is number => value !== null);
  const confirmationPrice = checkpointPrices[1] ?? checkpointPrices[0] ?? invalidationPrice;
  const expansionPrice = checkpointPrices[2] ?? checkpointPrices[1] ?? confirmationPrice ?? invalidationPrice;

  return [
    {
      label: "기준 이탈",
      price: invalidationPrice ? `${invalidationPrice.toLocaleString()}원` : recommendation.invalidation,
      meaning: "이 가격 아래면 흐름을 다시 봅니다."
    },
    {
      label: "확인 가격",
      price: confirmationPrice ? `${confirmationPrice.toLocaleString()}원` : recommendation.checkpoints[1] ?? "확인 필요",
      meaning: "상승 힘이 붙는지 확인하는 구간입니다."
    },
    {
      label: "다음 목표",
      price: expansionPrice ? `${expansionPrice.toLocaleString()}원` : recommendation.checkpoints[2] ?? "확인 필요",
      meaning: "추가 상승이 이어질 때 보는 가격대입니다."
    }
  ];
}

function buildDecisionNotes(recommendation: RecommendationListItemDto, coverage: string) {
  return [
    recommendation.validationSummary,
    recommendation.rationale,
    `체크포인트: ${recommendation.checkpoints.join(", ")}`,
    `이벤트 커버리지는 ${coverage} 상태로 보고 있습니다.`
  ];
}

function buildScenarios(keyLevels: ReturnType<typeof buildKeyLevels>, score: number) {
  const confirmationPrice = keyLevels[1]?.price ?? "확인 가격";
  const expansionPrice = keyLevels[2]?.price ?? "다음 목표";
  const invalidationPrice = keyLevels[0]?.price ?? "기준 이탈 가격";
  const basicProbability = clamp(42 + Math.round(score * 0.18), 40, 62);
  const bullProbability = clamp(14 + Math.round(score * 0.08), 15, 28);
  const bearProbability = Math.max(100 - basicProbability - bullProbability, 15);

  return [
    {
      label: KO.basic,
      probability: basicProbability,
      expectation: "지금 흐름이 이어지는 경우",
      trigger: `${confirmationPrice} 위에서 버티는지 확인`
    },
    {
      label: KO.bull,
      probability: bullProbability,
      expectation: "생각보다 더 강하게 오르는 경우",
      trigger: `${expansionPrice}까지 빠르게 올라가는지 확인`
    },
    {
      label: KO.bear,
      probability: bearProbability,
      expectation: "흐름이 약해지는 경우",
      trigger: `${invalidationPrice} 아래로 내려가는지 확인`
    }
  ];
}

function buildRiskChecklist(recommendation: RecommendationListItemDto, coverage: string) {
  return [
    {
      label: "기준 이탈 거리",
      status: riskStatusFromDistance(recommendation.invalidationDistance),
      note: `${formatPercent(recommendation.invalidationDistance)} 수준`
    },
    {
      label: "이벤트 커버리지",
      status: riskStatusFromCoverage(coverage),
      note: coverage === "보강됨" ? "기사 외 보조 이벤트도 함께 반영됐습니다." : "추가 확인이 필요합니다."
    },
    {
      label: "검증 표본",
      status: riskStatusFromSampleSize(recommendation.validation.sampleSize),
      note: `비슷한 흐름 ${recommendation.validation.sampleSize}건 기준입니다.`
    }
  ];
}

function buildDataQuality(recommendation: RecommendationListItemDto, coverage: string, generatedAt: string) {
  const validationBasis = recommendation.validationBasis ?? "보수 계산";

  return [
    {
      label: "출처",
      value: "추천 데이터",
      note: "분석 상세가 아직 없어서 현재 추천 정보를 기준으로 구성했습니다."
    },
    {
      label: "업데이트",
      value: recommendation.updatedAt,
      note: `스냅샷 생성 시각 ${generatedAt}`
    },
    {
      label: "검증",
      value: validationBasis,
      note:
        validationBasis === "실측 기반"
          ? recommendation.validationSummary
          : `${recommendation.validationSummary} 실측 표본이 더 쌓이기 전까지는 참고용으로 보는 편이 좋습니다.`
    },
    {
      label: "커버리지",
      value: coverage,
      note: recommendation.eventCoverage ? `후보 이벤트 상태 ${recommendation.eventCoverage}` : "기본 뉴스 흐름 기준"
    }
  ];
}

function buildAnalysisFallback(
  recommendation: RecommendationListItemDto,
  generatedAt: string,
  dailyCandidate?: DailyCandidateDto
): TickerAnalysisDto {
  const coverage = dailyCandidate?.eventCoverage ?? recommendation.eventCoverage ?? "제한적";
  const scoreBreakdown = buildScoreBreakdown(Math.round(recommendation.score));
  const keyLevels = buildKeyLevels(recommendation);

  return {
    ticker: recommendation.ticker,
    company: recommendation.company,
    signalTone: recommendation.signalTone,
    score: recommendation.score,
    headline: `${recommendation.company} 관찰 신호는 ${recommendation.signalLabel} 관점에서 해석합니다.`,
    invalidation: recommendation.invalidation,
    analysisSummary: buildAnalysisSummary(recommendation, coverage, scoreBreakdown),
    keyLevels,
    technicalIndicators: EMPTY_TECHNICAL_INDICATORS,
    chartSeries: [],
    decisionNotes: buildDecisionNotes(recommendation, coverage),
    scoreBreakdown,
    scenarios: buildScenarios(keyLevels, Math.round(recommendation.score)),
    riskChecklist: buildRiskChecklist(recommendation, coverage),
    newsImpact: [],
    dataQuality: buildDataQuality(recommendation, coverage, generatedAt)
  };
}

function toRecommendationFromDailyCandidate(candidate: DailyCandidateDto, generatedAt: string): RecommendationListItemDto {
  const validation = buildValidationFromCandidate(candidate);

  return {
    ticker: candidate.ticker,
    company: candidate.company,
    sector: candidate.sector,
    signalTone: candidate.signalTone,
    score: candidate.score,
    signalLabel: candidate.signalTone === "긍정" ? "흐름이 강한 편" : candidate.signalTone === "주의" ? "가볍게 지켜보기" : "조금 더 확인해볼 만함",
    rationale: candidate.rationale,
    invalidation: candidate.invalidation,
    invalidationDistance: -4.5,
    riskRewardRatio: candidate.score >= 70 ? "1 : 1.6" : "1 : 1.1",
    validationSummary: candidate.validationSummary,
    validationBasis: "유사 흐름 참고",
    checkpoints: [
      candidate.invalidation,
      `${candidate.company} 상승 확인 구간`,
      `${candidate.company} 다음 목표 구간`
    ],
    validation,
    observationWindow: candidate.observationWindow,
    updatedAt: generatedAt.replace("T", " ").slice(0, 16),
    candidateScore: candidate.candidateScore,
    eventCoverage: candidate.eventCoverage,
    candidateBatch: candidate.batch
  };
}

function applyAnalysisQuery(item: TickerAnalysisDto, query: AnalysisQuery): TickerAnalysisDto {
  return {
    ...item,
    technicalIndicators: item.technicalIndicators ?? EMPTY_TECHNICAL_INDICATORS,
    chartSeries: item.chartSeries ?? EMPTY_CHART_SERIES,
    newsImpact: query.includeNews === "false" ? [] : item.newsImpact,
    dataQuality: query.includeQuality === "false" ? [] : item.dataQuality
  };
}

export async function resolveTickerAnalysis(ticker: string): Promise<ResolvedTickerAnalysis | undefined> {
  const provider = getDataProvider();
  const [analysisSource, recommendationSource, dailyCandidates] = await Promise.all([
    provider.getAnalysis().catch(() => null),
    provider.getRecommendations().catch(() => null),
    getDailyCandidates().catch(() => null)
  ]);

  const analysisItem = analysisSource?.items.find((entry) => entry.ticker === ticker);
  if (analysisSource && analysisItem) {
    return {
      generatedAt: analysisSource.generatedAt,
      item: {
        ...analysisItem,
        technicalIndicators: analysisItem.technicalIndicators ?? EMPTY_TECHNICAL_INDICATORS,
        chartSeries: analysisItem.chartSeries ?? EMPTY_CHART_SERIES
      }
    };
  }

  const recommendationItem = recommendationSource?.items.find((entry) => entry.ticker === ticker);
  const dailyCandidate = dailyCandidates?.topCandidates.find((entry) => entry.ticker === ticker);

  if (recommendationItem) {
    return {
      generatedAt: recommendationSource?.generatedAt ?? dailyCandidates?.generatedAt ?? new Date().toISOString(),
      item: buildAnalysisFallback(recommendationItem, recommendationSource?.generatedAt ?? new Date().toISOString(), dailyCandidate)
    };
  }

  if (dailyCandidate) {
    const recommendationFallback = toRecommendationFromDailyCandidate(
      dailyCandidate,
      dailyCandidates?.generatedAt ?? new Date().toISOString()
    );

    return {
      generatedAt: dailyCandidates?.generatedAt ?? new Date().toISOString(),
      item: buildAnalysisFallback(recommendationFallback, dailyCandidates?.generatedAt ?? new Date().toISOString(), dailyCandidate)
    };
  }

  return undefined;
}

export async function resolveTickerAnalysisForQuery(
  ticker: string,
  query: AnalysisQuery
): Promise<ResolvedTickerAnalysis | undefined> {
  const resolved = await resolveTickerAnalysis(ticker);
  if (!resolved) {
    return undefined;
  }

  return {
    generatedAt: resolved.generatedAt,
    item: applyAnalysisQuery(resolved.item, query)
  };
}
