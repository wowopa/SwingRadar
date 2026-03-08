import symbolMasterData from "@/data/config/symbol-master.json";

export type SymbolSearchStatus = "ready" | "pending";
export type SymbolMarket = "KOSPI" | "KOSDAQ";

export type SymbolMasterItem = {
  ticker: string;
  company: string;
  aliases: string[];
  sector: string;
  market: SymbolMarket;
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

export const symbolMaster: SymbolMasterItem[] = (symbolMasterData as RawSymbolMasterItem[]).map(hydrateSymbol);

function normalize(value: string) {
  return value.trim().toLowerCase();
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
  const normalized = normalize(query);
  const items = normalized
    ? symbolMaster.filter((item) => {
        const haystacks = [item.ticker, item.company, item.sector, item.newsQuery, ...item.aliases];
        return haystacks.some((value) => normalize(value).includes(normalized));
      })
    : symbolMaster;

  return items.slice(0, limit);
}

export function getFeaturedSymbols(limit = 8) {
  return symbolMaster.slice(0, limit);
}

export function getReadySymbols() {
  return symbolMaster.filter((item) => item.status === "ready");
}

export function getSymbolByTicker(ticker: string) {
  return symbolMaster.find((item) => item.ticker === ticker);
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
