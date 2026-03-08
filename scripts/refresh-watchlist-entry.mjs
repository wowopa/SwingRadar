import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
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
SWING-RADAR single watchlist entry refresh

Usage:
  node scripts/refresh-watchlist-entry.mjs --ticker <ticker> [--skip-ingest]

Options:
  --ticker <ticker>   Refresh only the selected watchlist entry
  --skip-ingest       Skip PostgreSQL ingest after snapshot generation
  --help              Show this message
`);
}

function parseArgs(argv) {
  const options = {
    ticker: "",
    skipIngest: false,
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help") {
      options.help = true;
      continue;
    }
    if (arg === "--skip-ingest") {
      options.skipIngest = true;
      continue;
    }
    if (arg === "--ticker") {
      options.ticker = (argv[index + 1] ?? "").trim();
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function resolvePath(envKey, fallback) {
  return process.env[envKey] ? path.resolve(process.env[envKey]) : path.join(projectRoot, fallback);
}

function getWatchlistPath() {
  return process.env.SWING_RADAR_WATCHLIST_FILE
    ? path.resolve(process.env.SWING_RADAR_WATCHLIST_FILE)
    : path.join(projectRoot, "data", "config", "watchlist.json");
}

function getRawDir() {
  return resolvePath("SWING_RADAR_RAW_DATA_DIR", path.join("data", "raw"));
}

function getLiveDir() {
  return resolvePath("SWING_RADAR_DATA_DIR", path.join("data", "live"));
}

async function readJson(filePath) {
  return JSON.parse((await readFile(filePath, "utf8")).replace(/^\uFEFF/, ""));
}

async function fileExists(filePath) {
  try {
    await readFile(filePath, "utf8");
    return true;
  } catch {
    return false;
  }
}

async function readOptionalJson(filePath, fallback) {
  try {
    return await readJson(filePath);
  } catch (error) {
    if ((error && typeof error === "object" && "code" in error && error.code === "ENOENT")) {
      return fallback;
    }
    throw error;
  }
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function runNodeScript(scriptName, args = [], env = {}) {
  await execFileAsync(process.execPath, [path.join(projectRoot, "scripts", scriptName), ...args], {
    cwd: projectRoot,
    env: {
      ...process.env,
      ...env
    }
  });
}

function mergeItemsByTicker(existingItems, incomingItems) {
  const incomingTickers = new Set(incomingItems.map((item) => item.ticker));
  return [...existingItems.filter((item) => !incomingTickers.has(item.ticker)), ...incomingItems];
}

async function mergeExternalPayload(mainFilePath, tempFilePath, emptyValue) {
  const [mainPayload, tempPayload] = await Promise.all([
    readOptionalJson(mainFilePath, emptyValue),
    readOptionalJson(tempFilePath, emptyValue)
  ]);

  const nextPayload = {
    ...mainPayload,
    ...tempPayload,
    asOf: tempPayload.asOf ?? mainPayload.asOf ?? new Date().toISOString(),
    provider: tempPayload.provider ?? mainPayload.provider ?? emptyValue.provider,
    items: mergeItemsByTicker(mainPayload.items ?? [], tempPayload.items ?? [])
  };

  await writeJson(mainFilePath, nextPayload);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  if (!options.ticker) {
    throw new Error("--ticker is required");
  }

  const watchlist = await readJson(getWatchlistPath());
  const entry = (watchlist.tickers ?? []).find((item) => item.ticker === options.ticker);
  if (!entry) {
    throw new Error(`Watchlist entry not found: ${options.ticker}`);
  }

  const rawDir = getRawDir();
  const liveDir = getLiveDir();
  const hasRawBaseline = await fileExists(path.join(rawDir, "external-market.json"));

  if (!hasRawBaseline) {
    await runNodeScript("refresh-external-pipeline.mjs");
    if (!options.skipIngest) {
      await runNodeScript("ingest-postgres.mjs", ["--data-dir", liveDir]);
    }

    console.log("Watchlist entry refresh completed with full refresh fallback.");
    console.log(`- ticker: ${options.ticker}`);
    console.log(`- rawDir: ${rawDir}`);
    console.log(`- liveDir: ${liveDir}`);
    return;
  }

  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "swing-radar-entry-refresh-"));
  const tempWatchlistPath = path.join(tempRoot, "watchlist.json");
  const tempRawDir = path.join(tempRoot, "raw");

  await mkdir(tempRawDir, { recursive: true });
  await writeJson(tempWatchlistPath, { tickers: [entry] });

  try {
    const env = {
      SWING_RADAR_WATCHLIST_FILE: tempWatchlistPath,
      SWING_RADAR_RAW_DATA_DIR: tempRawDir
    };

    for (const scriptName of ["fetch-market-source.mjs", "fetch-news-source.mjs", "fetch-disclosures-source.mjs"]) {
      await runNodeScript(scriptName, [], env);
    }

    await mergeExternalPayload(path.join(rawDir, "external-market.json"), path.join(tempRawDir, "external-market.json"), {
      asOf: null,
      provider: "yahoo",
      items: []
    });
    await mergeExternalPayload(path.join(rawDir, "external-news.json"), path.join(tempRawDir, "external-news.json"), {
      asOf: null,
      provider: "file",
      items: []
    });
    await mergeExternalPayload(
      path.join(rawDir, "external-disclosures.json"),
      path.join(tempRawDir, "external-disclosures.json"),
      {
        asOf: null,
        provider: "file",
        items: []
      }
    );

    await runNodeScript("sync-external-raw.mjs");
    await runNodeScript("generate-snapshots.mjs", ["--raw-dir", rawDir, "--out-dir", liveDir]);

    if (!options.skipIngest) {
      await runNodeScript("ingest-postgres.mjs", ["--data-dir", liveDir]);
    }

    console.log("Watchlist entry refresh completed.");
    console.log(`- ticker: ${options.ticker}`);
    console.log(`- rawDir: ${rawDir}`);
    console.log(`- liveDir: ${liveDir}`);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error("Watchlist entry refresh failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
