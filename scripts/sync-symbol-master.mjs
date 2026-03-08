import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFile } from "node:child_process";
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
SWING-RADAR symbol master sync

Usage:
  node scripts/sync-symbol-master.mjs [--input <csv-path> | --source-url <url>] [--output <json-path>] [--status <ready|pending>] [--merge]

Environment:
  SWING_RADAR_SYMBOL_SYNC_INPUT
  SWING_RADAR_SYMBOL_SYNC_URL
  SWING_RADAR_SYMBOL_SYNC_STATUS
  SWING_RADAR_SYMBOL_SYNC_MERGE=true
`);
}

function parseArgs(argv) {
  const options = {
    input: process.env.SWING_RADAR_SYMBOL_SYNC_INPUT,
    sourceUrl: process.env.SWING_RADAR_SYMBOL_SYNC_URL,
    output: path.join(projectRoot, "data", "config", "symbol-master.json"),
    status: process.env.SWING_RADAR_SYMBOL_SYNC_STATUS ?? "pending",
    merge: process.env.SWING_RADAR_SYMBOL_SYNC_MERGE === "true",
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
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.help && !options.input && !options.sourceUrl) {
    throw new Error("Either --input or --source-url is required");
  }

  return options;
}

async function runImport(args) {
  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    [path.join(projectRoot, "scripts", "import-symbol-master.mjs"), ...args],
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
}

async function downloadCsv(sourceUrl, tempRoot) {
  const response = await fetch(sourceUrl, { headers: { "user-agent": "swing-radar-symbol-sync/1.0" } });
  if (!response.ok) {
    throw new Error(`Failed to download symbol CSV: ${response.status} ${response.statusText}`);
  }

  const content = await response.text();
  const filePath = path.join(tempRoot, "symbol-master-sync.csv");
  await writeFile(filePath, content, "utf8");
  return filePath;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "swing-radar-symbol-sync-"));

  try {
    const inputPath = options.sourceUrl
      ? await downloadCsv(options.sourceUrl, tempRoot)
      : path.resolve(options.input);

    console.log(`[symbol-sync] start: ${options.sourceUrl ? "remote-url" : "local-file"}`);
    if (options.sourceUrl) {
      console.log(`[symbol-sync] source-url: ${options.sourceUrl}`);
    }
    console.log(`[symbol-sync] input: ${inputPath}`);

    await runImport([
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
