import { mkdir, readFile, writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import path from "path";

import type {
  AnalysisResponseDto,
  RecommendationsResponseDto,
  TrackingResponseDto
} from "@/lib/api-contracts/swing-radar";
import { ApiError } from "@/lib/server/api-error";
import { recordAuditLog } from "@/lib/server/audit-log";
import { ingestSnapshotBundle, loadSnapshotBundleFromDisk } from "@/lib/server/postgres-ingest";

export interface EditorialDraftItem {
  ticker: string;
  recommendation: {
    signalLabel: string;
    rationale: string;
    invalidation: string;
    checkpoints: string[];
  };
  analysis: {
    headline: string;
    invalidation: string;
    decisionNotes: string[];
  };
  operatorNote: string;
}

export interface EditorialDraftDocument {
  updatedAt: string;
  updatedBy: string;
  items: EditorialDraftItem[];
}

export interface EditorialDraftCatalogItem {
  ticker: string;
  company: string;
  signalTone: string;
  score: number;
}

export interface EditorialDraftFieldChange {
  field: string;
  label: string;
  before: string;
  after: string;
}

export interface EditorialDraftDiffItem {
  ticker: string;
  company: string;
  score: number;
  changes: string[];
  details: EditorialDraftFieldChange[];
}

export interface SnapshotBundle {
  recommendations: RecommendationsResponseDto;
  analysis: AnalysisResponseDto;
  tracking: TrackingResponseDto;
}

export interface PublishHistoryEntry {
  id: string;
  publishedAt: string;
  publishedBy: string;
  requestId: string;
  approvalStage: string;
  rollbackReason?: string;
  tickers: number;
  diffCount: number;
  notes: string[];
  changes: EditorialDraftDiffItem[];
  bundle: SnapshotBundle;
}

export interface PublishHistorySummary {
  id: string;
  publishedAt: string;
  publishedBy: string;
  requestId: string;
  approvalStage: string;
  rollbackReason?: string;
  tickers: number;
  diffCount: number;
  notes: string[];
  changes: EditorialDraftDiffItem[];
}

export interface EditorialDraftPayload {
  draft: EditorialDraftDocument;
  catalog: EditorialDraftCatalogItem[];
  diff: EditorialDraftDiffItem[];
  publishHistory: PublishHistorySummary[];
}

interface PublishOptions {
  actor: string;
  requestId: string;
  ingestToPostgres?: boolean;
  approvalStage?: "editorial_review" | "risk_review" | "final_publish";
}

interface RollbackOptions extends PublishOptions {
  historyId: string;
  rollbackReason?: string;
}

const LABELS: Record<string, string> = {
  "recommendation.signalLabel": "\uC2E0\uD638 \uB77C\uBCA8",
  "recommendation.rationale": "\uADFC\uAC70",
  "recommendation.invalidation": "\uBB34\uD6A8\uD654",
  "recommendation.checkpoints": "\uCCB4\uD06C\uD3EC\uC778\uD2B8",
  "analysis.headline": "\uBD84\uC11D \uD5E4\uB4DC\uB77C\uC778",
  "analysis.invalidation": "\uBD84\uC11D \uBB34\uD6A8\uD654",
  "analysis.decisionNotes": "\uC758\uC0AC\uACB0\uC815 \uBA54\uBAA8",
  operatorNote: "\uC6B4\uC601 \uBA54\uBAA8"
};

function getAdminRoot() {
  return process.env.SWING_RADAR_EDITORIAL_DIR
    ? path.resolve(process.env.SWING_RADAR_EDITORIAL_DIR)
    : path.resolve(process.cwd(), "data/admin");
}

function getDraftPath() {
  return path.join(getAdminRoot(), "editorial-draft.json");
}

function getPublishHistoryPath() {
  return path.join(getAdminRoot(), "publish-history.json");
}

function getLiveDataDir() {
  return process.env.SWING_RADAR_DATA_DIR
    ? path.resolve(process.env.SWING_RADAR_DATA_DIR)
    : path.resolve(process.cwd(), "data/live");
}

function toMultiline(value: string[]) {
  return value.join("\n");
}

function createFieldChange(field: string, before: string, after: string): EditorialDraftFieldChange | null {
  if (before === after) {
    return null;
  }

  return {
    field,
    label: LABELS[field] ?? field,
    before,
    after
  };
}

function createDefaultDraft(bundle: Pick<SnapshotBundle, "recommendations" | "analysis">): EditorialDraftDocument {
  return {
    updatedAt: new Date().toISOString(),
    updatedBy: "system",
    items: bundle.recommendations.items.map((item) => {
      const analysis = bundle.analysis.items.find((entry) => entry.ticker === item.ticker);
      return {
        ticker: item.ticker,
        recommendation: {
          signalLabel: item.signalLabel,
          rationale: item.rationale,
          invalidation: item.invalidation,
          checkpoints: item.checkpoints
        },
        analysis: {
          headline: analysis?.headline ?? "",
          invalidation: analysis?.invalidation ?? item.invalidation,
          decisionNotes: analysis?.decisionNotes ?? []
        },
        operatorNote: ""
      } satisfies EditorialDraftItem;
    })
  };
}

function sanitizePublishHistory(entries: PublishHistoryEntry[]): PublishHistorySummary[] {
  return entries.map((entry) => {
    const { bundle, ...summary } = entry;
    void bundle;
    return summary;
  });
}

function buildDraftDiff(bundle: Pick<SnapshotBundle, "recommendations" | "analysis">, draft: EditorialDraftDocument): EditorialDraftDiffItem[] {
  return draft.items
    .map((item) => {
      const recommendation = bundle.recommendations.items.find((entry) => entry.ticker === item.ticker);
      const analysis = bundle.analysis.items.find((entry) => entry.ticker === item.ticker);

      if (!recommendation || !analysis) {
        return null;
      }

      const details = [
        createFieldChange("recommendation.signalLabel", recommendation.signalLabel, item.recommendation.signalLabel),
        createFieldChange("recommendation.rationale", recommendation.rationale, item.recommendation.rationale),
        createFieldChange("recommendation.invalidation", recommendation.invalidation, item.recommendation.invalidation),
        createFieldChange("recommendation.checkpoints", toMultiline(recommendation.checkpoints), toMultiline(item.recommendation.checkpoints)),
        createFieldChange("analysis.headline", analysis.headline, item.analysis.headline),
        createFieldChange("analysis.invalidation", analysis.invalidation, item.analysis.invalidation),
        createFieldChange("analysis.decisionNotes", toMultiline(analysis.decisionNotes), toMultiline(item.analysis.decisionNotes)),
        createFieldChange("operatorNote", "", item.operatorNote)
      ].filter((change): change is EditorialDraftFieldChange => change !== null);

      if (!details.length) {
        return null;
      }

      return {
        ticker: item.ticker,
        company: recommendation.company,
        score: recommendation.score,
        changes: details.map((detail) => detail.label),
        details
      } satisfies EditorialDraftDiffItem;
    })
    .filter((item): item is EditorialDraftDiffItem => item !== null);
}

async function loadPublishHistory(): Promise<PublishHistoryEntry[]> {
  try {
    const content = await readFile(getPublishHistoryPath(), "utf8");
    return JSON.parse(content) as PublishHistoryEntry[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }

    return [];
  }
}

async function savePublishHistory(entries: PublishHistoryEntry[]) {
  const historyPath = getPublishHistoryPath();
  await mkdir(path.dirname(historyPath), { recursive: true });
  await writeFile(historyPath, `${JSON.stringify(entries, null, 2)}\n`, "utf8");
}

export async function loadEditorialDraft(): Promise<EditorialDraftPayload> {
  const bundle = await loadSnapshotBundleFromDisk();
  const catalog = bundle.recommendations.items.map((item) => ({
    ticker: item.ticker,
    company: item.company,
    signalTone: item.signalTone,
    score: item.score
  }));

  let draft: EditorialDraftDocument;
  try {
    const content = await readFile(getDraftPath(), "utf8");
    draft = JSON.parse(content) as EditorialDraftDocument;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }

    draft = createDefaultDraft(bundle);
  }

  const publishHistory = await loadPublishHistory();

  return {
    draft,
    catalog,
    diff: buildDraftDiff(bundle, draft),
    publishHistory: sanitizePublishHistory(publishHistory)
  };
}

