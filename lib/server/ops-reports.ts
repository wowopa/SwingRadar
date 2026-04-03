import { readFile } from "node:fs/promises";
import path from "node:path";
import { getRuntimePaths } from "@/lib/server/runtime-paths";
import { loadRuntimeDocument, saveRuntimeDocument } from "@/lib/server/runtime-documents";

function resolveProjectRoot() {
  return process.cwd();
}

function getOpsHealthReportPath() {
  return process.env.SWING_RADAR_OPS_REPORT_PATH
    ? path.resolve(process.env.SWING_RADAR_OPS_REPORT_PATH)
    : path.join(getRuntimePaths(resolveProjectRoot()).opsDir, "latest-health-check.json");
}

function getDailyCycleReportPath() {
  return process.env.SWING_RADAR_DAILY_CYCLE_REPORT_PATH
    ? path.resolve(process.env.SWING_RADAR_DAILY_CYCLE_REPORT_PATH)
    : path.join(getRuntimePaths(resolveProjectRoot()).opsDir, "latest-daily-cycle.json");
}

function getAutoHealReportPath() {
  return process.env.SWING_RADAR_AUTO_HEAL_REPORT_PATH
    ? path.resolve(process.env.SWING_RADAR_AUTO_HEAL_REPORT_PATH)
    : path.join(getRuntimePaths(resolveProjectRoot()).opsDir, "latest-auto-heal.json");
}

function getNewsFetchReportPath() {
  return process.env.SWING_RADAR_NEWS_FETCH_REPORT_PATH
    ? path.resolve(process.env.SWING_RADAR_NEWS_FETCH_REPORT_PATH)
    : path.join(getRuntimePaths(resolveProjectRoot()).opsDir, "latest-news-fetch.json");
}

function getSnapshotGenerationReportPath() {
  return process.env.SWING_RADAR_SNAPSHOT_GENERATION_REPORT_PATH
    ? path.resolve(process.env.SWING_RADAR_SNAPSHOT_GENERATION_REPORT_PATH)
    : path.join(getRuntimePaths(resolveProjectRoot()).opsDir, "latest-snapshot-generation.json");
}

function getPostLaunchHistoryPath() {
  return process.env.SWING_RADAR_POST_LAUNCH_HISTORY_PATH
    ? path.resolve(process.env.SWING_RADAR_POST_LAUNCH_HISTORY_PATH)
    : path.join(getRuntimePaths(resolveProjectRoot()).opsDir, "post-launch-history.json");
}

function getThresholdAdvicePath() {
  return process.env.SWING_RADAR_THRESHOLD_ADVICE_PATH
    ? path.resolve(process.env.SWING_RADAR_THRESHOLD_ADVICE_PATH)
    : path.join(getRuntimePaths(resolveProjectRoot()).opsDir, "latest-threshold-advice.json");
}

function getRuntimeStorageReportPath() {
  return process.env.SWING_RADAR_RUNTIME_STORAGE_REPORT_PATH
    ? path.resolve(process.env.SWING_RADAR_RUNTIME_STORAGE_REPORT_PATH)
    : path.join(getRuntimePaths(resolveProjectRoot()).opsDir, "latest-runtime-storage.json");
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content.replace(/^\uFEFF/, "")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    if (error instanceof SyntaxError) {
      console.warn(`[ops-reports] Invalid JSON report ignored: ${filePath}`, error.message);
      return null;
    }

    throw error;
  }
}

async function readJsonFileOrRuntimeDocument<T>(filePath: string, documentName: string) {
  const runtimePayload = await loadRuntimeDocument<T>(documentName);
  if (runtimePayload) {
    return runtimePayload;
  }

  return readJsonFile<T>(filePath);
}

export type OpsHealthCheckReport = {
  checkedAt: string;
  mode: "check-only" | "auto-recover";
  initialHealth: {
    status: "ok" | "warning";
    warnings: string[];
  };
  recovery: {
    attempted: boolean;
    timings: {
      refreshExternalMs: number;
      ingestPostgresMs: number | null;
    };
  } | null;
  finalHealth: {
    status: "ok" | "warning";
    warnings: string[];
  };
};

export type DailyCycleReport = {
  startedAt: string;
  completedAt: string | null;
  status: "ok" | "warning" | "failed" | "running";
  steps: Array<{
    name: string;
    status: "running" | "completed" | "failed";
    startedAt: string;
    completedAt?: string;
    durationMs: number | null;
    error: string | null;
  }>;
  summary: {
    generatedAt: string | null;
    topCandidateCount: number;
    totalBatches: number;
    succeededBatches: number;
    failedBatchCount: number;
    batchSize: number | null;
  } | null;
  error: string | null;
};

export type AutoHealReport = {
  startedAt: string;
  completedAt: string | null;
  status: "ok" | "warning" | "failed" | "running";
  triggers: string[];
  actions: Array<{
    name: string;
    status: "skipped" | "completed" | "failed";
    startedAt: string;
    completedAt?: string;
    durationMs: number | null;
    detail: string;
    error: string | null;
  }>;
  error: string | null;
};

