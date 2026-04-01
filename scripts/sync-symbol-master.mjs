import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { loadLocalEnv } from "./load-env.mjs";
import { resolveSymbolMasterOutputPath } from "./lib/symbol-master-paths.mjs";

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

loadLocalEnv(projectRoot);

function printHelp() {
  console.log(`
SWING-RADAR symbol master sync

Usage:
  node scripts/sync-symbol-master.mjs [--input <csv-path> | --source-url <url>] [--output <json-path>] [--status <ready|pending>] [--merge] [--krx]

Default output:
  %LOCALAPPDATA%/SwingRadar/runtime/config/symbol-master.json

Environment:
  SWING_RADAR_SYMBOL_SYNC_INPUT
  SWING_RADAR_SYMBOL_SYNC_URL
  SWING_RADAR_SYMBOL_SYNC_STATUS
  SWING_RADAR_SYMBOL_SYNC_MERGE=true
  SWING_RADAR_SYMBOL_SYNC_KRX=true
  SWING_RADAR_KRX_FETCH_MODE=downloads | url | api
  SWING_RADAR_KRX_SOURCE_URL
  SWING_RADAR_KRX_DOWNLOADS_DIR
  SWING_RADAR_KRX_DOWNLOAD_PATTERN
`);
}

function parseArgs(argv) {
  const options = {
    input: process.env.SWING_RADAR_SYMBOL_SYNC_INPUT,
    sourceUrl: process.env.SWING_RADAR_SYMBOL_SYNC_URL,
    output: resolveSymbolMasterOutputPath(projectRoot),
    status: process.env.SWING_RADAR_SYMBOL_SYNC_STATUS ?? "pending",
    merge: process.env.SWING_RADAR_SYMBOL_SYNC_MERGE === "true",
    krx: process.env.SWING_RADAR_SYMBOL_SYNC_KRX === "true",
    krxFetchMode: process.env.SWING_RADAR_KRX_FETCH_MODE ?? "downloads",
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help") {
      options.help = true;
      continue;
    }
    if (arg === "--input") {
      options.input = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--source-url") {
      options.sourceUrl = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--output") {
      options.output = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--status") {
      options.status = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--merge") {
      options.merge = true;
      continue;
    }
    if (arg === "--krx") {
      options.krx = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.help && !options.krx && !options.input && !options.sourceUrl) {
    throw new Error("Either --input or --source-url is required");
  }

  return options;
}

async function runNodeScript(scriptName, args) {
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

  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "swing-radar-symbol-sync-"));

  try {
    let inputPath = options.input ? path.resolve(options.input) : null;

    if (options.krx) {
      const rawKrxPath = path.join(tempRoot, "krx-source.csv");
      const preparedKrxPath = path.join(tempRoot, "krx-symbol-master.csv");
      const fetchArgs = [...(options.sourceUrl ? ["--source-url", options.sourceUrl] : []), "--output", rawKrxPath];

      if (options.krxFetchMode === "api") {
        fetchArgs.unshift("--api");
      }

      await runNodeScript("fetch-krx-symbols.mjs", fetchArgs);

      if (options.krxFetchMode === "api" && (process.env.SWING_RADAR_KRX_API_RESPONSE_TYPE ?? "csv") === "json") {
        inputPath = rawKrxPath;
        console.log(`[symbol-sync] using normalized KRX API CSV: ${inputPath}`);
      } else {
        await runNodeScript("prepare-krx-symbols.mjs", ["--input", rawKrxPath, "--output", preparedKrxPath]);
        inputPath = preparedKrxPath;
        console.log(`[symbol-sync] prepared KRX CSV: ${inputPath}`);
      }
    } else if (options.sourceUrl) {
      const downloadPath = path.join(tempRoot, "symbol-master-sync.csv");
      const response = await fetch(options.sourceUrl, { headers: { "user-agent": "swing-radar-symbol-sync/1.0" } });
      if (!response.ok) {
        throw new Error(`Failed to download symbol CSV: ${response.status} ${response.statusText}`);
      }
      const { writeFile } = await import("node:fs/promises");
      await writeFile(downloadPath, await response.text(), "utf8");
      inputPath = downloadPath;
    }

    if (!inputPath) {
      throw new Error("Resolved input path is missing");
    }

    console.log(`[symbol-sync] start: ${options.krx ? `krx-${options.krxFetchMode}` : options.sourceUrl ? "remote-url" : "local-file"}`);
    console.log(`[symbol-sync] input: ${inputPath}`);

    await runNodeScript("import-symbol-master.mjs", [
      "--input",
      inputPath,
      "--output",
      path.resolve(options.output),
      "--status",
      options.status,
      ...(options.merge ? ["--merge"] : [])
    ]);

    const payload = JSON.parse((await readFile(path.resolve(options.output), "utf8")).replace(/^\uFEFF/, ""));
    console.log(`[symbol-sync] completed: total symbols ${payload.length}`);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error("[symbol-sync] failed", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
