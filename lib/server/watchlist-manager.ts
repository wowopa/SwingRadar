import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { buildSymbolSuggestion, type SymbolMasterItem } from "@/lib/symbols/master";

const execFileAsync = promisify(execFile);
const projectRoot = process.cwd();
const watchlistPath = path.join(projectRoot, "data", "config", "watchlist.json");

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

function buildMarketSymbol(symbol: SymbolMasterItem) {
  return `${symbol.ticker}.${symbol.market === "KOSPI" ? "KS" : "KQ"}`;
}

function buildWatchlistEntry(symbol: SymbolMasterItem): WatchlistEntry {
  const suggestion = buildSymbolSuggestion(symbol);

  return {
    ticker: symbol.ticker,
    company: symbol.company,
    sector: suggestion.sector,
    marketSymbol: buildMarketSymbol(symbol),
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
  return JSON.parse(await readFile(watchlistPath, "utf8")) as WatchlistDocument;
}

async function saveWatchlistDocument(document: WatchlistDocument) {
  await writeFile(watchlistPath, `${JSON.stringify(document, null, 2)}\n`, "utf8");
}

async function runNodeScript(scriptName: string) {
  const startedAt = Date.now();
  await execFileAsync(process.execPath, [path.join(projectRoot, "scripts", scriptName)], {
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
      estimate: "이미 감시 리스트에 포함되어 있습니다.",
      timings: null
    };
  }

  const entry = buildWatchlistEntry(symbol);
  document.tickers.push(entry);
  await saveWatchlistDocument(document);

  const pipelineMs = await runNodeScript("refresh-external-pipeline.mjs");
  const ingestMs = await runNodeScript("ingest-postgres.mjs");

  return {
    added: true,
    entry,
    estimate: "일반적으로 15초~60초 안에 분석 페이지 반영이 시작됩니다.",
    timings: {
      pipelineMs,
      ingestMs,
      totalMs: pipelineMs + ingestMs
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
      timings: null
    };
  }

  const pipelineMs = await runNodeScript("refresh-external-pipeline.mjs");
  const ingestMs = await runNodeScript("ingest-postgres.mjs");

  return {
    updated: true,
    entry: nextEntry,
    previousEntry,
    changes,
    timings: {
      pipelineMs,
      ingestMs,
      totalMs: pipelineMs + ingestMs
    }
  };
}