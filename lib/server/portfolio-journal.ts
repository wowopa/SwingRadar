import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { loadRuntimeDocument, saveRuntimeDocument } from "@/lib/server/runtime-documents";
import { getRuntimePaths } from "@/lib/server/runtime-paths";
import { getSymbolByTicker, resolveTicker } from "@/lib/server/runtime-symbol-master";
import type { PortfolioJournal, PortfolioTradeEvent, PortfolioTradeEventType } from "@/types/recommendation";

const USER_PORTFOLIO_JOURNALS_DOCUMENT_NAME = "user-portfolio-journals";
const DEFAULT_JOURNAL_UPDATED_AT = new Date(0).toISOString();

interface UserPortfolioJournalsDocument {
  journals: Record<string, PortfolioJournal>;
}

const tradeEventTypes = new Set<PortfolioTradeEventType>([
  "buy",
  "add",
  "take_profit_partial",
  "exit_full",
  "stop_loss",
  "manual_exit"
]);

export function createEmptyPortfolioJournal(): PortfolioJournal {
  return {
    events: [],
    updatedAt: DEFAULT_JOURNAL_UPDATED_AT,
    updatedBy: "system"
  };
}

function getUserPortfolioJournalsPath() {
  return process.env.SWING_RADAR_USER_PORTFOLIO_JOURNALS_FILE
    ? path.resolve(process.env.SWING_RADAR_USER_PORTFOLIO_JOURNALS_FILE)
    : path.join(getRuntimePaths().usersDir, "portfolio-journals.json");
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

function normalizeNonNegativeNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function normalizePositiveNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

function normalizeTradeEventType(value: unknown): PortfolioTradeEventType | null {
  return typeof value === "string" && tradeEventTypes.has(value as PortfolioTradeEventType)
    ? (value as PortfolioTradeEventType)
    : null;
}

function normalizeTradeTimestamp(value: unknown, fallback: string) {
  if (typeof value !== "string" || !value.trim()) {
    return fallback;
  }

  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? fallback : timestamp.toISOString();
}

function normalizeTradeEvent(value: unknown): PortfolioTradeEvent | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Record<string, unknown>;
  const type = normalizeTradeEventType(payload.type);
  const rawTicker = typeof payload.ticker === "string" ? payload.ticker.trim() : "";
  if (!type || !rawTicker) {
    return null;
  }

  const ticker = resolveTicker(rawTicker);
  const quantity = normalizePositiveNumber(payload.quantity, 0);
  const price = normalizePositiveNumber(payload.price, 0);
  if (quantity <= 0 || price <= 0) {
    return null;
  }

  const symbol = getSymbolByTicker(ticker);
  const company =
    symbol?.company ??
    (typeof payload.company === "string" && payload.company.trim() ? payload.company.trim() : ticker);
  const sector =
    symbol?.sector ??
    (typeof payload.sector === "string" && payload.sector.trim() ? payload.sector.trim() : "미분류");
  const createdAt = normalizeTradeTimestamp(payload.createdAt, new Date().toISOString());

  return {
    id: typeof payload.id === "string" && payload.id.trim() ? payload.id.trim() : randomUUID(),
    ticker,
    company,
    sector,
    type,
    quantity,
    price,
    fees: normalizeNonNegativeNumber(payload.fees, 0),
    tradedAt: normalizeTradeTimestamp(payload.tradedAt, createdAt),
    note: normalizeOptionalString(payload.note),
    createdAt,
    createdBy:
      typeof payload.createdBy === "string" && payload.createdBy.trim() ? payload.createdBy.trim() : "system"
  };
}

function sortTradeEvents(events: PortfolioTradeEvent[]) {
  return [...events].sort((left, right) => {
    const tradedAtDiff = new Date(right.tradedAt).getTime() - new Date(left.tradedAt).getTime();
    if (tradedAtDiff !== 0) {
      return tradedAtDiff;
    }

    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}

function normalizePortfolioJournal(value: unknown): PortfolioJournal {
  if (!value || typeof value !== "object") {
    return createEmptyPortfolioJournal();
  }

  const payload = value as Record<string, unknown>;
  const empty = createEmptyPortfolioJournal();
  const events = Array.isArray(payload.events)
    ? payload.events
        .map((event) => normalizeTradeEvent(event))
        .filter((event): event is PortfolioTradeEvent => Boolean(event))
    : [];

  return {
    events: sortTradeEvents(events),
    updatedAt:
      typeof payload.updatedAt === "string" && payload.updatedAt.trim() ? payload.updatedAt : empty.updatedAt,
    updatedBy:
      typeof payload.updatedBy === "string" && payload.updatedBy.trim() ? payload.updatedBy : empty.updatedBy
  };
}

function normalizeUserPortfolioJournalsDocument(value: unknown): UserPortfolioJournalsDocument {
  if (!value || typeof value !== "object") {
    return { journals: {} };
  }

  const payload = value as Record<string, unknown>;
  const journalsPayload = payload.journals;
  if (!journalsPayload || typeof journalsPayload !== "object") {
    return { journals: {} };
  }

  return {
    journals: Object.fromEntries(
      Object.entries(journalsPayload).map(([userId, journalValue]) => [userId, normalizePortfolioJournal(journalValue)])
    )
  };
}

async function loadUserPortfolioJournalsDocument() {
  try {
    const content = await readFile(getUserPortfolioJournalsPath(), "utf8");
    return normalizeUserPortfolioJournalsDocument(JSON.parse(content.replace(/^\uFEFF/, "")));
  } catch {
    const runtimeDocument =
      await loadRuntimeDocument<UserPortfolioJournalsDocument>(USER_PORTFOLIO_JOURNALS_DOCUMENT_NAME);
    return normalizeUserPortfolioJournalsDocument(runtimeDocument);
  }
}

async function saveUserPortfolioJournalsDocument(document: UserPortfolioJournalsDocument) {
  const normalized = normalizeUserPortfolioJournalsDocument(document);
  await mkdir(path.dirname(getUserPortfolioJournalsPath()), { recursive: true });
  await writeFile(getUserPortfolioJournalsPath(), `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  await saveRuntimeDocument(USER_PORTFOLIO_JOURNALS_DOCUMENT_NAME, normalized);
  return normalized;
}

export async function loadPortfolioJournalForUser(userId?: string | null) {
  if (!userId) {
    return createEmptyPortfolioJournal();
  }

  const document = await loadUserPortfolioJournalsDocument();
  return normalizePortfolioJournal(document.journals[userId]);
}

export async function appendPortfolioTradeEventForUser(
  userId: string,
  event: Omit<PortfolioTradeEvent, "id" | "createdAt" | "createdBy" | "company" | "sector"> & {
    createdBy: string;
  }
) {
  const document = await loadUserPortfolioJournalsDocument();
  const current = normalizePortfolioJournal(document.journals[userId]);
  const normalizedEvent = normalizeTradeEvent({
    ...event,
    createdBy: event.createdBy,
    createdAt: new Date().toISOString()
  });

  if (!normalizedEvent) {
    throw new Error("거래 이벤트를 저장할 수 없습니다.");
  }

  document.journals[userId] = {
    events: sortTradeEvents([normalizedEvent, ...current.events]),
    updatedAt: new Date().toISOString(),
    updatedBy: event.createdBy
  };

  await saveUserPortfolioJournalsDocument(document);
  return {
    event: normalizedEvent,
    journal: document.journals[userId]
  };
}
