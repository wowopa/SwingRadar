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

export interface OpeningRecheckDecision {
  status: OpeningRecheckStatus;
  updatedAt: string;
  updatedBy?: string;
  note?: string;
}

export type TodayActionBoardStatus = "buy_review" | "watch" | "avoid" | "excluded" | "pending";

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
}

export interface TodayActionBoardSummary {
  headline: string;
  note: string;
  maxNewPositions: number;
  remainingNewPositions: number;
  buyReviewCount: number;
  watchCount: number;
  avoidCount: number;
  excludedCount: number;
  pendingCount: number;
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
