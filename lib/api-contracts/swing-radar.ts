export type SignalToneDto = "긍정" | "중립" | "주의";
export type ScenarioLabelDto = "기본" | "강세" | "약세";
export type RiskStatusDto = "양호" | "확인 필요" | "주의";
export type TrackingResultDto = "감시중" | "진행중" | "성공" | "실패" | "무효화";
export type ValidationBasisDto = "실측 기반" | "공용 추적 참고" | "유사 업종 참고" | "유사 흐름 참고" | "보수 계산";
export type RecommendationActionBucketDto = "buy_now" | "watch_only" | "avoid";
export type PositionSizingLimitSourceDto = "risk_budget" | "slot_budget" | "cash_budget";

export interface ActionBucketCountsDto {
  buy_now: number;
  watch_only: number;
  avoid: number;
}

export interface TodayActionSummaryDto {
  marketStance: "attack" | "selective" | "watch";
  marketStanceLabel: string;
  summary: string;
  maxNewPositions: number;
  maxConcurrentPositions: number;
  bucketCounts: ActionBucketCountsDto;
  focusNote: string;
}

export type OperatingStageKeyDto = "preopen_candidates" | "opening_recheck" | "today_action";

export interface OperatingStageDto {
  key: OperatingStageKeyDto;
  title: string;
  summary: string;
  detail: string;
}

export interface OpeningChecklistItemDto {
  key: "gap" | "stop_buffer" | "confirmation" | "position_limit";
  title: string;
  passLabel: string;
  failLabel: string;
}

export interface TodayOperatingWorkflowDto {
  basisLabel: string;
  staleDataNote: string;
  recheckWindowLabel: string;
  steps: OperatingStageDto[];
  openingChecklist: OpeningChecklistItemDto[];
}

export type OpeningRecheckStatusDto = "pending" | "passed" | "watch" | "avoid" | "excluded";
export type OpeningGapCheckDto = "normal" | "elevated" | "overheated";
export type OpeningConfirmationCheckDto = "confirmed" | "mixed" | "failed";
export type OpeningActionIntentDto = "review" | "watch" | "hold";

export interface OpeningRecheckChecklistDto {
  gap: OpeningGapCheckDto;
  confirmation: OpeningConfirmationCheckDto;
  action: OpeningActionIntentDto;
}

export interface OpeningRecheckDecisionDto {
  status: OpeningRecheckStatusDto;
  updatedAt: string;
  updatedBy?: string;
  note?: string;
  checklist?: OpeningRecheckChecklistDto;
  suggestedStatus?: Exclude<OpeningRecheckStatusDto, "pending">;
}

export type OpeningRecheckReviewOutcomeDto = "success" | "failure" | "active";

export interface OpeningRecheckReviewSummaryDto {
  headline: string;
  note: string;
  matchedCount: number;
  resolvedCount: number;
  successCount: number;
  failureCount: number;
  activeCount: number;
  passedWinRate?: number;
  avoidedFailureRate?: number;
}

export interface OpeningRecheckReviewStatusInsightDto {
  status: Exclude<OpeningRecheckStatusDto, "pending">;
  label: string;
  count: number;
  resolvedCount: number;
  successCount: number;
  failureCount: number;
  activeCount: number;
  note: string;
}

export interface OpeningRecheckReviewPatternDto {
  id: string;
  title: string;
  count: number;
  resolvedCount: number;
  successCount: number;
  failureCount: number;
  activeCount: number;
  note: string;
}

export interface OpeningRecheckReviewDto {
  summary: OpeningRecheckReviewSummaryDto;
  statusBreakdown: OpeningRecheckReviewStatusInsightDto[];
  patterns: OpeningRecheckReviewPatternDto[];
}

export interface OpeningCheckLearningInsightDto {
  headline: string;
  primaryLesson: string;
  secondaryLesson?: string;
}

export interface OpeningCheckRiskPatternDto {
  id: string;
  title: string;
  count: number;
  profitableCount: number;
  lossCount: number;
  winRate: number;
}

export interface OpeningCheckPositivePatternDto {
  id: string;
  title: string;
  count: number;
  profitableCount: number;
  lossCount: number;
  winRate: number;
  headline: string;
  detail: string;
}

export interface StrategyPerformanceHintDto {
  key: string;
  label: string;
  count: number;
  winRate: number;
  realizedPnl: number;
  headline: string;
  detail: string;
}

export interface PersonalRuleReminderDto {
  headline: string;
  primaryRule: string;
  secondaryRules: string[];
  note: string;
}

export interface PersonalRuleAlertDto {
  headline: string;
  detail: string;
  statLine: string;
  ctaLabel: string;
  ctaHref: string;
}

