import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { loadLocalEnv } from "./load-env.mjs";
import { persistRuntimeDocument, readRuntimeDocument } from "./lib/runtime-document-store.mjs";
import { getRuntimePaths } from "./lib/runtime-paths.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

loadLocalEnv(projectRoot);

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function getPolicy() {
  return {
    newsLiveFetchWarningPercent: parsePositiveInt(process.env.SWING_RADAR_NEWS_LIVE_FETCH_WARNING_PERCENT, 70),
    newsLiveFetchCriticalPercent: parsePositiveInt(process.env.SWING_RADAR_NEWS_LIVE_FETCH_CRITICAL_PERCENT, 40),
    validationFallbackWarningPercent: parsePositiveInt(process.env.SWING_RADAR_VALIDATION_FALLBACK_WARNING_PERCENT, 50),
    validationFallbackCriticalPercent: parsePositiveInt(process.env.SWING_RADAR_VALIDATION_FALLBACK_CRITICAL_PERCENT, 80)
  };
}

async function readJson(filePath, fallback) {
  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content.replace(/^\uFEFF/, ""));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

async function readReportPayload(filePath, documentName, fallback) {
  try {
    const fromFile = await readJson(filePath, null);
    if (fromFile !== null) {
      return fromFile;
    }
  } catch (error) {
    console.warn(
      `[threshold-advice-report] Falling back to runtime document ${documentName}: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  const fromRuntimeDocument = await readRuntimeDocument(documentName);
  return fromRuntimeDocument ?? fallback;
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function buildRecommendations({ history, newsFetchReport, snapshotGenerationReport, policy }) {
  const recommendations = [];
  const sampleSize = history.length;
  const averageWarningIncidents =
    sampleSize > 0 ? history.reduce((sum, item) => sum + (item.incidents?.warningCount ?? 0), 0) / sampleSize : 0;
  const averageCriticalIncidents =
    sampleSize > 0 ? history.reduce((sum, item) => sum + (item.incidents?.criticalCount ?? 0), 0) / sampleSize : 0;
  const averageAuditFailures =
    sampleSize > 0 ? history.reduce((sum, item) => sum + (item.audits?.failureCount ?? 0), 0) / sampleSize : 0;

  const latestLiveFetchPercent =
    newsFetchReport && newsFetchReport.totalTickers > 0
      ? Math.round((newsFetchReport.liveFetchTickers / newsFetchReport.totalTickers) * 100)
      : null;

  const latestValidationFallbackCount = snapshotGenerationReport?.validationFallbackCount ?? null;
  const latestValidationFallbackPercent =
    snapshotGenerationReport && snapshotGenerationReport.totalTickers > 0
      ? Math.round((snapshotGenerationReport.validationFallbackCount / snapshotGenerationReport.totalTickers) * 100)
      : null;

  if (latestLiveFetchPercent !== null && averageCriticalIncidents === 0 && latestLiveFetchPercent >= policy.newsLiveFetchWarningPercent + 15) {
    recommendations.push({
      key: "newsLiveFetchWarningPercent",
      currentValue: policy.newsLiveFetchWarningPercent,
      suggestedValue: clamp(policy.newsLiveFetchWarningPercent + 5, policy.newsLiveFetchCriticalPercent + 5, 95),
      reason: "Recent live fetch quality stayed comfortably above the warning line without critical incidents."
    });
  } else if (latestLiveFetchPercent !== null && latestLiveFetchPercent <= policy.newsLiveFetchCriticalPercent + 5) {
    recommendations.push({
      key: "newsLiveFetchWarningPercent",
      currentValue: policy.newsLiveFetchWarningPercent,
      suggestedValue: clamp(policy.newsLiveFetchWarningPercent - 5, policy.newsLiveFetchCriticalPercent + 5, 95),
      reason: "Recent live fetch quality is frequently close to the critical line, so the warning line may be too loose."
    });
  }

  if (latestValidationFallbackPercent !== null && latestValidationFallbackPercent <= 10 && averageWarningIncidents <= 1) {
    recommendations.push({
      key: "validationFallbackWarningPercent",
      currentValue: policy.validationFallbackWarningPercent,
      suggestedValue: Math.min(95, policy.validationFallbackWarningPercent + 5),
      reason: "Validation fallback stayed low, so the warning line may be tighter than necessary."
    });
  } else if (
    latestValidationFallbackPercent !== null &&
    latestValidationFallbackPercent >= policy.validationFallbackWarningPercent &&
    averageAuditFailures > 0
  ) {
    recommendations.push({
      key: "validationFallbackCriticalPercent",
      currentValue: policy.validationFallbackCriticalPercent,
      suggestedValue: Math.max(policy.validationFallbackWarningPercent + 5, policy.validationFallbackCriticalPercent - 5),
      reason: "Validation fallback stays high together with audit failures, so critical escalation may need to happen sooner."
    });
  }

  return {
    observations: {
      averageWarningIncidents: round1(averageWarningIncidents),
      averageCriticalIncidents: round1(averageCriticalIncidents),
      averageAuditFailures: round1(averageAuditFailures),
      latestLiveFetchPercent,
      latestValidationFallbackCount,
      latestValidationFallbackPercent
    },
    recommendations
  };
}

async function main() {
  const opsDir = getRuntimePaths(projectRoot).opsDir;
  const historyPath = process.env.SWING_RADAR_POST_LAUNCH_HISTORY_PATH
    ? path.resolve(process.env.SWING_RADAR_POST_LAUNCH_HISTORY_PATH)
    : path.join(opsDir, "post-launch-history.json");
  const newsFetchPath = process.env.SWING_RADAR_NEWS_FETCH_REPORT_PATH
    ? path.resolve(process.env.SWING_RADAR_NEWS_FETCH_REPORT_PATH)
    : path.join(opsDir, "latest-news-fetch.json");
  const snapshotGenerationPath = process.env.SWING_RADAR_SNAPSHOT_GENERATION_REPORT_PATH
    ? path.resolve(process.env.SWING_RADAR_SNAPSHOT_GENERATION_REPORT_PATH)
    : path.join(opsDir, "latest-snapshot-generation.json");
  const outputPath = process.env.SWING_RADAR_THRESHOLD_ADVICE_PATH
    ? path.resolve(process.env.SWING_RADAR_THRESHOLD_ADVICE_PATH)
    : path.join(opsDir, "latest-threshold-advice.json");

  const [history, newsFetchReport, snapshotGenerationReport] = await Promise.all([
    readReportPayload(historyPath, "ops-post-launch-history", []),
    readReportPayload(newsFetchPath, "ops-news-fetch-report", null),
    readReportPayload(snapshotGenerationPath, "ops-snapshot-generation-report", null)
  ]);

  const policy = getPolicy();
  const result = buildRecommendations({
    history: Array.isArray(history) ? history : [],
    newsFetchReport,
    snapshotGenerationReport,
    policy
  });

  const report = {
    generatedAt: new Date().toISOString(),
    sampleSize: Array.isArray(history) ? history.length : 0,
    currentPolicy: policy,
    observations: result.observations,
    recommendations: result.recommendations
  };

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await persistRuntimeDocument("ops-threshold-advice-report", report, { logPrefix: "threshold-advice-report" });

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
