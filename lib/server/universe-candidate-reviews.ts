import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getRuntimePaths } from "@/lib/server/runtime-paths";

export type UniverseReviewStatus = "new" | "reviewing" | "hold" | "promoted" | "rejected";

export type UniverseCandidateReview = {
  ticker: string;
  status: UniverseReviewStatus;
  note: string;
  updatedAt: string;
  updatedBy: string;
};

type UniverseCandidateReviewDocument = {
  items: Record<string, UniverseCandidateReview>;
};

function getUniverseCandidateReviewPath() {
  return process.env.SWING_RADAR_UNIVERSE_REVIEW_FILE
    ? path.resolve(process.env.SWING_RADAR_UNIVERSE_REVIEW_FILE)
    : path.join(getRuntimePaths().universeDir, "candidate-reviews.json");
}

async function loadDocument(): Promise<UniverseCandidateReviewDocument> {
  try {
    const content = await readFile(getUniverseCandidateReviewPath(), "utf8");
    return JSON.parse(content.replace(/^\uFEFF/, "")) as UniverseCandidateReviewDocument;
  } catch {
    return { items: {} };
  }
}

async function saveDocument(document: UniverseCandidateReviewDocument) {
  await mkdir(path.dirname(getUniverseCandidateReviewPath()), { recursive: true });
  await writeFile(getUniverseCandidateReviewPath(), `${JSON.stringify(document, null, 2)}\n`, "utf8");
}

export async function listUniverseCandidateReviews() {
  const document = await loadDocument();
  return document.items;
}

export async function saveUniverseCandidateReview(input: {
  ticker: string;
  status: UniverseReviewStatus;
  note?: string;
  updatedBy: string;
}) {
  const document = await loadDocument();
  const review: UniverseCandidateReview = {
    ticker: input.ticker,
    status: input.status,
    note: input.note?.trim() ?? "",
    updatedAt: new Date().toISOString(),
    updatedBy: input.updatedBy
  };

  document.items[input.ticker] = review;
  await saveDocument(document);

  return review;
}
