import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { loadRuntimeDocument, saveRuntimeDocument } from "@/lib/server/runtime-documents";
import { getRuntimePaths } from "@/lib/server/runtime-paths";
import type { PortfolioPersonalRuleEntry } from "@/types/recommendation";

const USER_PORTFOLIO_PERSONAL_RULES_DOCUMENT_NAME = "user-portfolio-personal-rules";

interface UserPortfolioPersonalRulesDocument {
  rules: Record<string, PortfolioPersonalRuleEntry[]>;
}

function getUserPortfolioPersonalRulesPath() {
  return process.env.SWING_RADAR_USER_PORTFOLIO_PERSONAL_RULES_FILE
    ? path.resolve(process.env.SWING_RADAR_USER_PORTFOLIO_PERSONAL_RULES_FILE)
    : path.join(getRuntimePaths().usersDir, "portfolio-personal-rules.json");
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

function normalizeSourceCategory(
  value: unknown
): PortfolioPersonalRuleEntry["sourceCategory"] | null {
  if (value === "strengths" || value === "watchouts" || value === "next_rule") {
    return value;
  }

  return null;
}

function getSourceLabel(category: PortfolioPersonalRuleEntry["sourceCategory"]) {
  if (category === "strengths") {
    return "잘한 점";
  }
  if (category === "watchouts") {
    return "아쉬운 점";
  }
  return "다음 규칙";
}

function normalizeRuleEntry(value: unknown): PortfolioPersonalRuleEntry | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Record<string, unknown>;
  const id = normalizeOptionalString(payload.id);
  const text = normalizeOptionalString(payload.text);
  const sourceCategory = normalizeSourceCategory(payload.sourceCategory);
  const updatedBy = normalizeOptionalString(payload.updatedBy) ?? "system";
  const now = new Date(0).toISOString();

  if (!id || !text || !sourceCategory) {
    return null;
  }

  return {
    id,
    text,
    sourceCategory,
    sourceLabel: getSourceLabel(sourceCategory),
    isActive: payload.isActive !== false,
    createdAt: normalizeTimestamp(payload.createdAt, now),
    updatedAt: normalizeTimestamp(payload.updatedAt, now),
    updatedBy
  };
}

function normalizeDocument(value: unknown): UserPortfolioPersonalRulesDocument {
  if (!value || typeof value !== "object") {
    return { rules: {} };
  }

  const payload = value as Record<string, unknown>;
  const rulesPayload = payload.rules;
  if (!rulesPayload || typeof rulesPayload !== "object") {
    return { rules: {} };
  }

  return {
    rules: Object.fromEntries(
      Object.entries(rulesPayload).map(([userId, userRules]) => {
        if (!Array.isArray(userRules)) {
          return [userId, []];
        }

        return [
          userId,
          userRules
            .map((entry) => normalizeRuleEntry(entry))
            .filter((entry): entry is PortfolioPersonalRuleEntry => entry !== null)
        ];
      })
    )
  };
}

async function loadDocument() {
  try {
    const content = await readFile(getUserPortfolioPersonalRulesPath(), "utf8");
    return normalizeDocument(JSON.parse(content.replace(/^\uFEFF/, "")));
  } catch {
    const runtimeDocument =
      await loadRuntimeDocument<UserPortfolioPersonalRulesDocument>(USER_PORTFOLIO_PERSONAL_RULES_DOCUMENT_NAME);
    return normalizeDocument(runtimeDocument);
  }
}

async function saveDocument(document: UserPortfolioPersonalRulesDocument) {
  const normalized = normalizeDocument(document);
  await mkdir(path.dirname(getUserPortfolioPersonalRulesPath()), { recursive: true });
  await writeFile(getUserPortfolioPersonalRulesPath(), `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  await saveRuntimeDocument(USER_PORTFOLIO_PERSONAL_RULES_DOCUMENT_NAME, normalized);
  return normalized;
}

function normalizeRuleId(text: string, sourceCategory: PortfolioPersonalRuleEntry["sourceCategory"]) {
  return `${sourceCategory}:${text.trim().toLowerCase()}`;
}

export async function loadPortfolioPersonalRulesForUser(userId?: string | null) {
  if (!userId) {
    return [];
  }

  const document = await loadDocument();
  return document.rules[userId] ?? [];
}

export async function savePortfolioPersonalRuleForUser(
  userId: string,
  input: {
    text: string;
    sourceCategory: PortfolioPersonalRuleEntry["sourceCategory"];
    updatedBy: string;
  }
) {
  const text = normalizeOptionalString(input.text);
  if (!text) {
    throw new Error("개인 규칙 문장이 비어 있습니다.");
  }

  const document = await loadDocument();
  const current = document.rules[userId] ?? [];
  const id = normalizeRuleId(text, input.sourceCategory);
  const now = new Date().toISOString();
  const existing = current.find((entry) => entry.id === id);

  const nextEntry: PortfolioPersonalRuleEntry = existing
    ? {
        ...existing,
        text,
        isActive: true,
        updatedAt: now,
        updatedBy: input.updatedBy
      }
    : {
        id,
        text,
        sourceCategory: input.sourceCategory,
        sourceLabel: getSourceLabel(input.sourceCategory),
        isActive: true,
        createdAt: now,
        updatedAt: now,
        updatedBy: input.updatedBy
      };

  document.rules[userId] = [
    nextEntry,
    ...current.filter((entry) => entry.id !== id)
  ];
  await saveDocument(document);
  return nextEntry;
}

export async function setPortfolioPersonalRuleActiveForUser(
  userId: string,
  input: {
    id: string;
    isActive: boolean;
    updatedBy: string;
  }
) {
  const document = await loadDocument();
  const current = document.rules[userId] ?? [];
  const index = current.findIndex((entry) => entry.id === input.id);

  if (index < 0) {
    throw new Error("개인 규칙을 찾을 수 없습니다.");
  }

  const now = new Date().toISOString();
  const nextEntry: PortfolioPersonalRuleEntry = {
    ...current[index],
    isActive: input.isActive,
    updatedAt: now,
    updatedBy: input.updatedBy
  };

  document.rules[userId] = [nextEntry, ...current.filter((entry) => entry.id !== input.id)];
  await saveDocument(document);
  return nextEntry;
}
