import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { ApiError } from "@/lib/server/api-error";
import { saveWatchlistSyncStatus } from "@/lib/server/watchlist-sync-status";
import { buildMarketSymbol, buildSymbolSuggestion, type SymbolMasterItem } from "@/lib/symbols/master";

const execFileAsync = promisify(execFile);
const projectRoot = process.cwd();

export type WatchlistEntry = {
  ticker: string;
  company: string;
  sector: string;
  marketSymbol: string;
  newsQuery: string;
  newsQueries: string[];
  newsQueriesKr: string[];
  requiredKeywords: string[];
  contextKeywords: string[];
  blockedKeywords: string[];
  blockedDomains: string[];
  preferredDomains: string[];
  minArticleScore: number;
  market: string;
  dartCorpCode?: string;
};

export type WatchlistEntryDiff = {
  field: keyof WatchlistEntry;
  before: string;
  after: string;
};

type WatchlistDocument = {
  tickers: WatchlistEntry[];
};

function getWatchlistPath() {
  return process.env.SWING_RADAR_WATCHLIST_FILE
    ? path.resolve(process.env.SWING_RADAR_WATCHLIST_FILE)
    : path.join(projectRoot, "data", "config", "watchlist.json");
}

function buildWatchlistEntry(symbol: SymbolMasterItem): WatchlistEntry {
  const suggestion = buildSymbolSuggestion(symbol);

  return {
    ticker: symbol.ticker,
    company: symbol.company,
    sector: suggestion.sector,
    marketSymbol: buildMarketSymbol(symbol.ticker, symbol.market),
    newsQuery: suggestion.newsQuery,
    newsQueries: suggestion.newsQueries,
    newsQueriesKr: suggestion.newsQueriesKr,
    requiredKeywords: suggestion.requiredKeywords,
    contextKeywords: suggestion.contextKeywords,
    blockedKeywords: suggestion.blockedKeywords,
    blockedDomains: suggestion.blockedDomains,
    preferredDomains: suggestion.preferredDomains,
    minArticleScore: suggestion.minArticleScore,
    market: symbol.market,
    dartCorpCode: suggestion.dartCorpCode ?? ""
  };
}

async function loadWatchlistDocument() {
  try {
    return JSON.parse(await readFile(getWatchlistPath(), "utf8")) as WatchlistDocument;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { tickers: [] } satisfies WatchlistDocument;
    }

    if (error instanceof SyntaxError) {
      throw new ApiError(500, "WATCHLIST_DOCUMENT_INVALID", "Watchlist document is not valid JSON", {
        path: getWatchlistPath()
      });
    }

    throw error;
  }
}

async function saveWatchlistDocument(document: WatchlistDocument) {
  await writeFile(getWatchlistPath(), `${JSON.stringify(document, null, 2)}\n`, "utf8");
}

async function runNodeScript(scriptName: string, args: string[] = []) {
  const startedAt = Date.now();
  await execFileAsync(process.execPath, [path.join(projectRoot, "scripts", scriptName), ...args], {
    cwd: projectRoot,
    env: process.env
  });
  return Date.now() - startedAt;
}

function stringifyValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value);
}

function buildWatchlistDiff(previous: WatchlistEntry, next: WatchlistEntry): WatchlistEntryDiff[] {
  const fields: Array<keyof WatchlistEntry> = [
    "sector",
    "newsQuery",
    "dartCorpCode",
    "requiredKeywords",
    "contextKeywords",
    "blockedKeywords",
    "blockedDomains",
    "preferredDomains",
    "minArticleScore"
  ];

  return fields.flatMap((field) => {
    const before = stringifyValue(previous[field]);
    const after = stringifyValue(next[field]);

    if (before === after) {
      return [];
    }

    return [{ field, before, after }];
  });
}

export async function listWatchlistEntries() {
  const document = await loadWatchlistDocument();
  return document.tickers;
}

