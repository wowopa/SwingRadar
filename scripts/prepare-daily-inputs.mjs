import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { loadLocalEnv } from "./load-env.mjs";
import { getProjectPaths, parseArgs } from "./lib/external-source-utils.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

loadLocalEnv(projectRoot);

async function runScript(scriptName) {
  const scriptUrl = new URL(`./${scriptName}`, import.meta.url);
  await import(scriptUrl);
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
  process.env.SWING_RADAR_RAW_DATA_DIR = rawDir;

  process.argv = [process.argv[0], process.argv[1]];
  await runScript("fetch-market-source.mjs");
  process.argv = [process.argv[0], process.argv[1]];
  await runScript("fetch-news-source.mjs");
  process.argv = [process.argv[0], process.argv[1]];
  await runScript("fetch-disclosures-source.mjs");
  process.argv = [process.argv[0], process.argv[1]];
  await runScript("sync-external-raw.mjs");
  process.argv = [process.argv[0], process.argv[1]];
  await runScript("refresh-validation-snapshot.mjs");

  console.log("Daily inputs prepared.");
  console.log(`- rawDir: ${rawDir}`);
}

main().catch((error) => {
  console.error("Daily input prefetch failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
