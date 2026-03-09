import { readFile } from "node:fs/promises";
import path from "node:path";

export type DailyCandidate = {
  batch: number;
  ticker: string;
  company: string;
  sector: string;
  signalTone: "긍정" | "중립" | "주의";
  score: number;
  candidateScore: number;
  currentPrice?: number | null;
  averageTurnover20?: number | null;
  liquidityRating?: string;
  invalidation: string;
  validationSummary: string;
  observationWindow: string;
  rationale: string;
  eventCoverage: string;
};

export type FailedUniverseBatch = {
  ok: false;
  batch: number;
  count: number;
  errors: string[];
};

export type DailyCandidatesDocument = {
  generatedAt: string;
  batchSize: number;
  concurrency?: number;
  topCandidatesLimit?: number;
  totalTickers: number;
  totalBatches: number;
  succeededBatches: number;
  failedBatches: FailedUniverseBatch[];
  topCandidates: DailyCandidate[];
  batchSummaries: Array<{
    batch: number;
    count: number;
    generatedAt: string;
    topTicker: string | null;
    trackingRows: number;
    warnings?: string[];
  }>;
};

export type DailyCandidateHistoryEntry = {
  generatedAt: string;
  totalTickers: number;
  totalBatches: number;
  succeededBatches: number;
  failedBatchCount: number;
  topCandidatesLimit: number;
  topCandidates: DailyCandidate[];
};

export type DailyCandidateHistoryDocument = {
  runs: DailyCandidateHistoryEntry[];
};

function getDailyCandidatesPath() {
  return process.env.SWING_RADAR_DAILY_CANDIDATES_FILE
    ? path.resolve(process.env.SWING_RADAR_DAILY_CANDIDATES_FILE)
    : path.resolve(process.cwd(), "data", "universe", "daily-candidates.json");
}

function getDailyCandidatesHistoryPath() {
  return process.env.SWING_RADAR_DAILY_CANDIDATES_HISTORY_FILE
    ? path.resolve(process.env.SWING_RADAR_DAILY_CANDIDATES_HISTORY_FILE)
    : path.resolve(process.cwd(), "data", "universe", "daily-candidates-history.json");
}

export async function getDailyCandidates(): Promise<DailyCandidatesDocument | null> {
  try {
    const content = await readFile(getDailyCandidatesPath(), "utf8");
    return JSON.parse(content.replace(/^\uFEFF/, "")) as DailyCandidatesDocument;
  } catch {
    return null;
  }
}

export async function getDailyCandidatesHistory(): Promise<DailyCandidateHistoryDocument | null> {
  try {
    const content = await readFile(getDailyCandidatesHistoryPath(), "utf8");
    return JSON.parse(content.replace(/^\uFEFF/, "")) as DailyCandidateHistoryDocument;
  } catch {
    return null;
  }
}