export interface TodayCommunityStatDto {
  label: string;
  ticker: string;
  company: string;
  count: number;
  countLabel: string;
  note: string;
  tone: "positive" | "neutral" | "caution";
}

export interface TodayCommunityStatsDto {
  headline: string;
  note: string;
  stats: TodayCommunityStatDto[];
}

export interface MarketSessionStatusDto {
  marketDate: string;
  isOpenDay: boolean;
  closureKind: "open" | "weekend" | "holiday";
  closureLabel: string;
  headline: string;
  detail: string;
  holidayName?: string;
}

export interface OpeningRecheckTickerInsightDto {
  scanKey: string;
  signalDate: string;
  status: Exclude<OpeningRecheckStatusDto, "pending">;
  statusLabel: string;
  statusDescription: string;
  suggestedStatus?: Exclude<OpeningRecheckStatusDto, "pending">;
  suggestedStatusLabel?: string;
  gapLabel?: string;
  confirmationLabel?: string;
  actionLabel?: string;
  note?: string;
  outcome?: OpeningRecheckReviewOutcomeDto;
  outcomeLabel?: string;
  outcomeNote: string;
  matchedBy: "signal_date" | "latest_ticker";
}

export type TodayActionBoardStatusDto = "buy_review" | "watch" | "avoid" | "excluded" | "pending";

export interface TodayActionBoardSectorLoadDto {
  sector: string;
  count: number;
}

export interface ValidationStatsDto {
  hitRate: number;
  avgReturn: number;
  sampleSize: number;
  maxDrawdown: number;
}

export interface ValidationInsightDto {
  level: "높음" | "보통" | "주의";
  basis: ValidationBasisDto;
  headline: string;
  detail: string;
  samplesToMeasured?: number;
}

export interface TrackingDiagnosticDto {
  stage: "진입 추적 가능" | "자동 감시 가능" | "조건 보강 필요";
  activationScore: number;
  watchThreshold: number;
  entryThreshold: number;
  isWatchEligible: boolean;
  isEntryEligible: boolean;
  blockers: string[];
  supports: string[];
}

export interface RecommendationTradePlanDto {
  currentPrice?: number | null;
  currentPriceLabel: string;
  entryPriceLow?: number | null;
  entryPriceHigh?: number | null;
  confirmationPrice?: number | null;
  entryLabel: string;
  stopPrice?: number | null;
  stopLabel: string;
  targetPrice?: number | null;
  targetLabel: string;
  stretchTargetPrice?: number | null;
  stretchTargetLabel: string;
  holdWindowLabel: string;
  riskRewardLabel: string;
  nextStep: string;
  positionSizing?: PositionSizingPlanDto;
}

export interface PositionSizingPlanDto {
  entryReferencePrice: number;
  stopDistancePrice: number;
  stopDistancePercent: number;
  riskBudget: number;
  suggestedQuantity: number;
  suggestedCapital: number;
  suggestedWeightPercent: number;
  maxLossAmount: number;
  limitSource: PositionSizingLimitSourceDto;
  limitLabel: string;
  note: string;
}

export interface TodayActionBoardItemDto {
  ticker: string;
  company: string;
  sector: string;
  signalTone: SignalToneDto;
  featuredRank?: number;
  candidateScore?: number;
  activationScore?: number;
  actionBucket?: RecommendationActionBucketDto;
  tradePlan?: RecommendationTradePlanDto;
  openingRecheck?: OpeningRecheckDecisionDto;
  boardStatus: TodayActionBoardStatusDto;
  boardReason: string;
  portfolioNote?: string;
}

export interface TodayActionBoardSummaryDto {
  headline: string;
  note: string;
  maxNewPositions: number;
  remainingNewPositions: number;
  activeHoldingCount: number;
  remainingPortfolioSlots: number;
  sectorLimit: number;
  crowdedSectors: TodayActionBoardSectorLoadDto[];
  buyReviewCount: number;
  watchCount: number;
  avoidCount: number;
  excludedCount: number;
  pendingCount: number;
  portfolioProfileName?: string;
  availableCash?: number;
  riskBudgetPerTrade?: number;
}

export interface TodayActionBoardSectionDto {
  status: TodayActionBoardStatusDto;
  label: string;
  description: string;
  count: number;
  items: TodayActionBoardItemDto[];
}

export interface TodayActionBoardDto {
  summary: TodayActionBoardSummaryDto;
  sections: TodayActionBoardSectionDto[];
  items: TodayActionBoardItemDto[];
}

