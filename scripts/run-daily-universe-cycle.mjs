import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { loadLocalEnv } from "./load-env.mjs";
import { persistRuntimeDocument } from "./lib/runtime-document-store.mjs";
import { getRuntimePaths } from "./lib/runtime-paths.mjs";
import { getRuntimeStorageReportPath, writeRuntimeStorageReport } from "./lib/runtime-storage-report.mjs";

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

loadLocalEnv(projectRoot);

function printHelp() {
  console.log(`
SWING-RADAR daily universe refresh

Usage:
  node scripts/run-daily-universe-cycle.mjs [--markets <KOSPI,KOSDAQ>] [--limit <number>] [--batch-size <number>] [--concurrency <number>] [--top-candidates <number>] [--skip-ingest] [--skip-prefetch] [--sync-symbols] [--auto-promote]

Environment:
  SWING_RADAR_UNIVERSE_MARKETS
  SWING_RADAR_UNIVERSE_LIMIT
  SWING_RADAR_UNIVERSE_BATCH_SIZE
  SWING_RADAR_UNIVERSE_CONCURRENCY
  SWING_RADAR_UNIVERSE_TOP_CANDIDATES
  SWING_RADAR_SYMBOL_SYNC_ENABLED=true
  SWING_RADAR_DAILY_CYCLE_REPORT_PATH
`);
}

