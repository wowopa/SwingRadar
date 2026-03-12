import { readFile } from "node:fs/promises";
import path from "node:path";

import type { AnalysisEventDto, TrackingEventDto } from "@/lib/api-contracts/swing-radar";
import { getRuntimePaths } from "@/lib/server/runtime-paths";

interface NewsSnapshotItem {
  ticker: string;
  headline: string;
  impact: AnalysisEventDto["impact"];
  summary: string;
  date: string;
  source?: string;
  url?: string;
  eventType?: string;
}

interface NewsSnapshotDocument {
  asOf: string;
  items?: NewsSnapshotItem[];
}

async function loadNewsSnapshot() {
  const filePath = path.join(getRuntimePaths(process.cwd()).rawDir, "news-snapshot.json");

  try {
    const content = await readFile(filePath, "utf8");
    const payload = JSON.parse(content) as NewsSnapshotDocument;
    return payload.items ?? [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

export async function getLatestAnalysisNewsByTicker(ticker: string): Promise<AnalysisEventDto[]> {
  const items = await loadNewsSnapshot();

  return items
    .filter((item) => item.ticker === ticker)
    .slice(0, 6)
    .map((item) => ({
      headline: item.headline,
      impact: item.impact,
      summary: item.summary,
      source: item.source ?? "external",
      url: item.url ?? "",
      date: item.date,
      eventType: item.eventType ?? "news"
    }));
}

export async function getLatestTrackingNewsByTicker(ticker: string): Promise<TrackingEventDto[]> {
  const items = await loadNewsSnapshot();

  return items
    .filter((item) => item.ticker === ticker)
    .slice(0, 8)
    .map((item, index) => ({
      id: `${ticker}-news-${index + 1}`,
      date: item.date,
      headline: item.headline,
      impact: item.impact,
      note: item.summary,
      source: item.source ?? "external",
      url: item.url ?? "",
      eventType: item.eventType ?? "news"
    }));
}
