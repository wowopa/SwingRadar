export type SignalTone = "긍정" | "중립" | "주의";

export interface ValidationStats {
  hitRate: number;
  avgReturn: number;
  sampleSize: number;
  maxDrawdown: number;
}

export type ValidationBasis = "실측 기반" | "공용 추적 참고" | "유사 업종 참고" | "유사 흐름 참고" | "보수 계산";

export interface ValidationInsight {
  level: "높음" | "보통" | "주의";
  basis: ValidationBasis;
  headline: string;
  detail: string;
  samplesToMeasured?: number;
}

export interface TrackingDiagnostic {
  stage: "진입 추적 가능" | "자동 감시 가능" | "조건 보강 필요";
  activationScore: number;
  watchThreshold: number;
  entryThreshold: number;
  isWatchEligible: boolean;
  isEntryEligible: boolean;
  blockers: string[];
  supports: string[];
}

export type RecommendationActionBucket = "buy_now" | "watch_only" | "avoid";

export interface ActionBucketCounts {
  buy_now: number;
  watch_only: number;
  avoid: number;
}

export interface TodayActionSummary {
  marketStance: "attack" | "selective" | "watch";
  marketStanceLabel: string;
  summary: string;
  maxNewPositions: number;
  maxConcurrentPositions: number;
  bucketCounts: ActionBucketCounts;
  focusNote: string;
}

export type OperatingStageKey = "preopen_candidates" | "opening_recheck" | "today_action";

export interface OperatingStage {
  key: OperatingStageKey;
  title: string;
  summary: string;
  detail: string;
}

export interface OpeningChecklistItem {
  key: "gap" | "stop_buffer" | "confirmation" | "position_limit";
  title: string;
  passLabel: string;
  failLabel: string;
}

export interface TodayOperatingWorkflow {
  basisLabel: string;
  staleDataNote: string;
  recheckWindowLabel: string;
  steps: OperatingStage[];
  openingChecklist: OpeningChecklistItem[];
}

export type OpeningRecheckStatus = "pending" | "passed" | "watch" | "avoid" | "excluded";

export type OpeningGapCheck = "normal" | "elevated" | "overheated";
export type OpeningConfirmationCheck = "confirmed" | "mixed" | "failed";
export type OpeningActionIntent = "review" | "watch" | "hold";

export interface OpeningRecheckChecklist {
  gap: OpeningGapCheck;
  confirmation: OpeningConfirmationCheck;
  action: OpeningActionIntent;
}

export interface OpeningRecheckDecision {
  status: OpeningRecheckStatus;
  updatedAt: string;
  updatedBy?: string;
  note?: string;
  checklist?: OpeningRecheckChecklist;
  suggestedStatus?: Exclude<OpeningRecheckStatus, "pending">;
}

export type OpeningRecheckReviewOutcome = "success" | "failure" | "active";

