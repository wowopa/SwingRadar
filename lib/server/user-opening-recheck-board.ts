import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { loadRuntimeDocument, saveRuntimeDocument } from "@/lib/server/runtime-documents";
import { getRuntimePaths } from "@/lib/server/runtime-paths";
import type {
  OpeningActionIntent,
  OpeningConfirmationCheck,
  OpeningGapCheck,
  OpeningRecheckChecklist,
  OpeningRecheckDecision,
  OpeningRecheckStatus
} from "@/types/recommendation";

const USER_OPENING_RECHECK_DOCUMENT_NAME = "user-opening-recheck-board";
const MAX_STORED_SCANS = 30;

interface UserOpeningRecheckBoardEntry extends OpeningRecheckDecision {
  ticker: string;
}

interface UserOpeningRecheckBoardScan {
  scanKey: string;
  updatedAt: string;
  items: Record<string, UserOpeningRecheckBoardEntry>;
}

export interface UserOpeningRecheckScanSnapshot {
  scanKey: string;
  updatedAt: string;
  items: Record<string, UserOpeningRecheckBoardEntry>;
}

interface UserOpeningRecheckBoardDocument {
  scans: Record<string, UserOpeningRecheckBoardScan>;
}

interface UserOpeningRecheckBoardsDocument {
  boards: Record<string, UserOpeningRecheckBoardDocument>;
}

function getUserOpeningRecheckBoardPath() {
  return process.env.SWING_RADAR_USER_OPENING_RECHECK_FILE
    ? path.resolve(process.env.SWING_RADAR_USER_OPENING_RECHECK_FILE)
    : path.join(getRuntimePaths().usersDir, "opening-recheck-board.json");
}

function createEmptyBoard(): UserOpeningRecheckBoardDocument {
  return { scans: {} };
}

function createEmptyDocument(): UserOpeningRecheckBoardsDocument {
  return { boards: {} };
}

function normalizeGap(value: unknown): OpeningGapCheck | null {
  return ["normal", "elevated", "overheated"].includes(String(value)) ? (value as OpeningGapCheck) : null;
}

function normalizeConfirmation(value: unknown): OpeningConfirmationCheck | null {
  return ["confirmed", "mixed", "failed"].includes(String(value))
    ? (value as OpeningConfirmationCheck)
    : null;
}

function normalizeActionIntent(value: unknown): OpeningActionIntent | null {
  return ["review", "watch", "hold"].includes(String(value)) ? (value as OpeningActionIntent) : null;
}

function normalizeChecklist(value: unknown): OpeningRecheckChecklist | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const payload = value as Record<string, unknown>;
  const gap = normalizeGap(payload.gap);
  const confirmation = normalizeConfirmation(payload.confirmation);
  const action = normalizeActionIntent(payload.action);

  if (!gap || !confirmation || !action) {
    return undefined;
  }

  return { gap, confirmation, action };
}

function normalizeEntry(ticker: string, value: unknown): UserOpeningRecheckBoardEntry | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Record<string, unknown>;
  const status = payload.status;
  if (!["pending", "passed", "watch", "avoid", "excluded"].includes(String(status))) {
    return null;
  }

  const updatedAt = typeof payload.updatedAt === "string" && payload.updatedAt.trim() ? payload.updatedAt : null;
  if (!updatedAt) {
    return null;
  }

  return {
    ticker,
    status: status as OpeningRecheckStatus,
    updatedAt,
    updatedBy: typeof payload.updatedBy === "string" && payload.updatedBy.trim() ? payload.updatedBy : undefined,
    note: typeof payload.note === "string" && payload.note.trim() ? payload.note.trim() : undefined,
    checklist: normalizeChecklist(payload.checklist),
    suggestedStatus: ["passed", "watch", "avoid", "excluded"].includes(String(payload.suggestedStatus))
      ? (payload.suggestedStatus as Exclude<OpeningRecheckStatus, "pending">)
      : undefined
  };
}

function normalizeBoard(value: unknown): UserOpeningRecheckBoardDocument {
  if (!value || typeof value !== "object") {
    return createEmptyBoard();
  }

  const payload = value as Record<string, unknown>;
  const scansPayload = payload.scans;
  if (!scansPayload || typeof scansPayload !== "object") {
    return createEmptyBoard();
  }

  const scans = Object.fromEntries(
    Object.entries(scansPayload).flatMap(([scanKey, scanValue]) => {
      if (!scanValue || typeof scanValue !== "object") {
        return [];
      }

      const scanPayload = scanValue as Record<string, unknown>;
      const itemsPayload = scanPayload.items;
      const items =
        itemsPayload && typeof itemsPayload === "object"
          ? Object.fromEntries(
              Object.entries(itemsPayload).flatMap(([ticker, entry]) => {
                const normalized = normalizeEntry(ticker, entry);
                return normalized ? [[ticker, normalized]] : [];
              })
            )
          : {};

      const updatedAt =
        typeof scanPayload.updatedAt === "string" && scanPayload.updatedAt.trim()
          ? scanPayload.updatedAt
          : Object.values(items).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0]?.updatedAt ??
            new Date(0).toISOString();

      return [[scanKey, { scanKey, updatedAt, items } satisfies UserOpeningRecheckBoardScan]];
    })
  );

  return { scans };
}

