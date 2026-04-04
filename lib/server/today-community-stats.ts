import { readFile } from "node:fs/promises";
import path from "node:path";

import type {
  TodayCommunityStatDto,
  TodayCommunityStatsDto
} from "@/lib/api-contracts/swing-radar";
import { loadRuntimeDocument } from "@/lib/server/runtime-documents";
import { getRuntimePaths } from "@/lib/server/runtime-paths";
import { getSymbolByTicker } from "@/lib/server/runtime-symbol-master";

const USER_PORTFOLIO_PROFILES_DOCUMENT_NAME = "user-portfolio-profiles";
const USER_PORTFOLIO_JOURNALS_DOCUMENT_NAME = "user-portfolio-journals";
const USER_OPENING_RECHECK_DOCUMENT_NAME = "user-opening-recheck-board";
const DEFAULT_TIME_ZONE = "Asia/Seoul";

interface UserPortfolioProfilesDocument {
  profiles: Record<string, { positions?: Array<{ ticker?: string; company?: string }> }>;
}

interface UserPortfolioJournalsDocument {
  journals: Record<
    string,
    {
      events?: Array<{
        ticker?: string;
        company?: string;
        type?: string;
        tradedAt?: string;
      }>;
    }
  >;
}

interface UserOpeningRecheckBoardsDocument {
  boards: Record<
    string,
    {
      scans?: Record<
        string,
        {
          items?: Record<string, { ticker?: string }>;
        }
      >;
    }
  >;
}

interface TodayCommunityAggregationDocuments {
  profiles: UserPortfolioProfilesDocument;
  journals: UserPortfolioJournalsDocument;
  openingBoards: UserOpeningRecheckBoardsDocument;
}

function getUserPortfolioProfilesPath() {
  return process.env.SWING_RADAR_USER_PORTFOLIO_PROFILES_FILE
    ? path.resolve(process.env.SWING_RADAR_USER_PORTFOLIO_PROFILES_FILE)
    : path.join(getRuntimePaths().usersDir, "portfolio-profiles.json");
}

function getUserPortfolioJournalsPath() {
  return process.env.SWING_RADAR_USER_PORTFOLIO_JOURNALS_FILE
    ? path.resolve(process.env.SWING_RADAR_USER_PORTFOLIO_JOURNALS_FILE)
    : path.join(getRuntimePaths().usersDir, "portfolio-journals.json");
}

function getUserOpeningRecheckBoardPath() {
  return process.env.SWING_RADAR_USER_OPENING_RECHECK_FILE
    ? path.resolve(process.env.SWING_RADAR_USER_OPENING_RECHECK_FILE)
    : path.join(getRuntimePaths().usersDir, "opening-recheck-board.json");
}

function normalizeProfilesDocument(value: unknown): UserPortfolioProfilesDocument {
  if (!value || typeof value !== "object") {
    return { profiles: {} };
  }

  const payload = value as Record<string, unknown>;
  const profiles = payload.profiles;
  if (!profiles || typeof profiles !== "object") {
    return { profiles: {} };
  }

  return { profiles: profiles as UserPortfolioProfilesDocument["profiles"] };
}

function normalizeJournalsDocument(value: unknown): UserPortfolioJournalsDocument {
  if (!value || typeof value !== "object") {
    return { journals: {} };
  }

  const payload = value as Record<string, unknown>;
  const journals = payload.journals;
  if (!journals || typeof journals !== "object") {
    return { journals: {} };
  }

  return { journals: journals as UserPortfolioJournalsDocument["journals"] };
}

function normalizeOpeningBoardsDocument(value: unknown): UserOpeningRecheckBoardsDocument {
  if (!value || typeof value !== "object") {
    return { boards: {} };
  }

  const payload = value as Record<string, unknown>;
  const boards = payload.boards;
  if (!boards || typeof boards !== "object") {
    return { boards: {} };
  }

  return { boards: boards as UserOpeningRecheckBoardsDocument["boards"] };
}

async function loadJsonDocument<T>(
  filePath: string,
  documentName: string,
  normalize: (value: unknown) => T
) {
  try {
    const content = await readFile(filePath, "utf8");
    return normalize(JSON.parse(content.replace(/^\uFEFF/, "")));
  } catch {
    const runtimeDocument = await loadRuntimeDocument(documentName);
    return normalize(runtimeDocument);
  }
}

async function loadTodayCommunityAggregationDocuments(): Promise<TodayCommunityAggregationDocuments> {
  const [profiles, journals, openingBoards] = await Promise.all([
    loadJsonDocument(
      getUserPortfolioProfilesPath(),
      USER_PORTFOLIO_PROFILES_DOCUMENT_NAME,
      normalizeProfilesDocument
    ),
    loadJsonDocument(
      getUserPortfolioJournalsPath(),
      USER_PORTFOLIO_JOURNALS_DOCUMENT_NAME,
      normalizeJournalsDocument
    ),
    loadJsonDocument(
      getUserOpeningRecheckBoardPath(),
      USER_OPENING_RECHECK_DOCUMENT_NAME,
      normalizeOpeningBoardsDocument
    )
  ]);

  return { profiles, journals, openingBoards };
}

