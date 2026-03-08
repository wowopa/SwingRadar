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

function getDailyCandidatesPath() {
  return path.resolve(process.cwd(), "data", "universe", "daily-candidates.json");
}

export async function getDailyCandidates(): Promise<DailyCandidatesDocument | null> {
  try {
    const content = await readFile(getDailyCandidatesPath(), "utf8");
    return JSON.parse(content.replace(/^\uFEFF/, "")) as DailyCandidatesDocument;
  } catch {
    return null;
  }
}
