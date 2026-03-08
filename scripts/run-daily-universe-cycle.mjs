import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { loadLocalEnv } from "./load-env.mjs";

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

loadLocalEnv(projectRoot);

function printHelp() {
  console.log(`
SWING-RADAR daily universe refresh

Usage:
  node scripts/run-daily-universe-cycle.mjs [--markets <KOSPI,KOSDAQ>] [--limit <number>] [--batch-size <number>] [--skip-ingest] [--sync-symbols]
`);
}

function parseArgs(argv) {
  const options = {
    markets: process.env.SWING_RADAR_UNIVERSE_MARKETS ?? "KOSPI,KOSDAQ",
    limit: process.env.SWING_RADAR_UNIVERSE_LIMIT ?? "0",
    batchSize: process.env.SWING_RADAR_UNIVERSE_BATCH_SIZE ?? "20",
    skipIngest: false,
    syncSymbols: process.env.SWING_RADAR_SYMBOL_SYNC_ENABLED === "true",
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
    if (arg === "--skip-ingest") {
      options.skipIngest = true;
      continue;
    }
    if (arg === "--sync-symbols") {
      options.syncSymbols = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

async function runScript(scriptName, args) {
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
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  if (options.syncSymbols) {
    console.log("[daily-cycle] symbol master sync 시작");
    await runScript("sync-symbol-master.mjs", []);
  }

  const watchlistArgs = [];
  if (options.markets) {
    watchlistArgs.push("--markets", options.markets);
  }
  if (options.limit && options.limit !== "0") {
    watchlistArgs.push("--limit", options.limit);
  }

  const scanArgs = ["--batch-size", options.batchSize];
  if (options.skipIngest) {
    scanArgs.push("--skip-ingest");
  }

  console.log("[daily-cycle] universe watchlist 생성 시작");
  await runScript("build-universe-watchlist.mjs", watchlistArgs);

  console.log("[daily-cycle] universe batch scan 시작");
  await runScript("scan-universe-batches.mjs", scanArgs);

  const resultPath = path.join(projectRoot, "data", "universe", "daily-candidates.json");
  const document = JSON.parse((await readFile(resultPath, "utf8")).replace(/^\uFEFF/, ""));
  console.log(
    `[daily-cycle] 완료: 후보 ${document.topCandidates.length}건, 성공 배치 ${document.succeededBatches}/${document.totalBatches}, 실패 배치 ${document.failedBatches.length}건`
  );
}

main().catch((error) => {
  console.error("[daily-cycle] 실패", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