export async function saveEditorialDraft(draft: EditorialDraftDocument, actor: string, requestId: string) {
  const draftPath = getDraftPath();
  await mkdir(path.dirname(draftPath), { recursive: true });

  const normalizedDraft: EditorialDraftDocument = {
    ...draft,
    updatedAt: new Date().toISOString(),
    updatedBy: actor
  };

  await writeFile(draftPath, `${JSON.stringify(normalizedDraft, null, 2)}\n`, "utf8");
  await recordAuditLog({
    eventType: "admin_draft_saved",
    actor,
    status: "success",
    requestId,
    summary: "Editorial draft saved",
    metadata: { tickerCount: normalizedDraft.items.length }
  });

  return normalizedDraft;
}

function mergeDraftIntoBundle(bundle: SnapshotBundle, draft: EditorialDraftDocument): SnapshotBundle {
  const publishedAt = new Date().toISOString();

  const nextRecommendations = bundle.recommendations.items.map((item) => {
    const draftItem = draft.items.find((entry) => entry.ticker === item.ticker);
    if (!draftItem) {
      return item;
    }

    return {
      ...item,
      signalLabel: draftItem.recommendation.signalLabel,
      rationale: draftItem.recommendation.rationale,
      invalidation: draftItem.recommendation.invalidation,
      checkpoints: draftItem.recommendation.checkpoints,
      updatedAt: publishedAt
    };
  });

  const nextAnalysis = bundle.analysis.items.map((item) => {
    const draftItem = draft.items.find((entry) => entry.ticker === item.ticker);
    if (!draftItem) {
      return item;
    }

    return {
      ...item,
      headline: draftItem.analysis.headline,
      invalidation: draftItem.analysis.invalidation,
      decisionNotes: draftItem.analysis.decisionNotes
    };
  });

  return {
    recommendations: {
      ...bundle.recommendations,
      generatedAt: publishedAt,
      items: nextRecommendations
    },
    analysis: {
      ...bundle.analysis,
      generatedAt: publishedAt,
      items: nextAnalysis
    },
    tracking: {
      ...bundle.tracking,
      generatedAt: publishedAt
    }
  };
}