function normalizeDocument(value: unknown): UserOpeningRecheckBoardsDocument {
  if (!value || typeof value !== "object") {
    return createEmptyDocument();
  }

  const payload = value as Record<string, unknown>;
  const boardsPayload = payload.boards;
  if (!boardsPayload || typeof boardsPayload !== "object") {
    return createEmptyDocument();
  }

  return {
    boards: Object.fromEntries(
      Object.entries(boardsPayload).map(([userId, boardValue]) => [userId, normalizeBoard(boardValue)])
    )
  };
}

async function loadDocument() {
  try {
    const content = await readFile(getUserOpeningRecheckBoardPath(), "utf8");
    return normalizeDocument(JSON.parse(content.replace(/^\uFEFF/, "")));
  } catch {
    const runtimeDocument =
      await loadRuntimeDocument<UserOpeningRecheckBoardsDocument>(USER_OPENING_RECHECK_DOCUMENT_NAME);
    return normalizeDocument(runtimeDocument);
  }
}

async function saveDocument(document: UserOpeningRecheckBoardsDocument) {
  const normalized = normalizeDocument(document);
  await mkdir(path.dirname(getUserOpeningRecheckBoardPath()), { recursive: true });
  await writeFile(getUserOpeningRecheckBoardPath(), `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  await saveRuntimeDocument(USER_OPENING_RECHECK_DOCUMENT_NAME, normalized);
}

function trimBoard(board: UserOpeningRecheckBoardDocument) {
  const orderedScans = Object.values(board.scans).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  return {
    scans: Object.fromEntries(orderedScans.slice(0, MAX_STORED_SCANS).map((scan) => [scan.scanKey, scan]))
  } satisfies UserOpeningRecheckBoardDocument;
}

export async function listUserOpeningRecheckDecisions(userId: string | null | undefined, scanKey: string) {
  if (!userId || !scanKey) {
    return {};
  }

  const document = await loadDocument();
  return document.boards[userId]?.scans[scanKey]?.items ?? {};
}

export async function listUserOpeningRecheckScans(
  userId: string | null | undefined
): Promise<UserOpeningRecheckScanSnapshot[]> {
  if (!userId) {
    return [];
  }

  const document = await loadDocument();
  return Object.values(document.boards[userId]?.scans ?? {}).sort((left, right) => {
    return right.updatedAt.localeCompare(left.updatedAt);
  });
}

export async function saveUserOpeningRecheckDecision(input: {
  userId: string;
  scanKey: string;
  ticker: string;
  status: OpeningRecheckStatus;
  updatedBy: string;
  note?: string;
  checklist?: OpeningRecheckChecklist;
  suggestedStatus?: Exclude<OpeningRecheckStatus, "pending">;
}) {
  const document = await loadDocument();
  const userBoard = document.boards[input.userId] ?? createEmptyBoard();
  const existingScan = userBoard.scans[input.scanKey] ?? {
    scanKey: input.scanKey,
    updatedAt: new Date(0).toISOString(),
    items: {}
  };
  const updatedAt = new Date().toISOString();

  if (input.status === "pending") {
    delete existingScan.items[input.ticker];
  } else {
    existingScan.items[input.ticker] = {
      ticker: input.ticker,
      status: input.status,
      updatedAt,
      updatedBy: input.updatedBy,
      note: input.note?.trim() ? input.note.trim() : undefined,
      checklist: input.checklist,
      suggestedStatus: input.suggestedStatus
    };
  }

  existingScan.updatedAt = updatedAt;
  if (Object.keys(existingScan.items).length) {
    userBoard.scans[input.scanKey] = existingScan;
  } else {
    delete userBoard.scans[input.scanKey];
  }

  if (Object.keys(userBoard.scans).length) {
    document.boards[input.userId] = trimBoard(userBoard);
  } else {
    delete document.boards[input.userId];
  }

  await saveDocument(document);
  return existingScan.items[input.ticker] ?? null;
}

export async function clearUserOpeningRecheckDecisions(userId: string, scanKey: string) {
  const document = await loadDocument();
  const userBoard = document.boards[userId];
  if (!userBoard) {
    return;
  }

  delete userBoard.scans[scanKey];
  if (Object.keys(userBoard.scans).length) {
    document.boards[userId] = trimBoard(userBoard);
  } else {
    delete document.boards[userId];
  }

  await saveDocument(document);
}

export async function deleteUserOpeningRecheckBoardForUser(userId: string) {
  const document = await loadDocument();
  if (!document.boards[userId]) {
    return false;
  }

  delete document.boards[userId];
  await saveDocument(document);
  return true;
}
