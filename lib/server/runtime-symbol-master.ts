import "server-only";

import fs from "node:fs";
import path from "node:path";

import symbolMasterSeedData from "@/data/config/symbol-master.json";
import symbolReplacementsData from "@/data/config/symbol-replacements.json";
import { getRuntimePaths } from "@/lib/server/runtime-paths";
import {
  buildMarketSymbol,
  buildSymbolSuggestion,
  buildTradingViewSymbol,
  createSymbolCatalog,
  getFeaturedSymbolItems,
  searchSymbolItems,
  type RawSymbolMasterItem,
  type RawSymbolReplacementItem
} from "@/lib/symbols/catalog";

export type {
  SymbolMarket,
  SymbolMasterItem,
  SymbolMasterSuggestion,
  SymbolRegion,
  SymbolSearchStatus
} from "@/lib/symbols/catalog";

type SymbolCatalog = ReturnType<typeof createSymbolCatalog>;

type SymbolCatalogCache = {
  sourcePath: string;
  mtimeMs: number | null;
  catalog: SymbolCatalog;
};

let cachedCatalog: SymbolCatalogCache | null = null;

function getRuntimeSymbolMasterPath() {
  if (process.env.SWING_RADAR_SYMBOL_MASTER_FILE) {
    return path.resolve(process.env.SWING_RADAR_SYMBOL_MASTER_FILE);
  }

  return path.join(getRuntimePaths().runtimeConfigDir, "symbol-master.json");
}

function createCatalog(items: RawSymbolMasterItem[]) {
  return createSymbolCatalog(items, symbolReplacementsData as RawSymbolReplacementItem[]);
}

function loadSeedCatalog() {
  return {
    sourcePath: "seed",
    mtimeMs: null,
    catalog: createCatalog(symbolMasterSeedData as RawSymbolMasterItem[])
  };
}

function loadCatalog() {
  const runtimePath = getRuntimeSymbolMasterPath();

  try {
    const stat = fs.statSync(runtimePath);

    if (
      cachedCatalog &&
      cachedCatalog.sourcePath === runtimePath &&
      cachedCatalog.mtimeMs === stat.mtimeMs
    ) {
      return cachedCatalog.catalog;
    }

    const content = fs.readFileSync(runtimePath, "utf8").replace(/^\uFEFF/, "");
    const parsed = JSON.parse(content) as RawSymbolMasterItem[];
    const nextCatalog = {
      sourcePath: runtimePath,
      mtimeMs: stat.mtimeMs,
      catalog: createCatalog(parsed)
    };

    cachedCatalog = nextCatalog;
    return nextCatalog.catalog;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.warn(
        `[symbol-master] failed to load runtime symbol master from ${runtimePath}, falling back to repo seed`,
        error
      );
    }

    if (cachedCatalog?.sourcePath === "seed") {
      return cachedCatalog.catalog;
    }

    const seedCatalog = loadSeedCatalog();
    cachedCatalog = seedCatalog;
    return seedCatalog.catalog;
  }
}

export function getSymbolMaster() {
  return loadCatalog().symbolMaster;
}

export function searchSymbols(query: string, limit = 8) {
  return loadCatalog().searchSymbols(query, limit);
}

export function getFeaturedSymbols(limit = 8, preferredTickers: string[] = []) {
  return loadCatalog().getFeaturedSymbols(limit, preferredTickers);
}

export function getReadySymbols() {
  return loadCatalog().getReadySymbols();
}

export function resolveTicker(ticker: string) {
  return loadCatalog().resolveTicker(ticker);
}

export function getSymbolByTicker(ticker: string) {
  return loadCatalog().getSymbolByTicker(ticker);
}

export function getSymbolSuggestionByTicker(ticker: string) {
  return loadCatalog().getSymbolSuggestionByTicker(ticker);
}

export function getAdjacentReadySymbols(ticker: string) {
  return loadCatalog().getAdjacentReadySymbols(ticker);
}

export { buildMarketSymbol, buildSymbolSuggestion, buildTradingViewSymbol, getFeaturedSymbolItems, searchSymbolItems };
