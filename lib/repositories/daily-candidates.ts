import { readFile } from "node:fs/promises";
import path from "node:path";
import { getPostgresPool } from "@/lib/server/postgres";
import { getRuntimePaths } from "@/lib/server/runtime-paths";

export type DailyCandidate = {
  batch: number;
  ticker: string;
  company: string;
  sector: string;
  signalTone: "긍정" | "중립" | "주의";
  score: number;
  candidateScore: number;
  activationScore?: number;
  currentPrice?: number | null;
  confirmationPrice?: number | null;
  expansionPrice?: number | null;
  invalidationPrice?: number | null;
  averageTurnover20?: number | null;
  volumeRatio?: number | null;
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
    : path.join(getRuntimePaths().universeDir, "daily-candidates.json");
}

function getDailyCandidatesHistoryPath() {
  return process.env.SWING_RADAR_DAILY_CANDIDATES_HISTORY_FILE
    ? path.resolve(process.env.SWING_RADAR_DAILY_CANDIDATES_HISTORY_FILE)
    : path.join(getRuntimePaths().universeDir, "daily-candidates-history.json");
}

async function readRuntimeDocument<T>(name: string): Promise<T | null> {
  try {
    const pool = getPostgresPool();
    const result = await pool.query<{ payload: T }>("select payload from runtime_documents where name = $1", [name]);
    return result.rows[0]?.payload ?? null;
  } catch {
    return null;
  }
}

export async function getDailyCandidates(): Promise<DailyCandidatesDocument | null> {
  try {
    const content = await readFile(getDailyCandidatesPath(), "utf8");
    return JSON.parse(content.replace(/^\uFEFF/, "")) as DailyCandidatesDocument;
  } catch {
    return await readRuntimeDocument<DailyCandidatesDocument>("daily-candidates");
  }
}

export async function getDailyCandidatesHistory(): Promise<DailyCandidateHistoryDocument | null> {
  try {
    const content = await readFile(getDailyCandidatesHistoryPath(), "utf8");
    return JSON.parse(content.replace(/^\uFEFF/, "")) as DailyCandidateHistoryDocument;
  } catch {
    return await readRuntimeDocument<DailyCandidateHistoryDocument>("daily-candidates-history");
  }
}
