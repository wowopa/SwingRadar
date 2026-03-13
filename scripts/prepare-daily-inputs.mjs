import { execFile } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { loadLocalEnv } from "./load-env.mjs";
import { getProjectPaths, parseArgs } from "./lib/external-source-utils.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const execFileAsync = promisify(execFile);

loadLocalEnv(projectRoot);

async function runScript(scriptName) {
  const { stdout, stderr } = await execFileAsync(process.execPath, [path.join(projectRoot, "scripts", scriptName)], {
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

async function runScriptWithArgs(scriptName, args) {
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

function printHelp() {
  console.log(`
SWING-RADAR daily input prefetch

Usage:
  node scripts/prepare-daily-inputs.mjs [--raw-dir <path>]
`);
}

async function main() {
  const defaults = getProjectPaths(projectRoot);
  const options = parseArgs(process.argv.slice(2), {
    rawDir: defaults.rawDir
  });

  if (options.help) {
    printHelp();
    return;
  }

  const rawDir = path.resolve(options.rawDir);
  const universeWatchlistPath = path.join(defaults.runtimeConfigDir, "watchlist.universe.json");
  const markets = process.env.SWING_RADAR_UNIVERSE_MARKETS ?? "KOSPI,KOSDAQ";
  const limit = process.env.SWING_RADAR_UNIVERSE_LIMIT ?? "0";

  process.env.SWING_RADAR_RAW_DATA_DIR = rawDir;
  process.env.SWING_RADAR_WATCHLIST_FILE = universeWatchlistPath;

  await runScriptWithArgs("build-universe-watchlist.mjs", [
    "--output",
    universeWatchlistPath,
    "--markets",
    markets,
    "--limit",
    limit
  ]);

  await runScript("fetch-market-source.mjs");
  await runScript("fetch-news-source.mjs");
  await runScript("fetch-disclosures-source.mjs");
  await runScript("sync-external-raw.mjs");
  await runScript("refresh-validation-snapshot.mjs");

  console.log("Daily inputs prepared.");
  console.log(`- rawDir: ${rawDir}`);
  console.log(`- watchlist: ${universeWatchlistPath}`);
}

main().catch((error) => {
  console.error("Daily input prefetch failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