export type HoldingActionStatusDto =
  | "exit_review"
  | "take_profit"
  | "tighten_stop"
  | "time_stop_review"
  | "hold";

export interface HoldingActionItemDto {
  ticker: string;
  company: string;
  sector: string;
  signalTone?: SignalToneDto;
  quantity: number;
  averagePrice: number;
  currentPrice?: number | null;
  investedCapital: number;
  marketValue?: number | null;
  unrealizedPnlAmount?: number | null;
  unrealizedPnlPercent?: number | null;
  enteredAt?: string;
  holdingDays?: number;
  note?: string;
  actionStatus: HoldingActionStatusDto;
  actionLabel: string;
  actionSummary: string;
  actionReason: string;
  nextAction: string;
  guardLabel: string;
  tradePlan?: RecommendationTradePlanDto;
}

export interface HoldingActionSummaryDto {
  headline: string;
  note: string;
  profileName?: string;
  holdingCount: number;
  investedCapital: number;
  marketValue?: number;
  unrealizedPnlAmount?: number;
  unrealizedPnlPercent?: number;
  takeProfitCount: number;
  tightenStopCount: number;
  exitReviewCount: number;
  timeStopReviewCount: number;
  holdCount: number;
}

export interface HoldingActionSectionDto {
  status: HoldingActionStatusDto;
  label: string;
  description: string;
  count: number;
  items: HoldingActionItemDto[];
}

export interface HoldingActionBoardDto {
  summary: HoldingActionSummaryDto;
  sections: HoldingActionSectionDto[];
  items: HoldingActionItemDto[];
}

export interface AnalysisTradePlanDto extends RecommendationTradePlanDto {
  bucket: RecommendationActionBucketDto;
  bucketLabel: string;
  bucketDescription: string;
  title: string;
  summary: string;
  headline: string;
  entryGuide: string;
  stopGuide: string;
  targetGuide: string;
  supportPoints: string[];
  cautionPoints: string[];
}

export interface RecommendationListItemDto {
  ticker: string;
  company: string;
  sector: string;
  signalTone: SignalToneDto;
  score: number;
  activationScore?: number;
  signalLabel: string;
  rationale: string;
  invalidation: string;
  invalidationDistance: number;
  riskRewardRatio: string;
  validationSummary: string;
  validationBasis?: ValidationBasisDto;
  checkpoints: string[];
  validation: ValidationStatsDto;
  observationWindow: string;
  updatedAt: string;
  featuredRank?: number;
  candidateScore?: number;
  eventCoverage?: string;
  candidateBatch?: number;
  trackingDiagnostic?: TrackingDiagnosticDto;
  validationInsight?: ValidationInsightDto;
  actionBucket?: RecommendationActionBucketDto;
  tradePlan?: RecommendationTradePlanDto;
}

export interface DailyCandidateDto {
  batch: number;
  ticker: string;
  company: string;
  sector: string;
  signalTone: SignalToneDto;
  score: number;
  candidateScore: number;
  activationScore?: number;
  currentPrice?: number | null;
  confirmationPrice?: number | null;
  expansionPrice?: number | null;
  invalidationPrice?: number | null;
  averageTurnover20?: number | null;
  liquidityRating?: string;
  invalidation: string;
  validationSummary: string;
  observationWindow: string;
  rationale: string;
  eventCoverage: string;
  actionBucket?: RecommendationActionBucketDto;
  tradePlan?: RecommendationTradePlanDto;
  openingRecheck?: OpeningRecheckDecisionDto;
  sharedOpeningRecheck?: OpeningRecheckDecisionDto;
}

export interface FailedUniverseBatchDto {
  ok: false;
  batch: number;
  count: number;
  errors: string[];
}

export interface DailyScanSummaryDto {
  generatedAt: string;
  batchSize: number;
  concurrency?: number;
  topCandidatesLimit?: number;
  openingCheckLimit?: number;
  totalTickers: number;
  totalBatches: number;
  succeededBatches: number;
  failedBatches: FailedUniverseBatchDto[];
  topCandidates: DailyCandidateDto[];
  openingCheckCandidates?: DailyCandidateDto[];
}

export interface RecommendationsResponseDto {
  generatedAt: string;
  items: RecommendationListItemDto[];
  dailyScan: DailyScanSummaryDto | null;
  marketSession: MarketSessionStatusDto;
  todaySummary?: TodayActionSummaryDto;
  operatingWorkflow?: TodayOperatingWorkflowDto;
  todayActionBoard?: TodayActionBoardDto;
  holdingActionBoard?: HoldingActionBoardDto;
  openingReview?: OpeningRecheckReviewDto;
  openingCheckLearning?: OpeningCheckLearningInsightDto;
  openingCheckRiskPatterns?: OpeningCheckRiskPatternDto[];
  openingCheckPositivePattern?: OpeningCheckPositivePatternDto;
  strategyPerformanceHint?: StrategyPerformanceHintDto;
  personalRuleReminder?: PersonalRuleReminderDto;
  personalRuleAlert?: PersonalRuleAlertDto;
  todayCommunityStats?: TodayCommunityStatsDto;
}

