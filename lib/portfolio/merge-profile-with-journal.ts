import {
  groupPortfolioJournalByTicker,
  isClosingPortfolioTradeEventType
} from "@/lib/portfolio/journal-insights";
import type { PortfolioJournal, PortfolioProfile } from "@/types/recommendation";

export function mergePortfolioProfileWithJournal(
  profile: PortfolioProfile,
  journal: PortfolioJournal
) {
  const merged = new Map(profile.positions.map((position) => [position.ticker, position]));

  for (const group of groupPortfolioJournalByTicker(journal.events)) {
    if (isClosingPortfolioTradeEventType(group.latestEvent.type) || group.metrics.remainingQuantity <= 0) {
      merged.delete(group.ticker);
      continue;
    }

    const current = merged.get(group.ticker);
    merged.set(group.ticker, {
      ticker: group.ticker,
      company: group.company,
      sector: group.sector,
      quantity: group.metrics.remainingQuantity,
      averagePrice: group.metrics.averageCost,
      enteredAt: group.firstEntryAt.slice(0, 10),
      note: current?.note ?? group.latestEvent.note ?? undefined
    });
  }

  return {
    ...profile,
    positions: [...merged.values()].sort((left, right) => left.ticker.localeCompare(right.ticker, "en"))
  };
}
