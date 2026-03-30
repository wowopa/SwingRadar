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
}
