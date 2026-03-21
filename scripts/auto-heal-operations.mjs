import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import pg from "pg";

import { loadLocalEnv } from "./load-env.mjs";
import { persistRuntimeDocument, readRuntimeDocument } from "./lib/runtime-document-store.mjs";

const { Client } = pg;
const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

loadLocalEnv(projectRoot);

function printHelp() {
  console.log(`
SWING-RADAR automated incident recovery

Usage:
  node scripts/auto-heal-operations.mjs [--skip-ingest] [--skip-daily-cycle] [--force]

Options:
  --skip-ingest       Skip PostgreSQL ingest during recovery actions
  --skip-daily-cycle  Skip daily universe cycle rerun
  --force             Run recovery actions even when no trigger is detected
  --help              Show this message

Environment:
  SWING_RADAR_OPS_REPORT_PATH
  SWING_RADAR_DAILY_CYCLE_REPORT_PATH
  SWING_RADAR_AUTO_HEAL_REPORT_PATH
  SWING_RADAR_AUTO_HEAL_SYNC_SYMBOLS=true
  SWING_RADAR_UNIVERSE_MARKETS
  SWING_RADAR_UNIVERSE_BATCH_SIZE
`);
}

function parseArgs(argv) {
  const options = {
    skipIngest: false,
    skipDailyCycle: false,
    force: false,
    help: false
  };

  for (const arg of argv) {
    if (arg === "--help") {
      options.help = true;
      continue;
    }
    if (arg === "--skip-ingest") {
      options.skipIngest = true;
      continue;
    }
    if (arg === "--skip-daily-cycle") {
      options.skipDailyCycle = true;
      continue;
    }
    if (arg === "--force") {
      options.force = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function getPathFromEnv(envKey, fallbackName) {
  return process.env[envKey] ? path.resolve(process.env[envKey]) : path.join(projectRoot, "data", "ops", fallbackName);
}

function getOpsHealthReportPath() {
  return getPathFromEnv("SWING_RADAR_OPS_REPORT_PATH", "latest-health-check.json");
}

function getDailyCycleReportPath() {
  return getPathFromEnv("SWING_RADAR_DAILY_CYCLE_REPORT_PATH", "latest-daily-cycle.json");
}

function getAutoHealReportPath() {
  return getPathFromEnv("SWING_RADAR_AUTO_HEAL_REPORT_PATH", "latest-auto-heal.json");
}

async function readJsonFile(filePath) {
  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content.replace(/^\uFEFF/, ""));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function readReportPayload(filePath, documentName) {
  try {
    const fromFile = await readJsonFile(filePath);
    if (fromFile) {
      return fromFile;
    }
  } catch (error) {
    console.warn(
      `[auto-heal-report] Falling back to runtime document ${documentName}: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  return readRuntimeDocument(documentName);
}

async function writeReport(report) {
  const reportPath = getAutoHealReportPath();
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await persistRuntimeDocument("ops-auto-heal-report", report, { logPrefix: "auto-heal-report" });
}

async function runNodeScript(scriptName, args = []) {
  const startedAt = Date.now();
  const { stdout, stderr } = await execFileAsync(process.execPath, [path.join(projectRoot, "scripts", scriptName), ...args], {
    cwd: projectRoot,
    env: process.env
  });

  if (stdout.trim()) {
    process.stdout.write(stdout);
  }
  if (stderr.trim()) {
    process.stderr.write(stderr);
  }

  return Date.now() - startedAt;
}

function startAction(name, detail) {
  return {
    name,
    status: "skipped",
    startedAt: new Date().toISOString(),
    durationMs: null,
    detail,
    error: null
  };
}

function completeAction(action, status, startedAt, error = null) {
  action.status = status;
  action.completedAt = new Date().toISOString();
  action.durationMs = Date.now() - startedAt;
  action.error = error;
}

async function runAction(report, name, detail, action) {
  const item = startAction(name, detail);
  report.actions.push(item);
  const startedAt = Date.now();

  try {
    await action();
    completeAction(item, "completed", startedAt);
  } catch (error) {
    completeAction(item, "failed", startedAt, error instanceof Error ? error.message : String(error));
    throw error;
  }
}

function buildTriggers(opsHealthReport, dailyCycleReport) {
  const triggers = [];

  if (!opsHealthReport) {
    triggers.push("ops-health-report-missing");
  } else if (opsHealthReport.finalHealth.status === "warning") {
    triggers.push("ops-health-warning");
  }

  if (!dailyCycleReport) {
    triggers.push("daily-cycle-report-missing");
  } else if (dailyCycleReport.status === "failed") {
    triggers.push("daily-cycle-failed");
  } else if (dailyCycleReport.status === "warning" || (dailyCycleReport.summary?.failedBatchCount ?? 0) > 0) {
    triggers.push("daily-cycle-warning");
  }

  return triggers;
}

function createRequestId() {
  return `auto-heal-${Date.now()}`;
}

async function recordAuditLog(report, requestId) {
  const payload = {
    eventType: "auto_heal_run",
    actor: "auto-heal-script",
    status:
      report.status === "failed"
        ? "failure"
        : report.status === "warning"
          ? "warning"
          : "success",
    requestId,
    summary:
      report.status === "failed"
        ? "Automated recovery run failed"
        : report.actions.length
          ? "Automated recovery run completed"
          : "Automated recovery run skipped",
    metadata: {
      startedAt: report.startedAt,
      completedAt: report.completedAt,
      triggers: report.triggers,
      actions: report.actions.map((item) => ({
        name: item.name,
        status: item.status,
        durationMs: item.durationMs,
        detail: item.detail,
        error: item.error
      })),
      error: report.error,
      reportPath: getAutoHealReportPath()
    }
  };

  if (!process.env.SWING_RADAR_DATABASE_URL) {
    console.info(JSON.stringify({ scope: "audit", ...payload, createdAt: new Date().toISOString() }));
    return;
  }

  const client = new Client({
    connectionString: process.env.SWING_RADAR_DATABASE_URL,
    ssl: process.env.SWING_RADAR_DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined
  });

  await client.connect();

  try {
    await client.query(
      `
      insert into audit_logs (event_type, actor, status, request_id, summary, metadata)
      values ($1, $2, $3, $4, $5, $6::jsonb)
      `,
      [payload.eventType, payload.actor, payload.status, payload.requestId, payload.summary, JSON.stringify(payload.metadata)]
    );
  } finally {
    await client.end();
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const requestId = createRequestId();
  const [opsHealthReport, dailyCycleReport] = await Promise.all([
    readReportPayload(getOpsHealthReportPath(), "ops-health-report"),
    readReportPayload(getDailyCycleReportPath(), "ops-daily-cycle-report")
  ]);

  const triggers = buildTriggers(opsHealthReport, dailyCycleReport);
  const report = {
    startedAt: new Date().toISOString(),
    completedAt: null,
    status: "running",
    triggers,
    actions: [],
    error: null
  };

  try {
    if (!triggers.length && !options.force) {
      report.status = "ok";
      report.completedAt = new Date().toISOString();
      await writeReport(report);
      await recordAuditLog(report, requestId);
      console.log("Auto heal skipped. No trigger detected.");
      console.log(`- report: ${getAutoHealReportPath()}`);
      return;
    }

    if (options.force || triggers.some((item) => item.startsWith("ops-health"))) {
      const args = ["--auto-recover"];
      if (options.skipIngest) {
        args.push("--skip-ingest");
      }
      await runAction(report, "ops-health-recovery", "stale snapshots or missing health report", () =>
        runNodeScript("ops-health-check.mjs", args)
      );
    }

    if (!options.skipDailyCycle && (options.force || triggers.some((item) => item.startsWith("daily-cycle")))) {
      const args = [];
      if (process.env.SWING_RADAR_AUTO_HEAL_SYNC_SYMBOLS !== "false") {
        args.push("--sync-symbols");
      }
      if (process.env.SWING_RADAR_UNIVERSE_MARKETS) {
        args.push("--markets", process.env.SWING_RADAR_UNIVERSE_MARKETS);
      }
      if (process.env.SWING_RADAR_UNIVERSE_BATCH_SIZE) {
        args.push("--batch-size", process.env.SWING_RADAR_UNIVERSE_BATCH_SIZE);
      }
      if (options.skipIngest) {
        args.push("--skip-ingest");
      }

      await runAction(report, "daily-cycle-rerun", "daily universe cycle warning or failure", () =>
        runNodeScript("run-daily-universe-cycle.mjs", args)
      );
    }

    report.status = report.actions.some((item) => item.status === "failed")
      ? "failed"
      : report.actions.length
        ? "ok"
        : "warning";
    report.completedAt = new Date().toISOString();
    await writeReport(report);
    await recordAuditLog(report, requestId);

    console.log("Auto heal completed.");
    console.log(`- triggers: ${report.triggers.join(", ") || "none"}`);
    console.log(`- actions: ${report.actions.length}`);
    console.log(`- report: ${getAutoHealReportPath()}`);
  } catch (error) {
    report.status = "failed";
    report.error = error instanceof Error ? error.message : String(error);
    report.completedAt = new Date().toISOString();
    await writeReport(report);
    await recordAuditLog(report, requestId);
    console.error("Auto heal failed.");
    console.error(report.error);
    console.error(`- report: ${getAutoHealReportPath()}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Auto heal failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
