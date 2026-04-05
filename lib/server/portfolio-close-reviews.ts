import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { loadRuntimeDocument, saveRuntimeDocument } from "@/lib/server/runtime-documents";
import { getRuntimePaths } from "@/lib/server/runtime-paths";
import { resolveTicker } from "@/lib/server/runtime-symbol-master";
import type { PortfolioCloseReviewEntry } from "@/types/recommendation";

const USER_PORTFOLIO_CLOSE_REVIEWS_DOCUMENT_NAME = "user-portfolio-close-reviews";

interface UserPortfolioCloseReviewsDocument {
  reviews: Record<string, Record<string, PortfolioCloseReviewEntry>>;
}

function getUserPortfolioCloseReviewsPath() {
  return process.env.SWING_RADAR_USER_PORTFOLIO_CLOSE_REVIEWS_FILE
    ? path.resolve(process.env.SWING_RADAR_USER_PORTFOLIO_CLOSE_REVIEWS_FILE)
    : path.join(getRuntimePaths().usersDir, "portfolio-close-reviews.json");
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

function normalizeTimestamp(value: unknown, fallback: string) {
  if (typeof value !== "string" || !value.trim()) {
    return fallback;
  }

  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? fallback : timestamp.toISOString();
}

function normalizeCloseReviewEntry(value: unknown): PortfolioCloseReviewEntry | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Record<string, unknown>;
  const positionKey = typeof payload.positionKey === "string" && payload.positionKey.trim() ? payload.positionKey.trim() : "";
  const rawTicker = typeof payload.ticker === "string" && payload.ticker.trim() ? payload.ticker.trim() : "";
  const closedAt =
    typeof payload.closedAt === "string" && payload.closedAt.trim()
      ? normalizeTimestamp(payload.closedAt, "")
      : "";

  if (!positionKey || !rawTicker || !closedAt) {
    return null;
  }

  return {
    positionKey,
    ticker: resolveTicker(rawTicker),
    closedAt,
    strengthsNote: normalizeOptionalString(payload.strengthsNote),
    watchoutsNote: normalizeOptionalString(payload.watchoutsNote),
    nextRuleNote: normalizeOptionalString(payload.nextRuleNote),
    updatedAt: normalizeTimestamp(payload.updatedAt, new Date(0).toISOString()),
    updatedBy:
      typeof payload.updatedBy === "string" && payload.updatedBy.trim() ? payload.updatedBy.trim() : "system"
  };
}

function normalizeDocument(value: unknown): UserPortfolioCloseReviewsDocument {
  if (!value || typeof value !== "object") {
    return { reviews: {} };
  }

  const payload = value as Record<string, unknown>;
  const reviewsPayload = payload.reviews;
  if (!reviewsPayload || typeof reviewsPayload !== "object") {
    return { reviews: {} };
  }

  return {
    reviews: Object.fromEntries(
      Object.entries(reviewsPayload).map(([userId, userReviews]) => {
        if (!userReviews || typeof userReviews !== "object") {
          return [userId, {}];
        }

        const normalizedReviews = Object.fromEntries(
          Object.entries(userReviews as Record<string, unknown>).flatMap(([reviewKey, reviewValue]) => {
            const normalized = normalizeCloseReviewEntry(reviewValue);
            return normalized ? [[reviewKey, normalized]] : [];
          })
        );

        return [userId, normalizedReviews];
      })
    )
  };
}

async function loadDocument() {
  try {
    const content = await readFile(getUserPortfolioCloseReviewsPath(), "utf8");
    return normalizeDocument(JSON.parse(content.replace(/^\uFEFF/, "")));
  } catch {
    const runtimeDocument =
      await loadRuntimeDocument<UserPortfolioCloseReviewsDocument>(USER_PORTFOLIO_CLOSE_REVIEWS_DOCUMENT_NAME);
    return normalizeDocument(runtimeDocument);
  }
}

async function saveDocument(document: UserPortfolioCloseReviewsDocument) {
  const normalized = normalizeDocument(document);
  await mkdir(path.dirname(getUserPortfolioCloseReviewsPath()), { recursive: true });
  await writeFile(getUserPortfolioCloseReviewsPath(), `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  await saveRuntimeDocument(USER_PORTFOLIO_CLOSE_REVIEWS_DOCUMENT_NAME, normalized);
  return normalized;
}

export async function loadPortfolioCloseReviewsForUser(userId?: string | null) {
  if (!userId) {
    return {};
  }

  const document = await loadDocument();
  return document.reviews[userId] ?? {};
}

export async function savePortfolioCloseReviewForUser(
  userId: string,
  input: Omit<PortfolioCloseReviewEntry, "updatedAt" | "updatedBy" | "ticker"> & {
    ticker: string;
    updatedBy: string;
  }
) {
  const document = await loadDocument();
  const current = document.reviews[userId] ?? {};
  const review: PortfolioCloseReviewEntry = {
    positionKey: input.positionKey.trim(),
    ticker: resolveTicker(input.ticker),
    closedAt: normalizeTimestamp(input.closedAt, new Date().toISOString()),
    strengthsNote: normalizeOptionalString(input.strengthsNote),
    watchoutsNote: normalizeOptionalString(input.watchoutsNote),
    nextRuleNote: normalizeOptionalString(input.nextRuleNote),
    updatedAt: new Date().toISOString(),
    updatedBy: input.updatedBy
  };

  current[review.positionKey] = review;
  document.reviews[userId] = current;
  await saveDocument(document);
  return review;
}

export async function deletePortfolioCloseReviewsForUser(userId: string) {
  const document = await loadDocument();
  if (!document.reviews[userId]) {
    return false;
  }

  delete document.reviews[userId];
  await saveDocument(document);
  return true;
}
