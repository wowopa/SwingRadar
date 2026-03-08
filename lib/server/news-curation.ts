import { mkdir, readFile, writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import path from "path";

import type {
  AnalysisResponseDto,
  RecommendationsResponseDto,
  TrackingResponseDto
} from "@/lib/api-contracts/swing-radar";
import { recordAuditLog } from "@/lib/server/audit-log";

export interface CuratedNewsItem {
  id: string;
  ticker: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  date: string;
  impact: "긍정" | "중립" | "주의";
  pinned: boolean;
  operatorNote: string;
}

export interface NewsCurationDocument {
  updatedAt: string;
  updatedBy: string;
  items: CuratedNewsItem[];
}

function getAdminRoot() {
  return process.env.SWING_RADAR_EDITORIAL_DIR
    ? path.resolve(process.env.SWING_RADAR_EDITORIAL_DIR)
    : path.resolve(process.cwd(), "data/admin");
}

function getNewsCurationPath() {
  return path.join(getAdminRoot(), "news-curation.json");
}

function createDefaultDocument(): NewsCurationDocument {
  return {
    updatedAt: new Date(0).toISOString(),
    updatedBy: "system",
    items: []
  };
}

function normalizeCuratedItem(item: CuratedNewsItem): CuratedNewsItem {
  return {
    id: item.id || randomUUID(),
    ticker: item.ticker.trim(),
    headline: item.headline.trim(),
    summary: item.summary.trim(),
    source: item.source.trim(),
    url: item.url.trim(),
    date: item.date,
    impact: item.impact,
    pinned: Boolean(item.pinned),
    operatorNote: item.operatorNote.trim()
  };
}

function sortItems(items: CuratedNewsItem[]) {
  return [...items].sort((left, right) => {
    if (left.pinned !== right.pinned) {
      return left.pinned ? -1 : 1;
    }

    return right.date.localeCompare(left.date);
  });
}

function dedupeNews<T extends { headline: string; url?: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.headline.toLowerCase()}|${item.url?.toLowerCase() ?? ""}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function groupByTicker(items: CuratedNewsItem[]) {
  const grouped = new Map<string, CuratedNewsItem[]>();

  for (const item of sortItems(items)) {
    if (!grouped.has(item.ticker)) {
      grouped.set(item.ticker, []);
    }

    grouped.get(item.ticker)?.push(item);
  }

  return grouped;
}

function toAnalysisNews(item: CuratedNewsItem): AnalysisResponseDto["items"][number]["newsImpact"][number] {
  return {
    headline: item.headline,
    impact: item.impact as AnalysisResponseDto["items"][number]["newsImpact"][number]["impact"],
    summary: item.operatorNote
      ? `[운영자 큐레이션] ${item.summary} | ${item.operatorNote}`
      : `[운영자 큐레이션] ${item.summary}`,
    source: item.source,
    url: item.url,
    date: item.date,
    eventType: "curated-news"
  };
}

function toTrackingNews(item: CuratedNewsItem): TrackingResponseDto["details"][string]["historicalNews"][number] {
  return {
    id: item.id,
    date: item.date,
    headline: item.headline,
    impact: item.impact as TrackingResponseDto["details"][string]["historicalNews"][number]["impact"],
    note: item.operatorNote
      ? `${item.summary} | source ${item.source} | ${item.operatorNote}`
      : `${item.summary} | source ${item.source}`,
    source: item.source,
    url: item.url,
    eventType: "curated-news"
  };
}

export async function loadNewsCuration(): Promise<NewsCurationDocument> {
  try {
    const content = await readFile(getNewsCurationPath(), "utf8");
    const parsed = JSON.parse(content) as NewsCurationDocument;

    return {
      updatedAt: parsed.updatedAt,
      updatedBy: parsed.updatedBy,
      items: sortItems((parsed.items ?? []).map(normalizeCuratedItem))
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }

    return createDefaultDocument();
  }
}

export async function saveNewsCuration(document: NewsCurationDocument, actor: string, requestId: string) {
  const nextDocument: NewsCurationDocument = {
    updatedAt: new Date().toISOString(),
    updatedBy: actor,
    items: sortItems(document.items.map(normalizeCuratedItem))
  };

  const filePath = getNewsCurationPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(nextDocument, null, 2)}\n`, "utf8");

  await recordAuditLog({
    eventType: "admin_news_curation_saved",
    actor,
    status: "success",
    requestId,
    summary: "Curated news saved",
    metadata: {
      items: nextDocument.items.length
    }
  });

  return nextDocument;
}

export async function applyNewsCurationToRecommendations(
  source: RecommendationsResponseDto
): Promise<RecommendationsResponseDto> {
  const curation = await loadNewsCuration();
  const newsByTicker = groupByTicker(curation.items);

  return {
    ...source,
    items: source.items.map((item) => {
      const curated = newsByTicker.get(item.ticker)?.[0];
      if (!curated) {
        return item;
      }

      return {
        ...item,
        rationale: item.rationale.includes(curated.headline)
          ? item.rationale
          : `${item.rationale} 운영자 큐레이션 기사 '${curated.headline}'를 추가 확인했습니다.`
      };
    })
  };
}

export async function applyNewsCurationToAnalysis(
  source: AnalysisResponseDto
): Promise<AnalysisResponseDto> {
  const curation = await loadNewsCuration();
  const newsByTicker = groupByTicker(curation.items);

  return {
    ...source,
    items: source.items.map((item) => {
      const curated = newsByTicker.get(item.ticker) ?? [];
      if (!curated.length) {
        return item;
      }

      const mergedNews = dedupeNews([...curated.map(toAnalysisNews), ...item.newsImpact]).slice(0, 6);

      const nextDataQuality = item.dataQuality.map((entry) =>
        entry.label === "뉴스"
          ? {
              ...entry,
              value: `${mergedNews.length}건`,
              note: `${curated.length}건의 운영자 큐레이션 포함`
            }
          : entry
      );

      return {
        ...item,
        newsImpact: mergedNews,
        dataQuality: nextDataQuality
      };
    })
  };
}

export async function applyNewsCurationToTracking(
  source: TrackingResponseDto
): Promise<TrackingResponseDto> {
  const curation = await loadNewsCuration();
  const newsByTicker = groupByTicker(curation.items);

  return {
    ...source,
    details: Object.fromEntries(
      Object.entries(source.details).map(([historyId, detail]) => {
        const history = source.history.find((item) => item.id === historyId);
        const curated = history ? newsByTicker.get(history.ticker) ?? [] : [];

        if (!curated.length) {
          return [historyId, detail];
        }

        return [
          historyId,
          {
            ...detail,
            historicalNews: dedupeNews([...curated.map(toTrackingNews), ...detail.historicalNews]).slice(0, 8)
          }
        ];
      })
    )
  };
}