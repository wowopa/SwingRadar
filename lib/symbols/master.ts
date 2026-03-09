import symbolMasterData from "@/data/config/symbol-master.json";
import symbolReplacementsData from "@/data/config/symbol-replacements.json";

export type SymbolSearchStatus = "ready" | "pending";
export type SymbolMarket = "KOSPI" | "KOSDAQ" | "NYSE" | "NASDAQ" | "AMEX";
export type SymbolRegion = "KR" | "US";

export type SymbolMasterItem = {
  ticker: string;
  company: string;
  aliases: string[];
  sector: string;
  market: SymbolMarket;
  region: SymbolRegion;
  status: SymbolSearchStatus;
  newsQuery: string;
  newsQueries: string[];
  newsQueriesKr: string[];
  requiredKeywords: string[];
  contextKeywords: string[];
  blockedKeywords: string[];
  preferredDomains: string[];
  blockedDomains: string[];
  minArticleScore: number;
  dartCorpCode?: string;
};

export type SymbolMasterSuggestion = Pick<
  SymbolMasterItem,
  | "ticker"
  | "company"
  | "sector"
  | "market"
  | "newsQuery"
  | "newsQueries"
  | "newsQueriesKr"
  | "requiredKeywords"
  | "contextKeywords"
  | "blockedKeywords"
  | "preferredDomains"
  | "blockedDomains"
  | "minArticleScore"
  | "dartCorpCode"
>;

type RawSymbolMasterItem = {
  ticker: string;
  company: string;
  aliases?: string[];
  sector: string;
  market: SymbolMarket;
  region?: SymbolRegion;
  status: SymbolSearchStatus;
  newsQuery?: string;
  newsQueries?: string[];
  newsQueriesKr?: string[];
  requiredKeywords?: string[];
  contextKeywords?: string[];
  blockedKeywords?: string[];
  preferredDomains?: string[];
  blockedDomains?: string[];
  minArticleScore?: number;
  dartCorpCode?: string;
};

type RawSymbolReplacementItem = {
  ticker: string;
  replacementTicker: string;
  reason?: string;
};

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function defaultNewsQueriesKr(company: string, sector: string) {
  return [`"${company}" 주식`, `"${company}" ${sector}`, `"${company}" 실적`];
}

function hydrateSymbol(item: RawSymbolMasterItem): SymbolMasterItem {
  const aliases = unique(item.aliases ?? []);
  const newsQuery = item.newsQuery?.trim() || item.company;
  const newsQueries = unique(item.newsQueries ?? [newsQuery]);
  const newsQueriesKr = unique(item.newsQueriesKr ?? defaultNewsQueriesKr(item.company, item.sector));
  const requiredKeywords = unique(item.requiredKeywords ?? [item.company, ...aliases, item.ticker]);
  const contextKeywords = unique(item.contextKeywords ?? [item.sector, "실적", "주가"]);
  const blockedKeywords = unique(item.blockedKeywords ?? []);
  const preferredDomains = unique(item.preferredDomains ?? ["hankyung.com", "mk.co.kr", "edaily.co.kr", "yna.co.kr"]);
  const blockedDomains = unique(item.blockedDomains ?? []);

  return {
    ticker: item.ticker,
    company: item.company,
    aliases,
    sector: item.sector,
    market: item.market,
    region: item.region ?? (item.market === "KOSPI" || item.market === "KOSDAQ" ? "KR" : "US"),
    status: item.status,
    newsQuery,
    newsQueries,
    newsQueriesKr,
    requiredKeywords,
    contextKeywords,
    blockedKeywords,
    preferredDomains,
    blockedDomains,
    minArticleScore: item.minArticleScore ?? 12,
    dartCorpCode: item.dartCorpCode
  };
}

const replacementItems = symbolReplacementsData as RawSymbolReplacementItem[];
const replacementTickerMap = new Map(replacementItems.map((item) => [item.ticker, item.replacementTicker]));
const replacementAliasesByTicker = replacementItems.reduce<Map<string, string[]>>((map, item) => {
  const current = map.get(item.replacementTicker) ?? [];
  current.push(item.ticker);
  map.set(item.replacementTicker, current);
  return map;
}, new Map());

export const symbolMaster: SymbolMasterItem[] = (symbolMasterData as RawSymbolMasterItem[])
  .filter((item) => !replacementTickerMap.has(item.ticker))
  .map((item) => {
    const hydrated = hydrateSymbol(item);
    const legacyTickers = replacementAliasesByTicker.get(hydrated.ticker) ?? [];

    if (!legacyTickers.length) {
      return hydrated;
    }

    const aliases = unique([...hydrated.aliases, ...legacyTickers]);
    const requiredKeywords = unique([...hydrated.requiredKeywords, ...legacyTickers]);

    return {
      ...hydrated,
      aliases,
      requiredKeywords
    };
  });

