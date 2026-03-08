import type { TrackingResponseDto } from "@/lib/api-contracts/swing-radar";
import { getDataProvider } from "@/lib/providers";
import type { TrackingQuery } from "@/lib/server/query-schemas";

export async function getTrackingSnapshot(query: TrackingQuery): Promise<TrackingResponseDto> {
  const source = await getDataProvider().getTracking();
  let history = [...source.history];

  if (query.ticker) {
    const ticker = query.ticker.toLowerCase();
    history = history.filter((item) => item.ticker.toLowerCase().includes(ticker) || item.company.toLowerCase().includes(ticker));
  }

  if (query.result) {
    history = history.filter((item) => item.result === query.result);
  }

  const from = query.from;
  if (from) {
    history = history.filter((item) => item.signalDate >= from);
  }

  const to = query.to;
  if (to) {
    history = history.filter((item) => item.signalDate <= to);
  }

  if (query.limit) {
    history = history.slice(0, query.limit);
  }

  const detailIds = new Set(history.map((item) => item.id));
  const details = Object.fromEntries(Object.entries(source.details).filter(([key]) => detailIds.has(key)));

  return {
    generatedAt: source.generatedAt,
    history,
    details
  };
}