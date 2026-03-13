import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import pg from "pg";

import { loadLocalEnv } from "./load-env.mjs";
import { getProjectPaths, parseArgs } from "./lib/external-source-utils.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const execFileAsync = promisify(execFile);
const { Client } = pg;

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

async function persistRuntimeDocument(name, payload) {
  if (!process.env.SWING_RADAR_DATABASE_URL) {
    return;
  }

  const client = new Client({
    connectionString: process.env.SWING_RADAR_DATABASE_URL,
    ssl: process.env.SWING_RADAR_DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined
  });

  await client.connect();

  try {
    await client.query(`
      create table if not exists runtime_documents (
        name text primary key,
        payload jsonb not null,
        updated_at timestamptz not null default now()
      )
    `);
    await client.query(
      `
      insert into runtime_documents (name, payload, updated_at)
      values ($1, $2::jsonb, now())
      on conflict (name)
      do update set payload = excluded.payload, updated_at = now()
      `,
      [name, JSON.stringify(payload)]
    );
  } finally {
    await client.end();
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

  const watchlistDocument = JSON.parse((await readFile(universeWatchlistPath, "utf8")).replace(/^\uFEFF/, ""));
  const manifest = {
    generatedAt: new Date().toISOString(),
    watchlistGeneratedAt: watchlistDocument.generatedAt ?? null,
    watchlistPath: universeWatchlistPath,
    watchlistCount: Array.isArray(watchlistDocument.tickers) ? watchlistDocument.tickers.length : 0,
    markets,
    limit
  };
  await persistRuntimeDocument("prefetch-manifest", manifest);

  console.log("Daily inputs prepared.");
  console.log(`- rawDir: ${rawDir}`);
  console.log(`- watchlist: ${universeWatchlistPath}`);
}

main().catch((error) => {
  console.error("Daily input prefetch failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
