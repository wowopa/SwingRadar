export type SignalTone = "긍정" | "중립" | "주의";

export interface ValidationStats {
  hitRate: number;
  avgReturn: number;
  sampleSize: number;
  maxDrawdown: number;
}

export interface Recommendation {
  ticker: string;
  company: string;
  sector: string;
  signalTone: SignalTone;
  score: number;
  signalLabel: string;
  rationale: string;
  invalidation: string;
  invalidationDistance: number;
  riskRewardRatio: string;
  validationSummary: string;
  checkpoints: string[];
  validation: ValidationStats;
  observationWindow: string;
  updatedAt: string;
  featuredRank?: number;
  candidateScore?: number;
  eventCoverage?: string;
  candidateBatch?: number;
}