function toDateKey(value: string | Date, timeZone = DEFAULT_TIME_ZONE) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(typeof value === "string" ? new Date(value) : value);
}

function pickTopTicker(
  counts: Map<string, { count: number; company?: string }>,
  noteBuilder: (count: number) => string,
  label: TodayCommunityStatDto["label"],
  tone: TodayCommunityStatDto["tone"]
): TodayCommunityStatDto | null {
  const topEntry = [...counts.entries()].sort((left, right) => {
    if (right[1].count !== left[1].count) {
      return right[1].count - left[1].count;
    }

    return left[0].localeCompare(right[0], "ko");
  })[0];

  if (!topEntry || topEntry[1].count <= 0) {
    return null;
  }

  const [ticker, meta] = topEntry;
  const company = meta.company?.trim() || getSymbolByTicker(ticker)?.company || ticker;

  return {
    label,
    tone,
    ticker,
    company,
    count: meta.count,
    countLabel: `${meta.count}명`,
    note: noteBuilder(meta.count)
  };
}

export function buildTodayCommunityStatsFromDocuments(
  documents: TodayCommunityAggregationDocuments,
  options?: {
    scanKey?: string | null;
    now?: Date;
    timeZone?: string;
  }
): TodayCommunityStatsDto | undefined {
  const timeZone = options?.timeZone ?? DEFAULT_TIME_ZONE;
  const todayKey = toDateKey(options?.now ?? new Date(), timeZone);

  const buyCounts = new Map<string, { count: number; company?: string }>();
  const holdingCounts = new Map<string, { count: number; company?: string }>();
  const openingCounts = new Map<string, { count: number; company?: string }>();

  for (const [userId, journal] of Object.entries(documents.journals.journals)) {
    const seenBuyTickers = new Set<string>();
    for (const event of journal.events ?? []) {
      if (!event?.ticker || !event?.tradedAt) {
        continue;
      }

      if (event.type !== "buy" && event.type !== "add") {
        continue;
      }

      if (toDateKey(event.tradedAt, timeZone) !== todayKey) {
        continue;
      }

      if (seenBuyTickers.has(event.ticker)) {
        continue;
      }

      seenBuyTickers.add(event.ticker);
      const current = buyCounts.get(event.ticker) ?? { count: 0, company: event.company };
      buyCounts.set(event.ticker, {
        count: current.count + 1,
        company: current.company ?? event.company
      });
    }

    const positions = documents.profiles.profiles[userId]?.positions ?? [];
    const seenHeldTickers = new Set<string>();
    for (const position of positions) {
      if (!position?.ticker || seenHeldTickers.has(position.ticker)) {
        continue;
      }

      seenHeldTickers.add(position.ticker);
      const current = holdingCounts.get(position.ticker) ?? { count: 0, company: position.company };
      holdingCounts.set(position.ticker, {
        count: current.count + 1,
        company: current.company ?? position.company
      });
    }

    const scanKey = options?.scanKey;
    if (!scanKey) {
      continue;
    }

    const scan = documents.openingBoards.boards[userId]?.scans?.[scanKey];
    if (!scan?.items) {
      continue;
    }

    for (const [ticker, item] of Object.entries(scan.items)) {
      const normalizedTicker = item?.ticker?.trim() || ticker;
      const current = openingCounts.get(normalizedTicker) ?? { count: 0 };
      openingCounts.set(normalizedTicker, {
        count: current.count + 1,
        company: current.company
      });
    }
  }

  const stats = [
    pickTopTicker(
      buyCounts,
      (count) => `오늘 매수 시도를 남긴 사용자가 ${count}명입니다.`,
      "오늘의 인기 매수 시도",
      "positive"
    ),
    pickTopTicker(
      holdingCounts,
      (count) => `현재 가장 많이 보유 중인 사용자가 ${count}명입니다.`,
      "가장 많이 보유 중",
      "neutral"
    ),
    pickTopTicker(
      openingCounts,
      (count) => `오늘 장초 확인에서 가장 많이 체크된 종목입니다. ${count}명이 확인했습니다.`,
      "장초 확인 최다 종목",
      "caution"
    )
  ].filter((item): item is TodayCommunityStatDto => Boolean(item));

  if (!stats.length) {
    return undefined;
  }

  return {
    headline: "오늘 다른 사용자 흐름",
    note: "개인 정보 없이 익명 집계한 보조 통계입니다.",
    stats
  };
}

export async function buildTodayCommunityStats(options?: {
  scanKey?: string | null;
  now?: Date;
  timeZone?: string;
}) {
  const documents = await loadTodayCommunityAggregationDocuments();
  return buildTodayCommunityStatsFromDocuments(documents, options);
}