export type NewsFetchReport = {
  startedAt: string;
  completedAt: string | null;
  providerOrder: string[];
  requestedProvider: string;
  totalTickers: number;
  liveFetchTickers: number;
  cacheFallbackTickers: number;
  fileFallbackTickers: number;
  retryCount: number;
  providerFailures: Array<{
    ticker: string;
    provider: string;
    status: number | null;
    attempt: number | null;
    delayMs: number | null;
    url: string | null;
    phase: string;
    message?: string;
  }>;
  totalItems: number;
};

export type SnapshotGenerationReport = {
  startedAt: string;
  completedAt: string;
  generatedAt: string;
  totalTickers: number;
  recommendationCount: number;
  analysisCount: number;
  trackingHistoryCount: number;
  validationFallbackCount: number;
  validationFallbackTickers: string[];
  validationBasisCounts?: {
    measured: number;
    tracking?: number;
    sector: number;
    pattern: number;
    heuristic: number;
  };
};

export type PostLaunchHistoryEntry = {
  checkedAt: string;
  healthStatus: string;
  overallStatus: string;
  dailyTaskRegistered: boolean;
  autoHealTaskRegistered: boolean;
  incidents: {
    criticalCount: number;
    warningCount: number;
  };
  audits: {
    total: number;
    failureCount: number;
    warningCount: number;
  };
};

export type ThresholdAdviceReport = {
  generatedAt: string;
  sampleSize: number;
  currentPolicy: {
    newsLiveFetchWarningPercent: number;
    newsLiveFetchCriticalPercent: number;
    validationFallbackWarningPercent: number;
    validationFallbackCriticalPercent: number;
  };
  observations: {
    averageWarningIncidents: number;
    averageCriticalIncidents: number;
    averageAuditFailures: number;
    latestLiveFetchPercent: number | null;
    latestValidationFallbackCount: number | null;
    latestValidationFallbackPercent: number | null;
  };
  recommendations: Array<{
    key: string;
    currentValue: number;
    suggestedValue: number;
    reason: string;
  }>;
};

export type RuntimeStorageSection = {
  path: string;
  exists: boolean;
  fileCount: number;
  dirCount: number;
  sizeBytes: number;
  sizeLabel: string;
  newestMtime: string | null;
};

export type RuntimeStorageReport = {
  generatedAt: string;
  runtimeRoot: string;
  totalSizeBytes: number;
  totalSizeLabel: string;
  totalFiles: number;
  sections: Record<string, RuntimeStorageSection>;
  metadata?: Record<string, unknown>;
};

export async function loadOpsHealthCheckReport() {
  return readJsonFileOrRuntimeDocument<OpsHealthCheckReport>(getOpsHealthReportPath(), "ops-health-report");
}

export async function loadDailyCycleReport() {
  return readJsonFileOrRuntimeDocument<DailyCycleReport>(getDailyCycleReportPath(), "ops-daily-cycle-report");
}

export async function loadAutoHealReport() {
  return readJsonFileOrRuntimeDocument<AutoHealReport>(getAutoHealReportPath(), "ops-auto-heal-report");
}

export async function loadNewsFetchReport() {
  return readJsonFileOrRuntimeDocument<NewsFetchReport>(getNewsFetchReportPath(), "ops-news-fetch-report");
}

export async function loadSnapshotGenerationReport() {
  return readJsonFileOrRuntimeDocument<SnapshotGenerationReport>(
    getSnapshotGenerationReportPath(),
    "ops-snapshot-generation-report"
  );
}

export async function loadPostLaunchHistory() {
  const payload = await readJsonFileOrRuntimeDocument<PostLaunchHistoryEntry[] | PostLaunchHistoryEntry>(
    getPostLaunchHistoryPath(),
    "ops-post-launch-history"
  );

  if (!payload) {
    return null;
  }

  return Array.isArray(payload) ? payload : [payload];
}

export async function loadThresholdAdviceReport() {
  return readJsonFileOrRuntimeDocument<ThresholdAdviceReport>(
    getThresholdAdvicePath(),
    "ops-threshold-advice-report"
  );
}

export async function loadRuntimeStorageReport() {
  return readJsonFileOrRuntimeDocument<RuntimeStorageReport>(
    getRuntimeStorageReportPath(),
    "ops-runtime-storage-report"
  );
}

export async function appendPostLaunchHistoryEntry(
  entry: PostLaunchHistoryEntry,
  options?: { maxEntries?: number }
) {
  const current = (await loadPostLaunchHistory()) ?? [];
  const maxEntries = options?.maxEntries ?? 20;
  const entryDate = entry.checkedAt.slice(0, 10);

  const next = [...current.filter((item) => item.checkedAt.slice(0, 10) !== entryDate), entry]
    .sort((left, right) => new Date(left.checkedAt).getTime() - new Date(right.checkedAt).getTime())
    .slice(-maxEntries);

  await saveRuntimeDocument("ops-post-launch-history", next);
  return next;
}