function parseArgs(argv) {
  const options = {
    markets: process.env.SWING_RADAR_UNIVERSE_MARKETS ?? "KOSPI,KOSDAQ",
    limit: process.env.SWING_RADAR_UNIVERSE_LIMIT ?? "0",
    batchSize: process.env.SWING_RADAR_UNIVERSE_BATCH_SIZE ?? "20",
    concurrency: process.env.SWING_RADAR_UNIVERSE_CONCURRENCY ?? "1",
    topCandidates: process.env.SWING_RADAR_UNIVERSE_TOP_CANDIDATES ?? "100",
    skipIngest: false,
    skipPrefetch: false,
    syncSymbols: process.env.SWING_RADAR_SYMBOL_SYNC_ENABLED === "true",
    autoPromote: process.env.SWING_RADAR_AUTO_PROMOTION_ENABLED === "true",
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help") {
      options.help = true;
      continue;
    }
    if (arg === "--markets") {
      options.markets = argv[index + 1] ?? options.markets;
      index += 1;
      continue;
    }
    if (arg === "--limit") {
      options.limit = argv[index + 1] ?? options.limit;
      index += 1;
      continue;
    }
    if (arg === "--batch-size") {
      options.batchSize = argv[index + 1] ?? options.batchSize;
      index += 1;
      continue;
    }
    if (arg === "--concurrency") {
      options.concurrency = argv[index + 1] ?? options.concurrency;
      index += 1;
      continue;
    }
    if (arg === "--top-candidates") {
      options.topCandidates = argv[index + 1] ?? options.topCandidates;
      index += 1;
      continue;
    }
    if (arg === "--skip-ingest") {
      options.skipIngest = true;
      continue;
    }
    if (arg === "--skip-prefetch") {
      options.skipPrefetch = true;
      continue;
    }
    if (arg === "--sync-symbols") {
      options.syncSymbols = true;
      continue;
    }
    if (arg === "--auto-promote") {
      options.autoPromote = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function getDailyCandidatesPath() {
  return path.join(getRuntimePaths(projectRoot).universeDir, "daily-candidates.json");
}

function getReportPath() {
  return process.env.SWING_RADAR_DAILY_CYCLE_REPORT_PATH
    ? path.resolve(process.env.SWING_RADAR_DAILY_CYCLE_REPORT_PATH)
    : path.join(getRuntimePaths(projectRoot).opsDir, "latest-daily-cycle.json");
}

async function writeReport(report) {
  const reportPath = getReportPath();
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await persistRuntimeDocument("ops-daily-cycle-report", report, { logPrefix: "daily-cycle-report" });
}

async function runScript(scriptName, args) {
  const startedAt = Date.now();
  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    [path.join(projectRoot, "scripts", scriptName), ...args],
    {
      cwd: projectRoot,
      env: process.env
    }
  );

  if (stdout.trim()) {
    process.stdout.write(stdout);
  }
  if (stderr.trim()) {
    process.stderr.write(stderr);
  }

  return Date.now() - startedAt;
}

function startStep(name) {
  return {
    name,
    status: "running",
    startedAt: new Date().toISOString(),
    durationMs: null,
    error: null
  };
}

function finishStep(step, status, startedAt, error = null) {
  step.status = status;
  step.durationMs = Date.now() - startedAt;
  step.completedAt = new Date().toISOString();
  step.error = error;
}

async function runStep(report, name, action) {
  const step = startStep(name);
  report.steps.push(step);
  const startedAt = Date.now();

  try {
    const result = await action();
    finishStep(step, "completed", startedAt);
    return result;
  } catch (error) {
    finishStep(step, "failed", startedAt, error instanceof Error ? error.message : String(error));
    throw error;
  }
}

async function readDailyCandidatesSummary() {
  const document = JSON.parse((await readFile(getDailyCandidatesPath(), "utf8")).replace(/^\uFEFF/, ""));
  return {
    generatedAt: document.generatedAt ?? null,
    topCandidateCount: Array.isArray(document.topCandidates) ? document.topCandidates.length : 0,
    totalBatches: document.totalBatches ?? 0,
    succeededBatches: document.succeededBatches ?? 0,
    failedBatchCount: Array.isArray(document.failedBatches) ? document.failedBatches.length : 0,
    batchSize: document.batchSize ?? null
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const report = {
    startedAt: new Date().toISOString(),
    completedAt: null,
    status: "running",
    options,
    steps: [],
    summary: null,
    error: null
  };

  try {
    if (options.syncSymbols) {
      console.log("[daily-cycle] start: symbol master sync");
      await runStep(report, "symbol-sync", () => runScript("sync-symbol-master.mjs", []));
    }

    const watchlistArgs = [];
    if (options.markets) {
      watchlistArgs.push("--markets", options.markets);
    }
    if (options.limit && options.limit !== "0") {
      watchlistArgs.push("--limit", options.limit);
    }

    const scanArgs = [
      "--batch-size",
      options.batchSize,
      "--concurrency",
      options.concurrency,
      "--top-candidates",
      options.topCandidates,
      "--prefetched-raw-dir",
      getRuntimePaths(projectRoot).rawDir
    ];
    if (options.skipIngest) {
      scanArgs.push("--skip-ingest");
    }

    console.log("[daily-cycle] start: universe watchlist build");
    await runStep(report, "watchlist-build", () => runScript("build-universe-watchlist.mjs", watchlistArgs));

    if (!options.skipPrefetch) {
      console.log("[daily-cycle] start: input prefetch");
      await runStep(report, "input-prefetch", () => runScript("prepare-daily-inputs.mjs", ["--raw-dir", getRuntimePaths(projectRoot).rawDir]));
    }

    console.log("[daily-cycle] start: universe batch scan");
    await runStep(report, "universe-scan", () => runScript("scan-universe-batches.mjs", scanArgs));

    console.log("[daily-cycle] start: focused history append");
    await runStep(report, "focused-history", () => runScript("append-focused-history.mjs", []));

    if (options.autoPromote) {
      console.log("[daily-cycle] start: auto promotion review");
      await runStep(report, "auto-promotion", () => runScript("auto-promote-universe-candidates.mjs", ["--apply"]));
    }

    report.summary = await readDailyCandidatesSummary();
    report.status = report.summary.failedBatchCount > 0 ? "warning" : "ok";
    report.completedAt = new Date().toISOString();

    await writeReport(report);
    const storageReport = await writeRuntimeStorageReport(projectRoot, {
      pipeline: "daily-universe-cycle",
      status: report.status,
      generatedAt: report.summary.generatedAt
    });

    console.log(
      `[daily-cycle] completed: candidates ${report.summary.topCandidateCount}, succeeded batches ${report.summary.succeededBatches}/${report.summary.totalBatches}, failed batches ${report.summary.failedBatchCount}`
    );
    console.log(`[daily-cycle] report: ${getReportPath()}`);
    console.log(`[daily-cycle] runtimeStorage: ${getRuntimeStorageReportPath(projectRoot)} (${storageReport.totalSizeLabel})`);

    if (report.summary.failedBatchCount > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    report.status = "failed";
    report.error = error instanceof Error ? error.message : String(error);
    report.completedAt = new Date().toISOString();
    await writeReport(report);
    const storageReport = await writeRuntimeStorageReport(projectRoot, {
      pipeline: "daily-universe-cycle",
      status: report.status,
      error: report.error
    });
    console.error("[daily-cycle] failed", report.error);
    console.error(`[daily-cycle] report: ${getReportPath()}`);
    console.error(`[daily-cycle] runtimeStorage: ${getRuntimeStorageReportPath(projectRoot)} (${storageReport.totalSizeLabel})`);
    process.exitCode = 1;
  }
}

main();
