import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";

import { loadLocalEnv } from "./load-env.mjs";
import { getProjectPaths, parseArgs } from "./lib/external-source-utils.mjs";
import {
  getLiveSnapshotRoot,
  pruneOldLiveSnapshots,
  writeLiveSnapshotManifest
} from "./lib/live-snapshot-manifest.mjs";

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
  node scripts/refresh-external-pipeline.mjs [--raw-dir <path>] [--out-dir <path>] [--direct-live <true|false>]
`);
}

function createSnapshotVersionName() {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    "-",
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0")
  ].join("");

  return `snapshot-${stamp}`;
}

async function main() {
  const defaults = getProjectPaths(projectRoot);
  const options = parseArgs(process.argv.slice(2), {
    rawDir: defaults.rawDir,
    outDir: defaults.liveDir,
    directLive: "false"
  });

  if (options.help) {
    printHelp();
    return;
  }

  const rawDir = path.resolve(options.rawDir);
  const liveDir = path.resolve(options.outDir);
  const useDirectLive = options.directLive === "true";
  const snapshotRoot = getLiveSnapshotRoot(projectRoot);
  const targetOutDir = useDirectLive
    ? liveDir
    : path.join(snapshotRoot, createSnapshotVersionName());

  process.env.SWING_RADAR_RAW_DATA_DIR = rawDir;
  process.env.SWING_RADAR_DATA_DIR = targetOutDir;

  if (!useDirectLive) {
    await mkdir(targetOutDir, { recursive: true });
  }

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
  process.argv = [process.argv[0], process.argv[1]];
  await runScript("generate-snapshots.mjs");

  if (!useDirectLive) {
    const manifestPath = await writeLiveSnapshotManifest(projectRoot, targetOutDir);
    const removedSnapshots = await pruneOldLiveSnapshots(projectRoot, targetOutDir);
    console.log(`Live snapshot promoted.`);
    console.log(`- snapshotDir: ${targetOutDir}`);
    console.log(`- manifest: ${manifestPath}`);
    console.log(`- removedSnapshots: ${removedSnapshots.length}`);
  }
}

main().catch((error) => {
  console.error("External refresh pipeline failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
