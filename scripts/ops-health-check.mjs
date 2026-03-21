import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { loadLocalEnv } from "./load-env.mjs";
import { persistRuntimeDocument } from "./lib/runtime-document-store.mjs";
import { getRuntimePaths } from "./lib/runtime-paths.mjs";

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

loadLocalEnv(projectRoot);

function getDataDir() {
  return process.env.SWING_RADAR_DATA_DIR
    ? path.resolve(process.env.SWING_RADAR_DATA_DIR)
    : getRuntimePaths(projectRoot).liveDir;
}

function getOpsReportPath() {
  return process.env.SWING_RADAR_OPS_REPORT_PATH
    ? path.resolve(process.env.SWING_RADAR_OPS_REPORT_PATH)
    : path.join(getRuntimePaths(projectRoot).opsDir, "latest-health-check.json");
}

function parsePositiveInt(value, fallback) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function getPolicy() {
  const warningMinutes = parsePositiveInt(process.env.SWING_RADAR_STALE_WARNING_MINUTES, 180);
  const requestedCriticalMinutes = parsePositiveInt(process.env.SWING_RADAR_STALE_CRITICAL_MINUTES, 360);

  return {
    stale: {
      warningMinutes,
      criticalMinutes: Math.max(requestedCriticalMinutes, warningMinutes)
    }
  };
}

function parseArgs(argv) {
  const options = {
    autoRecover: false,
    skipIngest: false,
    help: false
  };

  for (const arg of argv) {
    if (arg === "--help") {
      options.help = true;
      continue;
    }
    if (arg === "--auto-recover") {
      options.autoRecover = true;
      continue;
    }
    if (arg === "--skip-ingest") {
      options.skipIngest = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printHelp() {
  console.log(`
SWING-RADAR ops health check

Usage:
  node scripts/ops-health-check.mjs [--auto-recover] [--skip-ingest]

Options:
  --auto-recover   Run external refresh pipeline when stale data is detected
  --skip-ingest    Skip PostgreSQL ingest during auto recovery
  --help           Show this message
`);
}

async function readJson(filename) {
  const content = await readFile(path.join(getDataDir(), filename), "utf8");
  return JSON.parse(content);
}

function buildIndicator(label, generatedAt, thresholds) {
  const ageMinutes = Math.max(0, Math.round((Date.now() - new Date(generatedAt).getTime()) / 60000));

  let severity = "ok";
  if (ageMinutes >= thresholds.criticalMinutes) {
    severity = "critical";
  } else if (ageMinutes >= thresholds.warningMinutes) {
    severity = "warning";
  }

  return {
    label,
    generatedAt,
    ageMinutes,
    stale: severity !== "ok",
    severity
  };
}

async function runNodeScript(scriptName) {
  const startedAt = Date.now();
  await execFileAsync(process.execPath, [path.join(projectRoot, "scripts", scriptName)], {
    cwd: projectRoot,
    env: process.env
  });
  return Date.now() - startedAt;
}

async function buildSnapshotHealth() {
  const thresholds = getPolicy().stale;
  const [recommendations, analysis, tracking] = await Promise.all([
    readJson("recommendations.json"),
    readJson("analysis.json"),
    readJson("tracking.json")
  ]);

  const freshness = [
    buildIndicator("recommendations", recommendations.generatedAt, thresholds),
    buildIndicator("analysis", analysis.generatedAt, thresholds),
    buildIndicator("tracking", tracking.generatedAt, thresholds)
  ];

  const warnings = freshness
    .filter((item) => item.stale)
    .map((item) => `${item.label} snapshot is ${item.ageMinutes} minutes old (${item.severity})`);

  return {
    status: warnings.length ? "warning" : "ok",
    freshness,
    warnings
  };
}

async function writeReport(report) {
  const reportPath = getOpsReportPath();
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await persistRuntimeDocument("ops-health-report", report, { logPrefix: "ops-health-report" });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const initialHealth = await buildSnapshotHealth();
  const report = {
    checkedAt: new Date().toISOString(),
    mode: options.autoRecover ? "auto-recover" : "check-only",
    initialHealth,
    recovery: null,
    finalHealth: initialHealth
  };

  if (initialHealth.warnings.length && options.autoRecover) {
    const timings = {
      refreshExternalMs: await runNodeScript("refresh-external-pipeline.mjs"),
      ingestPostgresMs: null
    };

    if (!options.skipIngest) {
      timings.ingestPostgresMs = await runNodeScript("ingest-postgres.mjs");
    }

    report.recovery = {
      attempted: true,
      timings
    };
    report.finalHealth = await buildSnapshotHealth();
  }

  await writeReport(report);

  console.log(`Ops health check completed.`);
  console.log(`- report: ${getOpsReportPath()}`);
  console.log(`- initialStatus: ${report.initialHealth.status}`);
  console.log(`- finalStatus: ${report.finalHealth.status}`);
  console.log(`- warnings: ${report.finalHealth.warnings.length}`);

  const hasCritical = report.finalHealth.freshness.some((item) => item.severity === "critical");
  if (hasCritical) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Ops health check failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