export interface AnalysisSummaryMetricDto {
  label: string;
  value: string;
  note: string;
}

export interface KeyLevelDto {
  label: string;
  price: string;
  meaning: string;
}

export interface TechnicalIndicatorsDto {
  sma20: number | null;
  sma60: number | null;
  ema20: number | null;
  rsi14: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;
  bollingerUpper: number | null;
  bollingerMiddle: number | null;
  bollingerLower: number | null;
  volumeRatio20: number | null;
  atr14: number | null;
  natr14: number | null;
  adx14: number | null;
  plusDi14: number | null;
  minusDi14: number | null;
  stochasticK: number | null;
  stochasticD: number | null;
  mfi14: number | null;
  roc20: number | null;
  cci20: number | null;
  cmf20: number | null;
  marketRelativeStrength20?: number | null;
  marketRelativeSpread20?: number | null;
}

export interface AnalysisChartPointDto {
  label: string;
  date?: string | null;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  volume: number | null;
  sma20: number | null;
  sma60: number | null;
  ema20: number | null;
  bollingerUpper: number | null;
  bollingerLower: number | null;
  rsi14: number | null;
  macd: number | null;
  macdSignal: number | null;
}

export interface AnalysisEventDto {
  headline: string;
  impact: SignalToneDto;
  summary: string;
  source: string;
  url: string;
  date: string;
  eventType: string;
}

export interface TickerAnalysisDto {
  ticker: string;
  company: string;
  signalTone: SignalToneDto;
  score: number;
  activationScore?: number;
  validation?: ValidationStatsDto;
  validationBasis?: ValidationBasisDto;
  validationInsight?: ValidationInsightDto;
  trackingDiagnostic?: TrackingDiagnosticDto;
  headline: string;
  invalidation: string;
  analysisSummary: AnalysisSummaryMetricDto[];
  keyLevels: KeyLevelDto[];
  technicalIndicators: TechnicalIndicatorsDto;
  chartSeries: AnalysisChartPointDto[];
  decisionNotes: string[];
  scoreBreakdown: Array<{ label: string; score: number; maxScore?: number; description: string }>;
  scenarios: Array<{ label: ScenarioLabelDto; probability: number; expectation: string; trigger: string }>;
  riskChecklist: Array<{ label: string; status: RiskStatusDto; note: string }>;
  newsImpact: AnalysisEventDto[];
  dataQuality: Array<{ label: string; value: string; note: string }>;
  actionBucket?: RecommendationActionBucketDto;
  tradePlan?: AnalysisTradePlanDto;
}

export interface AnalysisResponseDto {
  generatedAt: string;
  items: TickerAnalysisDto[];
}

export interface SignalHistoryEntryDto {
  id: string;
  ticker: string;
  company: string;
  signalDate: string;
  startedAt?: string | null;
  closedAt?: string | null;
  closedReason?: string | null;
  signalTone: SignalToneDto;
  entryScore: number;
  result: TrackingResultDto;
  mfe: number;
  mae: number;
  currentReturn?: number;
  holdingDays: number;
  selectionStage?: string;
  selectionReason?: string;
}

export interface TrackingMetricDto {
  label: string;
  value: string;
  note: string;
}

export interface TrackingEventDto {
  id: string;
  date: string;
  headline: string;
  impact: SignalToneDto;
  note: string;
  source: string;
  url: string;
  eventType: string;
}

export interface TrackingDetailDto {
  historyId: string;
  selectionStage?: string;
  selectionReason?: string;
  selectionHighlights?: string[];
  summary: string;
  invalidationReview: string;
  afterActionReview: string;
  reviewChecklist: string[];
  metrics: TrackingMetricDto[];
  chartSnapshot: Array<{ label: string; price: number }>;
  historicalNews: TrackingEventDto[];
  scoreLog: Array<{ timestamp: string; factor: string; delta: number; reason: string; scoreAfter?: number }>;
  openingCheckInsight?: OpeningRecheckTickerInsightDto;
}

export interface TrackingResponseDto {
  generatedAt: string;
  history: SignalHistoryEntryDto[];
  details: Record<string, TrackingDetailDto>;
}