async function writeLiveBundle(bundle: SnapshotBundle) {
  const dataDir = getLiveDataDir();
  await mkdir(dataDir, { recursive: true });

  await Promise.all([
    writeFile(path.join(dataDir, "recommendations.json"), `${JSON.stringify(bundle.recommendations, null, 2)}\n`, "utf8"),
    writeFile(path.join(dataDir, "analysis.json"), `${JSON.stringify(bundle.analysis, null, 2)}\n`, "utf8"),
    writeFile(path.join(dataDir, "tracking.json"), `${JSON.stringify(bundle.tracking, null, 2)}\n`, "utf8")
  ]);
}

function buildPublishNotes(diff: EditorialDraftDiffItem[]): string[] {
  return diff.slice(0, 8).map((item) => `${item.ticker}: ${item.changes.join(", ")}`);
}

export async function publishEditorialDraft(options: PublishOptions) {
  const currentBundle = await loadSnapshotBundleFromDisk();
  const { draft, diff } = await loadEditorialDraft();
  const nextBundle = mergeDraftIntoBundle(currentBundle, draft);

  await writeLiveBundle(nextBundle);
  await saveEditorialDraft(createDefaultDraft(nextBundle), options.actor, options.requestId);

  const publishHistory = await loadPublishHistory();
  const entry: PublishHistoryEntry = {
    id: randomUUID(),
    publishedAt: nextBundle.recommendations.generatedAt,
    publishedBy: options.actor,
    requestId: options.requestId,
    approvalStage: options.approvalStage ?? "final_publish",
    tickers: nextBundle.recommendations.items.length,
    diffCount: diff.length,
    notes: buildPublishNotes(diff),
    changes: diff,
    bundle: nextBundle
  };

  await savePublishHistory([entry, ...publishHistory]);

  if (options.ingestToPostgres) {
    await ingestSnapshotBundle(nextBundle, {
      requestId: options.requestId,
      actor: options.actor
    });
  }

  await recordAuditLog({
    eventType: "admin_publish",
    actor: options.actor,
    status: "success",
    requestId: options.requestId,
    summary: "Editorial draft published",
    metadata: {
      historyId: entry.id,
      diffCount: entry.diffCount,
      tickers: entry.tickers,
      changedFields: diff.flatMap((item) => item.details.map((detail) => `${item.ticker}:${detail.field}`)),
      ingestToPostgres: Boolean(options.ingestToPostgres)
    }
  });

  return {
    id: entry.id,
    publishedAt: entry.publishedAt,
    diffCount: entry.diffCount,
    tickers: entry.tickers,
    notes: entry.notes
  };
}

export async function rollbackPublishedSnapshot(options: RollbackOptions) {
  const history = await loadPublishHistory();
  const target = history.find((entry) => entry.id === options.historyId);

  if (!target) {
    throw new ApiError(404, "EDITORIAL_HISTORY_NOT_FOUND", "Publish history entry was not found", {
      historyId: options.historyId
    });
  }

  await writeLiveBundle(target.bundle);
  await saveEditorialDraft(createDefaultDraft(target.bundle), options.actor, options.requestId);

  if (options.ingestToPostgres) {
    await ingestSnapshotBundle(target.bundle, {
      requestId: options.requestId,
      actor: options.actor
    });
  }

  await recordAuditLog({
    eventType: "admin_publish",
    actor: options.actor,
    status: "warning",
    requestId: options.requestId,
    summary: "Published snapshot rolled back",
    metadata: {
      historyId: target.id,
      restoredPublishedAt: target.publishedAt,
      originalRequestId: target.requestId,
      ingestToPostgres: Boolean(options.ingestToPostgres)
    }
  });

  return {
    historyId: target.id,
    restoredPublishedAt: target.publishedAt,
    diffCount: target.diffCount,
    tickers: target.tickers
  };
}