export async function addSymbolToWatchlist(symbol: SymbolMasterItem) {
  const document = await loadWatchlistDocument();
  const existing = document.tickers.find((item) => item.ticker === symbol.ticker);

  if (existing) {
    return {
      added: false,
      entry: existing,
      estimate: "\uC774\uBBF8 \uAD00\uC2EC \uC885\uBAA9\uC5D0 \uB4E4\uC5B4 \uC788\uC5B4 \uBC14\uB85C \uD655\uC778\uD558\uC2E4 \uC218 \uC788\uC2B5\uB2C8\uB2E4.",
      timings: null
    };
  }

  const entry = buildWatchlistEntry(symbol);
  document.tickers.push(entry);
  await saveWatchlistDocument(document);

  const startedAt = new Date().toISOString();
  await saveWatchlistSyncStatus({
    ticker: symbol.ticker,
    state: "syncing",
    message: "\uD3B8\uC785\uD55C \uC885\uBAA9\uC744 \uBD84\uC11D \uD654\uBA74\uC5D0 \uBC18\uC601\uD558\uB294 \uC911\uC785\uB2C8\uB2E4.",
    lastStartedAt: startedAt,
    lastCompletedAt: null,
    lastDurationMs: null
  });

  let pipelineMs: number;
  try {
    pipelineMs = await runNodeScript("refresh-watchlist-entry.mjs", ["--ticker", symbol.ticker]);
  } catch (error) {
    const completedAt = new Date().toISOString();
    await saveWatchlistSyncStatus({
      ticker: symbol.ticker,
      state: "failed",
      message: error instanceof Error ? error.message : String(error),
      lastStartedAt: startedAt,
      lastCompletedAt: completedAt,
      lastDurationMs: null
    });
    throw error;
  }

  const completedAt = new Date().toISOString();
  const syncStatus = await saveWatchlistSyncStatus({
    ticker: symbol.ticker,
    state: "ready",
    message: "\uBD84\uC11D \uBC18\uC601\uC774 \uB05D\uB0AC\uC2B5\uB2C8\uB2E4.",
    lastStartedAt: startedAt,
    lastCompletedAt: completedAt,
    lastDurationMs: pipelineMs
  });

  return {
    added: true,
    entry,
    estimate: "\uBCF4\uD1B5 15\uCD08~60\uCD08 \uC548\uC5D0 \uC0C8 \uC885\uBAA9 \uBD84\uC11D\uC774 \uD654\uBA74\uC5D0 \uBC18\uC601\uB429\uB2C8\uB2E4.",
    syncStatus,
    timings: {
      pipelineMs,
      ingestMs: null,
      totalMs: pipelineMs
    }
  };
}

export async function updateWatchlistEntry(
  ticker: string,
  patch: Partial<WatchlistEntry>,
  options?: { rerunPipeline?: boolean }
) {
  const document = await loadWatchlistDocument();
  const index = document.tickers.findIndex((item) => item.ticker === ticker);

  if (index < 0) {
    throw new Error(`Watchlist entry not found: ${ticker}`);
  }

  const previousEntry = document.tickers[index];
  const nextEntry = {
    ...previousEntry,
    ...patch
  };
  const changes = buildWatchlistDiff(previousEntry, nextEntry);

  document.tickers[index] = nextEntry;
  await saveWatchlistDocument(document);

  if (!options?.rerunPipeline) {
    return {
      updated: true,
      entry: nextEntry,
      previousEntry,
      changes,
      syncStatus: await saveWatchlistSyncStatus({
        ticker,
        state: "idle",
        message: "\uC885\uBAA9 \uC124\uC815\uB9CC \uC218\uC815\uD588\uC2B5\uB2C8\uB2E4.",
        lastStartedAt: null,
        lastCompletedAt: new Date().toISOString(),
        lastDurationMs: null
      }),
      timings: null
    };
  }

  const startedAt = new Date().toISOString();
  await saveWatchlistSyncStatus({
    ticker,
    state: "syncing",
    message: "\uC218\uC815\uD55C \uC124\uC815\uC744 \uB2E4\uC2DC \uBC18\uC601\uD558\uB294 \uC911\uC785\uB2C8\uB2E4.",
    lastStartedAt: startedAt,
    lastCompletedAt: null,
    lastDurationMs: null
  });

  let pipelineMs: number;
  try {
    pipelineMs = await runNodeScript("refresh-watchlist-entry.mjs", ["--ticker", ticker]);
  } catch (error) {
    const completedAt = new Date().toISOString();
    await saveWatchlistSyncStatus({
      ticker,
      state: "failed",
      message: error instanceof Error ? error.message : String(error),
      lastStartedAt: startedAt,
      lastCompletedAt: completedAt,
      lastDurationMs: null
    });
    throw error;
  }

  const completedAt = new Date().toISOString();
  const syncStatus = await saveWatchlistSyncStatus({
    ticker,
    state: "ready",
    message: "\uCD5C\uC2E0 \uC124\uC815\uC73C\uB85C \uB2E4\uC2DC \uBC18\uC601\uD588\uC2B5\uB2C8\uB2E4.",
    lastStartedAt: startedAt,
    lastCompletedAt: completedAt,
    lastDurationMs: pipelineMs
  });

  return {
    updated: true,
    entry: nextEntry,
    previousEntry,
    changes,
    syncStatus,
    timings: {
      pipelineMs,
      ingestMs: null,
      totalMs: pipelineMs
    }
  };
}
