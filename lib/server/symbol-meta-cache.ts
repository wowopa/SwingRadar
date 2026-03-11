const SYMBOL_META_CACHE_TTL_MS = 30_000;

export type SymbolMetaSnapshot = {
  readyTickers: Set<string>;
  featuredTickerOrder: string[];
};

let symbolMetaCache:
  | {
      expiresAt: number;
      snapshot: SymbolMetaSnapshot;
    }
  | undefined;

export function resetSymbolMetaCacheForTests() {
  symbolMetaCache = undefined;
}

export function getCachedSymbolMetaSnapshot(now = Date.now()) {
  if (symbolMetaCache && symbolMetaCache.expiresAt > now) {
    return symbolMetaCache.snapshot;
  }

  return null;
}

export function setCachedSymbolMetaSnapshot(snapshot: SymbolMetaSnapshot, now = Date.now()) {
  symbolMetaCache = {
    expiresAt: now + SYMBOL_META_CACHE_TTL_MS,
    snapshot
  };
}
