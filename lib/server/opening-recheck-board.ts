import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { loadRuntimeDocument, saveRuntimeDocument } from "@/lib/server/runtime-documents";
import { getRuntimePaths } from "@/lib/server/runtime-paths";
import type { OpeningRecheckDecision, OpeningRecheckStatus } from "@/types/recommendation";

const OPENING_RECHECK_DOCUMENT_NAME = "opening-recheck-board";
const MAX_STORED_SCANS = 30;

export interface OpeningRecheckBoardEntry extends OpeningRecheckDecision {
  ticker: string;
}

interface OpeningRecheckBoardScan {
  scanKey: string;
  updatedAt: string;
  items: Record<string, OpeningRecheckBoardEntry>;
}

interface OpeningRecheckBoardDocument {
  scans: Record<string, OpeningRecheckBoardScan>;
}

function getOpeningRecheckBoardPath() {
  return process.env.SWING_RADAR_OPENING_RECHECK_FILE
    ? path.resolve(process.env.SWING_RADAR_OPENING_RECHECK_FILE)
    : path.join(getRuntimePaths().universeDir, "opening-recheck-board.json");
}

function createEmptyDocument(): OpeningRecheckBoardDocument {
  return { scans: {} };
}

function normalizeEntry(ticker: string, value: unknown): OpeningRecheckBoardEntry | null {
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
    note: typeof payload.note === "string" && payload.note.trim() ? payload.note.trim() : undefined
  };
}

function normalizeDocument(value: unknown): OpeningRecheckBoardDocument {
  if (!value || typeof value !== "object") {
    return createEmptyDocument();
  }

  const payload = value as Record<string, unknown>;
  const scansPayload = payload.scans;
  if (!scansPayload || typeof scansPayload !== "object") {
    return createEmptyDocument();
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

      return [[scanKey, { scanKey, updatedAt, items } satisfies OpeningRecheckBoardScan]];
    })
  );

  return { scans };
}

async function loadDocument(): Promise<OpeningRecheckBoardDocument> {
  try {
    const content = await readFile(getOpeningRecheckBoardPath(), "utf8");
    return normalizeDocument(JSON.parse(content.replace(/^\uFEFF/, "")));
  } catch {
    const runtimeDocument = await loadRuntimeDocument<OpeningRecheckBoardDocument>(OPENING_RECHECK_DOCUMENT_NAME);
    return normalizeDocument(runtimeDocument);
  }
}

async function saveDocument(document: OpeningRecheckBoardDocument) {
  const normalized = normalizeDocument(document);
  await mkdir(path.dirname(getOpeningRecheckBoardPath()), { recursive: true });
  await writeFile(getOpeningRecheckBoardPath(), `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  await saveRuntimeDocument(OPENING_RECHECK_DOCUMENT_NAME, normalized);
}

function trimDocument(document: OpeningRecheckBoardDocument) {
  const orderedScans = Object.values(document.scans).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  return {
    scans: Object.fromEntries(orderedScans.slice(0, MAX_STORED_SCANS).map((scan) => [scan.scanKey, scan]))
  } satisfies OpeningRecheckBoardDocument;
}

export async function listOpeningRecheckDecisions(scanKey: string) {
  const document = await loadDocument();
  return document.scans[scanKey]?.items ?? {};
}

export async function saveOpeningRecheckDecision(input: {
  scanKey: string;
  ticker: string;
  status: OpeningRecheckStatus;
  updatedBy: string;
  note?: string;
}) {
  const document = await loadDocument();
  const existingScan = document.scans[input.scanKey] ?? {
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
      note: input.note?.trim() ? input.note.trim() : undefined
    };
  }

  existingScan.updatedAt = updatedAt;
  if (Object.keys(existingScan.items).length) {
    document.scans[input.scanKey] = existingScan;
  } else {
    delete document.scans[input.scanKey];
  }

  await saveDocument(trimDocument(document));

  return existingScan.items[input.ticker] ?? null;
}

export async function clearOpeningRecheckDecisions(scanKey: string) {
  const document = await loadDocument();
  delete document.scans[scanKey];
  await saveDocument(trimDocument(document));
}
