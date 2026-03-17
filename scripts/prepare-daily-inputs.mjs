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

const SEOUL_TIME_ZONE = "Asia/Seoul";
const KRX_ENDPOINTS_BY_MARKET = {
  KOSPI: "sto/stk_bydd_trd",
  KOSDAQ: "sto/ksq_bydd_trd"
};

function getSeoulDateParts(value = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: SEOUL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const values = Object.fromEntries(
    formatter
      .formatToParts(value)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day)
  };
}

function formatCompactDate(date) {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  return `${year}${month}${day}`;
}

function formatHyphenDate(compactDate) {
  return `${compactDate.slice(0, 4)}-${compactDate.slice(4, 6)}-${compactDate.slice(6, 8)}`;
}

function resolvePreviousBusinessDate(value = new Date()) {
  const { year, month, day } = getSeoulDateParts(value);
  const cursor = new Date(Date.UTC(year, month - 1, day));

  while (true) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    const weekday = cursor.getUTCDay();
    if (weekday === 0 || weekday === 6) {
      continue;
    }

    return formatCompactDate(cursor);
  }
}

function normalizeMarkets(value) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
}

function wait(delayMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

async function fetchKrxReadinessCount(endpoint, basDd) {
  const apiKey = process.env.SWING_RADAR_KRX_API_KEY;
  if (!apiKey) {
    throw new Error("SWING_RADAR_KRX_API_KEY is not configured");
  }

  const baseUrl = process.env.SWING_RADAR_KRX_API_BASE_URL ?? "https://data-dbg.krx.co.kr/svc/apis";
  const authHeader = process.env.SWING_RADAR_KRX_API_AUTH_HEADER ?? "AUTH_KEY";
  const url = new URL(`${baseUrl.replace(/\/$/, "")}/${endpoint}`);
  url.searchParams.set("basDd", basDd);

  const response = await fetch(url, {
    headers: {
      [authHeader]: apiKey,
      "User-Agent": "SWING-RADAR/0.1"
    }
  });

  if (!response.ok) {
    throw new Error(`KRX readiness check failed: ${response.status} ${response.statusText} (${endpoint}, ${basDd})`);
  }

  const payload = await response.json();
  return Array.isArray(payload?.OutBlock_1) ? payload.OutBlock_1.length : 0;
}

async function ensureKrxMarketReady(markets) {
  if ((process.env.SWING_RADAR_MARKET_PROVIDER ?? "yahoo") !== "krx-api") {
    return null;
  }

  if (process.env.SWING_RADAR_KRX_READINESS_CHECK === "false") {
    console.log("KRX readiness check skipped.");
    return null;
  }

  const targetDateCompact = resolvePreviousBusinessDate();
  const requestedMarkets = normalizeMarkets(markets);
  const retryLimit = Math.max(0, Number.parseInt(process.env.SWING_RADAR_KRX_READINESS_RETRY_LIMIT ?? "12", 10));
  const retryDelayMs = Math.max(0, Number.parseInt(process.env.SWING_RADAR_KRX_READINESS_RETRY_DELAY_MS ?? "300000", 10));
  const totalAttempts = retryLimit + 1;
  let lastPendingDetails = null;
  let lastError = null;

  for (let attempt = 0; attempt < totalAttempts; attempt += 1) {
    const readiness = [];

    try {
      for (const market of requestedMarkets) {
        const endpoint = KRX_ENDPOINTS_BY_MARKET[market];
        if (!endpoint) {
          continue;
        }

        const count = await fetchKrxReadinessCount(endpoint, targetDateCompact);
        readiness.push({ market, count });
      }
    } catch (error) {
      lastError = error;

      if (attempt === totalAttempts - 1) {
        throw error;
      }

      console.warn("KRX readiness check errored.");
      console.warn(`- targetDate: ${formatHyphenDate(targetDateCompact)}`);
      console.warn(`- attempt: ${attempt + 1}/${totalAttempts}`);
      console.warn(`- retryInMs: ${retryDelayMs}`);
      console.warn(`- message: ${error instanceof Error ? error.message : String(error)}`);
      await wait(retryDelayMs);
      continue;
    }

    if (!readiness.length) {
      return null;
    }

    const unavailable = readiness.filter((entry) => entry.count < 1);
    if (unavailable.length === 0) {
      console.log("KRX readiness confirmed.");
      console.log(`- targetDate: ${formatHyphenDate(targetDateCompact)}`);
      console.log(`- availability: ${readiness.map((entry) => `${entry.market}=${entry.count}`).join(", ")}`);

      return {
        targetDate: formatHyphenDate(targetDateCompact),
        counts: readiness,
        attempts: attempt + 1
      };
    }

    lastPendingDetails = readiness.map((entry) => `${entry.market}=${entry.count}`).join(", ");

    if (attempt === totalAttempts - 1) {
      break;
    }

    console.warn("KRX daily trade data is not ready yet.");
    console.warn(`- targetDate: ${formatHyphenDate(targetDateCompact)}`);
    console.warn(`- attempt: ${attempt + 1}/${totalAttempts}`);
    console.warn(`- availability: ${lastPendingDetails}`);
    console.warn(`- retryInMs: ${retryDelayMs}`);
    await wait(retryDelayMs);
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error(
    `KRX daily trade data is not ready for ${formatHyphenDate(targetDateCompact)} (${lastPendingDetails ?? "no readiness data"}).`
  );
}

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

  const krxReadiness = await ensureKrxMarketReady(markets);

  await runScript("fetch-market-source.mjs");
  await runScript("fetch-news-source.mjs");
  await runScript("fetch-disclosures-source.mjs");
  await runScript("sync-external-raw.mjs");
  await runScript("refresh-validation-snapshot.mjs");

  const watchlistDocument = JSON.parse((await readFile(universeWatchlistPath, "utf8")).replace(/^\uFEFF/, ""));
  const marketSnapshotPath = path.join(rawDir, "market-snapshot.json");
  const marketSnapshot = JSON.parse((await readFile(marketSnapshotPath, "utf8")).replace(/^\uFEFF/, ""));
  const marketSignalDate =
    Array.isArray(marketSnapshot.items) && marketSnapshot.items.length > 0
      ? [...new Set(marketSnapshot.items.map((item) => item.signalDate).filter(Boolean))].sort().at(-1) ?? null
      : null;

  if (krxReadiness?.targetDate && marketSignalDate && krxReadiness.targetDate !== marketSignalDate) {
    throw new Error(
      `Prefetched market date mismatch: expected ${krxReadiness.targetDate}, received ${marketSignalDate}.`
    );
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    watchlistGeneratedAt: watchlistDocument.generatedAt ?? null,
    watchlistPath: universeWatchlistPath,
    watchlistCount: Array.isArray(watchlistDocument.tickers) ? watchlistDocument.tickers.length : 0,
    markets,
    limit,
    marketSignalDate,
    krxReadinessDate: krxReadiness?.targetDate ?? null,
    krxReadinessCounts: krxReadiness?.counts ?? [],
    krxReadinessAttempts: krxReadiness?.attempts ?? null
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
