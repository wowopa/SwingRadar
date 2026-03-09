export type SignalToneDto = "긍정" | "중립" | "주의";
export type ScenarioLabelDto = "기본" | "강세" | "약세";
export type RiskStatusDto = "양호" | "확인 필요" | "주의";
export type TrackingResultDto = "진행중" | "성공" | "실패" | "무효화";
export type ValidationBasisDto = "실측 기반" | "유사 업종 참고" | "유사 흐름 참고" | "보수 계산";

export interface RecommendationListItemDto {
  ticker: string;
  company: string;
  sector: string;
  signalTone: SignalToneDto;
  score: number;
  signalLabel: string;
  rationale: string;
  invalidation: string;
  invalidationDistance: number;
  riskRewardRatio: string;
  validationSummary: string;
  validationBasis?: ValidationBasisDto;
  checkpoints: string[];
  validation: {
    hitRate: number;
    avgReturn: number;
    sampleSize: number;
    maxDrawdown: number;
  };
  observationWindow: string;
  updatedAt: string;
  featuredRank?: number;
  candidateScore?: number;
  eventCoverage?: string;
  candidateBatch?: number;
}

export interface DailyCandidateDto {
  batch: number;
  ticker: string;
  company: string;
  sector: string;
  signalTone: SignalToneDto;
  score: number;
  candidateScore: number;
  invalidation: string;
  validationSummary: string;
  observationWindow: string;
  rationale: string;
  eventCoverage: string;
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
  totalTickers: number;
  totalBatches: number;
  succeededBatches: number;
  failedBatches: FailedUniverseBatchDto[];
  topCandidates: DailyCandidateDto[];
}

export interface RecommendationsResponseDto {
  generatedAt: string;
  items: RecommendationListItemDto[];
  dailyScan: DailyScanSummaryDto | null;
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
}

export interface AnalysisChartPointDto {
  label: string;
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
  headline: string;
  invalidation: string;
  analysisSummary: AnalysisSummaryMetricDto[];
  keyLevels: KeyLevelDto[];
  technicalIndicators: TechnicalIndicatorsDto;
  chartSeries: AnalysisChartPointDto[];
  decisionNotes: string[];
  scoreBreakdown: Array<{ label: string; score: number; description: string }>;
  scenarios: Array<{ label: ScenarioLabelDto; probability: number; expectation: string; trigger: string }>;
  riskChecklist: Array<{ label: string; status: RiskStatusDto; note: string }>;
  newsImpact: AnalysisEventDto[];
  dataQuality: Array<{ label: string; value: string; note: string }>;
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
  signalTone: SignalToneDto;
  entryScore: number;
  result: TrackingResultDto;
  mfe: number;
  mae: number;
  holdingDays: number;
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
  summary: string;
  invalidationReview: string;
  afterActionReview: string;
  reviewChecklist: string[];
  metrics: TrackingMetricDto[];
  chartSnapshot: Array<{ label: string; price: number }>;
  historicalNews: TrackingEventDto[];
  scoreLog: Array<{ timestamp: string; factor: string; delta: number; reason: string }>;
}

export interface TrackingResponseDto {
  generatedAt: string;
  history: SignalHistoryEntryDto[];
  details: Record<string, TrackingDetailDto>;
}
