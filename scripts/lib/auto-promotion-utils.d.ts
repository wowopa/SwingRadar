export interface AutoPromotionPolicy {
  enabled: boolean;
  lookbackRuns: number;
  minHistoryRuns: number;
  minAppearances: number;
  minConsecutiveAppearances: number;
  maxAverageRank: number;
  minBestRank: number;
  minAverageCandidateScore: number;
  minCurrentCandidateScore: number;
  minAverageTurnover20: number;
  minCurrentPrice: number;
  minAverageVolumeRatio: number;
  minCurrentVolumeRatio: number;
  maxPromotionsPerRun: number;
  allowedSignalTones: string[];
}

export interface PromotionMetrics {
  appearanceCount: number;
  consecutiveRecentAppearances: number;
  averageRank: number | null;
  bestRank: number | null;
  averageCandidateScore: number | null;
  averageTurnover20: number | null;
  averageVolumeRatio: number | null;
  latestRank: number | null;
  latestCandidateScore: number | null;
  latestCurrentPrice: number | null;
  latestVolumeRatio: number | null;
  latestSignalTone: string | null;
}

export function getAutoPromotionPolicy(env?: Record<string, string | undefined>): AutoPromotionPolicy;
export function buildPromotionMetrics(runs: Array<{ generatedAt: string; topCandidates: Array<Record<string, unknown>> }>, ticker: string): PromotionMetrics;
export function evaluateAutoPromotionCandidate(
  candidate: Record<string, unknown>,
  metrics: PromotionMetrics,
  policy: AutoPromotionPolicy
): { qualifies: boolean; reasons: string[] };