export interface OpeningRecheckReviewSummary {
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

export interface OpeningRecheckReviewStatusInsight {
  status: Exclude<OpeningRecheckStatus, "pending">;
  label: string;
  count: number;
  resolvedCount: number;
  successCount: number;
  failureCount: number;
  activeCount: number;
  note: string;
}

export interface OpeningRecheckReviewPattern {
  id: string;
  title: string;
  count: number;
  resolvedCount: number;
  successCount: number;
  failureCount: number;
  activeCount: number;
  note: string;
}

export interface OpeningRecheckReview {
  summary: OpeningRecheckReviewSummary;
  statusBreakdown: OpeningRecheckReviewStatusInsight[];
  patterns: OpeningRecheckReviewPattern[];
}

export interface OpeningCheckLearningInsight {
  headline: string;
  primaryLesson: string;
  secondaryLesson?: string;
}

export interface OpeningCheckRiskPattern {
  id: string;
  title: string;
  count: number;
  profitableCount: number;
  lossCount: number;
  winRate: number;
}

export interface OpeningCheckPositivePattern {
  id: string;
  title: string;
  count: number;
  profitableCount: number;
  lossCount: number;
  winRate: number;
  headline: string;
  detail: string;
}

export interface StrategyPerformanceHint {
  key: string;
  label: string;
  count: number;
  winRate: number;
  realizedPnl: number;
  headline: string;
  detail: string;
}

export interface PersonalRuleReminder {
  headline: string;
  primaryRule: string;
  secondaryRules: string[];
  note: string;
}

export interface PersonalRuleAlert {
  headline: string;
  detail: string;
  statLine: string;
  ctaLabel: string;
  ctaHref: string;
}

export interface TodayCommunityStat {
  label: string;
  ticker: string;
  company: string;
  count: number;
  countLabel: string;
  note: string;
  tone: "positive" | "neutral" | "caution";
}

export interface TodayCommunityStats {
  headline: string;
  note: string;
  stats: TodayCommunityStat[];
}

export interface MarketSessionStatus {
  marketDate: string;
  isOpenDay: boolean;
  closureKind: "open" | "weekend" | "holiday";
  closureLabel: string;
  headline: string;
  detail: string;
  holidayName?: string;
}

export interface OpeningRecheckTickerInsight {
  scanKey: string;
  signalDate: string;
  status: Exclude<OpeningRecheckStatus, "pending">;
  statusLabel: string;
  statusDescription: string;
  suggestedStatus?: Exclude<OpeningRecheckStatus, "pending">;
  suggestedStatusLabel?: string;
  gapLabel?: string;
  confirmationLabel?: string;
  actionLabel?: string;
  note?: string;
  outcome?: OpeningRecheckReviewOutcome;
  outcomeLabel?: string;
  outcomeNote: string;
  matchedBy: "signal_date" | "latest_ticker";
}

export type TodayActionBoardStatus = "buy_review" | "watch" | "avoid" | "excluded" | "pending";

export interface TodayActionBoardSectorLoad {
  sector: string;
  count: number;
}

export interface PortfolioProfilePosition {
  ticker: string;
  company: string;
  sector: string;
  quantity: number;
  averagePrice: number;
  enteredAt?: string;
  note?: string;
}

export interface PortfolioProfile {
  name: string;
  totalCapital: number;
  availableCash: number;
  maxRiskPerTradePercent: number;
  maxConcurrentPositions: number;
  sectorLimit: number;
  positions: PortfolioProfilePosition[];
  updatedAt: string;
  updatedBy: string;
}

export type PortfolioTradeEventType =
  | "buy"
  | "add"
  | "take_profit_partial"
  | "exit_full"
  | "stop_loss"
  | "manual_exit";

export interface PortfolioTradeEvent {
  id: string;
  ticker: string;
  company: string;
  sector: string;
  type: PortfolioTradeEventType;
  quantity: number;
  price: number;
  fees?: number;
  tradedAt: string;
  note?: string;
  createdAt: string;
  createdBy: string;
}

export interface PortfolioJournal {
  events: PortfolioTradeEvent[];
  updatedAt: string;
  updatedBy: string;
}

export interface PortfolioCloseReviewEntry {
  positionKey: string;
  ticker: string;
  closedAt: string;
  strengthsNote?: string;
  watchoutsNote?: string;
  nextRuleNote?: string;
  updatedAt: string;
  updatedBy: string;
}

export interface PortfolioPersonalRuleEntry {
  id: string;
  text: string;
  sourceCategory: "strengths" | "watchouts" | "next_rule";
  sourceLabel: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export type PositionSizingLimitSource = "risk_budget" | "slot_budget" | "cash_budget";

export interface PositionSizingPlan {
  entryReferencePrice: number;
  stopDistancePrice: number;
  stopDistancePercent: number;
  riskBudget: number;
  suggestedQuantity: number;
  suggestedCapital: number;
  suggestedWeightPercent: number;
  maxLossAmount: number;
  limitSource: PositionSizingLimitSource;
  limitLabel: string;
  note: string;
}

export interface TodayActionBoardItem {
  ticker: string;
  company: string;
  sector: string;
  signalTone: SignalTone;
  featuredRank?: number;
  candidateScore?: number;
  activationScore?: number;
  actionBucket?: RecommendationActionBucket;
  tradePlan?: RecommendationTradePlan;
  openingRecheck?: OpeningRecheckDecision;
  boardStatus: TodayActionBoardStatus;
  boardReason: string;
  portfolioNote?: string;
}

export interface TodayActionBoardSummary {
  headline: string;
  note: string;
  maxNewPositions: number;
  remainingNewPositions: number;
  activeHoldingCount: number;
  remainingPortfolioSlots: number;
  sectorLimit: number;
  crowdedSectors: TodayActionBoardSectorLoad[];
  buyReviewCount: number;
  watchCount: number;
  avoidCount: number;
  excludedCount: number;
  pendingCount: number;
  portfolioProfileName?: string;
  availableCash?: number;
  riskBudgetPerTrade?: number;
}

export interface TodayActionBoardSection {
  status: TodayActionBoardStatus;
  label: string;
  description: string;
  count: number;
  items: TodayActionBoardItem[];
}

export interface TodayActionBoard {
  summary: TodayActionBoardSummary;
  sections: TodayActionBoardSection[];
  items: TodayActionBoardItem[];
}

export type HoldingActionStatus =
  | "exit_review"
  | "take_profit"
  | "tighten_stop"
  | "time_stop_review"
  | "hold";

export interface HoldingActionItem {
  ticker: string;
  company: string;
  sector: string;
  signalTone?: SignalTone;
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
  actionStatus: HoldingActionStatus;
  actionLabel: string;
  actionSummary: string;
  actionReason: string;
  nextAction: string;
  guardLabel: string;
  tradePlan?: RecommendationTradePlan;
}

export interface HoldingActionSummary {
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

export interface HoldingActionSection {
  status: HoldingActionStatus;
  label: string;
  description: string;
  count: number;
  items: HoldingActionItem[];
}

export interface HoldingActionBoard {
  summary: HoldingActionSummary;
  sections: HoldingActionSection[];
  items: HoldingActionItem[];
}

export interface RecommendationTradePlan {
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
  positionSizing?: PositionSizingPlan;
}

export interface RankChangeSummary {
  currentRank: number;
  previousRank?: number | null;
  delta?: number | null;
  trend: "new" | "up" | "down" | "same";
  consecutiveAppearances: number;
  totalAppearances: number;
}

export interface Recommendation {
  ticker: string;
  company: string;
  sector: string;
  signalTone: SignalTone;
  score: number;
  activationScore?: number;
  signalLabel: string;
  rationale: string;
  invalidation: string;
  invalidationDistance: number;
  riskRewardRatio: string;
  validationSummary: string;
  validationBasis?: ValidationBasis;
  checkpoints: string[];
  validation: ValidationStats;
  observationWindow: string;
  updatedAt: string;
  featuredRank?: number;
  candidateScore?: number;
  eventCoverage?: string;
  candidateBatch?: number;
  trackingDiagnostic?: TrackingDiagnostic;
  validationInsight?: ValidationInsight;
  actionBucket?: RecommendationActionBucket;
  tradePlan?: RecommendationTradePlan;
}
