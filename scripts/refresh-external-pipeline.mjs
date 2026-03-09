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
SWING-RADAR external refresh pipeline

Usage:
  node scripts/refresh-external-pipeline.mjs [--raw-dir <path>] [--out-dir <path>]
`);
}

async function main() {
  const defaults = getProjectPaths(projectRoot);
  const options = parseArgs(process.argv.slice(2), {
    rawDir: defaults.rawDir,
    outDir: defaults.liveDir
  });

  if (options.help) {
    printHelp();
    return;
  }

  process.env.SWING_RADAR_RAW_DATA_DIR = path.resolve(options.rawDir);
  process.env.SWING_RADAR_DATA_DIR = path.resolve(options.outDir);

  process.argv = [process.argv[0], process.argv[1]];
  await runScript("fetch-market-source.mjs");
  process.argv = [process.argv[0], process.argv[1]];
  await runScript("fetch-news-source.mjs");
  process.argv = [process.argv[0], process.argv[1]];
  await runScript("fetch-disclosures-source.mjs");
  process.argv = [process.argv[0], process.argv[1]];
  await runScript("sync-external-raw.mjs");
  process.argv = [process.argv[0], process.argv[1]];
  await runScript("generate-snapshots.mjs");
}

main().catch((error) => {
  console.error("External refresh pipeline failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
