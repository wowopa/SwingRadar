import type { PortfolioJournalGroup } from "@/lib/portfolio/journal-insights";

export function getPortfolioCloseReviewKey(ticker: string, closedAt: string) {
  return `${ticker.toUpperCase()}:${closedAt}`;
}

export function getPortfolioCloseReviewKeyForGroup(group: PortfolioJournalGroup) {
  return getPortfolioCloseReviewKey(group.ticker, group.latestEvent.tradedAt);
}
