export type SignalTone = "긍정" | "중립" | "주의";

export interface ValidationStats {
  hitRate: number;
  avgReturn: number;
  sampleSize: number;
  maxDrawdown: number;
}

export type ValidationBasis = "실측 기반" | "공용 추적 참고" | "유사 업종 참고" | "유사 흐름 참고" | "보수 계산";

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
}