export function buildMarketSymbol(ticker: string, market: SymbolMarket) {
  const suffixByMarket: Record<SymbolMarket, string> = {
    KOSPI: "KS",
    KOSDAQ: "KQ",
    NYSE: "NY",
    NASDAQ: "NQ",
    AMEX: "AM"
  };

  return `${ticker}.${suffixByMarket[market]}`;
}

export function buildTradingViewSymbol(ticker: string, market: SymbolMarket) {
  const exchangeByMarket: Record<SymbolMarket, string> = {
    KOSPI: "KRX",
    KOSDAQ: "KRX",
    NYSE: "NYSE",
    NASDAQ: "NASDAQ",
    AMEX: "AMEX"
  };

  return `${exchangeByMarket[market]}:${ticker}`;
}

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/["'`.,/\\|()[\]{}_-]+/g, "");
}

function buildSearchTerms(item: SymbolMasterItem) {
  return unique([
    item.ticker,
    item.company,
    item.sector,
    item.newsQuery,
    ...item.aliases,
    ...item.newsQueries,
    ...item.newsQueriesKr,
    ...item.requiredKeywords,
    ...item.contextKeywords
  ]);
}

function getMatchScore(item: SymbolMasterItem, query: string) {
  const searchTerms = buildSearchTerms(item).map((term) => ({
    raw: term,
    normalized: normalize(term)
  }));
  const ticker = normalize(item.ticker);
  const company = normalize(item.company);

  if (ticker === query) {
    return 1000;
  }
  if (company === query) {
    return 950;
  }
  if (ticker.startsWith(query)) {
    return 900;
  }
  if (company.startsWith(query)) {
    return 850;
  }

  const exactTerm = searchTerms.find((term) => term.normalized === query);
  if (exactTerm) {
    return 800;
  }

  const prefixTerm = searchTerms.find((term) => term.normalized.startsWith(query));
  if (prefixTerm) {
    return 700;
  }

  const containsTerm = searchTerms.find((term) => term.normalized.includes(query));
  if (containsTerm) {
    return 600;
  }

  return -1;
}

export function buildSymbolSuggestion(symbol: SymbolMasterItem): SymbolMasterSuggestion {
  return {
    ticker: symbol.ticker,
    company: symbol.company,
    sector: symbol.sector,
    market: symbol.market,
    newsQuery: symbol.newsQuery,
    newsQueries: symbol.newsQueries,
    newsQueriesKr: symbol.newsQueriesKr,
    requiredKeywords: symbol.requiredKeywords,
    contextKeywords: symbol.contextKeywords,
    blockedKeywords: symbol.blockedKeywords,
    preferredDomains: symbol.preferredDomains,
    blockedDomains: symbol.blockedDomains,
    minArticleScore: symbol.minArticleScore,
    dartCorpCode: symbol.dartCorpCode
  };
}

export function searchSymbols(query: string, limit = 8) {
  return searchSymbolItems(symbolMaster, query, limit);
}

export function getFeaturedSymbols(limit = 8) {
  return getFeaturedSymbolItems(symbolMaster, limit);
}

export function searchSymbolItems(items: SymbolMasterItem[], query: string, limit = 8) {
  const normalized = normalize(query);
  if (!normalized) {
    return getFeaturedSymbolItems(items, limit);
  }

  return items
    .map((item) => ({ item, score: getMatchScore(item, normalized) }))
    .filter((entry) => entry.score >= 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (left.item.status !== right.item.status) {
        return left.item.status === "ready" ? -1 : 1;
      }

      return left.item.ticker.localeCompare(right.item.ticker);
    })
    .slice(0, limit)
    .map((entry) => entry.item);
}

export function getFeaturedSymbolItems(items: SymbolMasterItem[], limit = 8) {
  return [...items]
    .sort((left, right) => {
      if (left.status !== right.status) {
        return left.status === "ready" ? -1 : 1;
      }

      return left.ticker.localeCompare(right.ticker);
    })
    .slice(0, limit);
}

export function getReadySymbols() {
  return symbolMaster.filter((item) => item.status === "ready");
}

export function resolveTicker(ticker: string) {
  return replacementTickerMap.get(ticker) ?? ticker;
}

export function getSymbolByTicker(ticker: string) {
  const resolvedTicker = resolveTicker(ticker);
  return symbolMaster.find((item) => item.ticker === resolvedTicker);
}

export function getSymbolSuggestionByTicker(ticker: string) {
  const symbol = getSymbolByTicker(ticker);
  return symbol ? buildSymbolSuggestion(symbol) : undefined;
}

export function getAdjacentReadySymbols(ticker: string) {
  const readyItems = getReadySymbols();
  const index = readyItems.findIndex((item) => item.ticker === ticker);

  if (index === -1) {
    return {
      previous: undefined,
      next: undefined,
      readyItems
    };
  }

  return {
    previous: index > 0 ? readyItems[index - 1] : undefined,
    next: index < readyItems.length - 1 ? readyItems[index + 1] : undefined,
    readyItems
  };
}
