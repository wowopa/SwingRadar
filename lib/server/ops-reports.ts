import { readFile } from "node:fs/promises";
import path from "node:path";

function resolveProjectRoot() {
  return process.cwd();
}

function getOpsHealthReportPath() {
  return process.env.SWING_RADAR_OPS_REPORT_PATH
    ? path.resolve(process.env.SWING_RADAR_OPS_REPORT_PATH)
    : path.join(resolveProjectRoot(), "data", "ops", "latest-health-check.json");
}

function getDailyCycleReportPath() {
  return process.env.SWING_RADAR_DAILY_CYCLE_REPORT_PATH
    ? path.resolve(process.env.SWING_RADAR_DAILY_CYCLE_REPORT_PATH)
    : path.join(resolveProjectRoot(), "data", "ops", "latest-daily-cycle.json");
}

function getAutoHealReportPath() {
  return process.env.SWING_RADAR_AUTO_HEAL_REPORT_PATH
    ? path.resolve(process.env.SWING_RADAR_AUTO_HEAL_REPORT_PATH)
    : path.join(resolveProjectRoot(), "data", "ops", "latest-auto-heal.json");
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content.replace(/^\uFEFF/, "")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
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

export async function loadOpsHealthCheckReport() {
  return readJsonFile<OpsHealthCheckReport>(getOpsHealthReportPath());
}

export async function loadDailyCycleReport() {
  return readJsonFile<DailyCycleReport>(getDailyCycleReportPath());
}

export async function loadAutoHealReport() {
  return readJsonFile<AutoHealReport>(getAutoHealReportPath());
}
