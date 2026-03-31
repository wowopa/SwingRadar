import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { loadRuntimeDocument, saveRuntimeDocument } from "@/lib/server/runtime-documents";
import { getRuntimePaths } from "@/lib/server/runtime-paths";
import { getSymbolByTicker, resolveTicker } from "@/lib/symbols/master";
import type { PortfolioProfile, PortfolioProfilePosition } from "@/types/recommendation";

const PORTFOLIO_PROFILE_DOCUMENT_NAME = "portfolio-profile";
const DEFAULT_PROFILE_UPDATED_AT = new Date(0).toISOString();

export function createEmptyPortfolioProfile(): PortfolioProfile {
  return {
    name: "기본 운용 프로필",
    totalCapital: 0,
    availableCash: 0,
    maxRiskPerTradePercent: 0.8,
    maxConcurrentPositions: 4,
    sectorLimit: 2,
    positions: [],
    updatedAt: DEFAULT_PROFILE_UPDATED_AT,
    updatedBy: "system"
  };
}

function getPortfolioProfilePath() {
  return process.env.SWING_RADAR_PORTFOLIO_PROFILE_FILE
    ? path.resolve(process.env.SWING_RADAR_PORTFOLIO_PROFILE_FILE)
    : path.join(getRuntimePaths().adminDir, "portfolio-profile.json");
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

function normalizePositiveInteger(value: unknown, fallback: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  const normalized = Math.round(value);
  if (normalized < 1) {
    return fallback;
  }

  return Math.min(normalized, max);
}

function normalizePosition(value: unknown): PortfolioProfilePosition | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Record<string, unknown>;
  const rawTicker = typeof payload.ticker === "string" ? payload.ticker.trim() : "";
  if (!rawTicker) {
    return null;
  }

  const ticker = resolveTicker(rawTicker);
  const quantity = normalizeNonNegativeNumber(payload.quantity, 0);
  if (quantity <= 0) {
    return null;
  }

  const averagePrice = normalizeNonNegativeNumber(payload.averagePrice, 0);
  const symbol = getSymbolByTicker(ticker);
  const company =
    symbol?.company ??
    (typeof payload.company === "string" && payload.company.trim() ? payload.company.trim() : ticker);
  const sector =
    symbol?.sector ??
    (typeof payload.sector === "string" && payload.sector.trim() ? payload.sector.trim() : "미분류");

  return {
    ticker,
    company,
    sector,
    quantity,
    averagePrice,
    note: normalizeOptionalString(payload.note)
  };
}

function normalizePositions(values: unknown): PortfolioProfilePosition[] {
  if (!Array.isArray(values)) {
    return [];
  }

  const positionsByTicker = new Map<string, PortfolioProfilePosition>();
  for (const value of values) {
    const position = normalizePosition(value);
    if (!position) {
      continue;
    }

    positionsByTicker.set(position.ticker, position);
  }

  return [...positionsByTicker.values()].sort((left, right) => left.ticker.localeCompare(right.ticker, "en"));
}

function normalizePortfolioProfile(value: unknown): PortfolioProfile {
  if (!value || typeof value !== "object") {
    return createEmptyPortfolioProfile();
  }

  const payload = value as Record<string, unknown>;
  const empty = createEmptyPortfolioProfile();

  return {
    name: typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : empty.name,
    totalCapital: normalizeNonNegativeNumber(payload.totalCapital, empty.totalCapital),
    availableCash: normalizeNonNegativeNumber(payload.availableCash, empty.availableCash),
    maxRiskPerTradePercent: normalizeNonNegativeNumber(payload.maxRiskPerTradePercent, empty.maxRiskPerTradePercent),
    maxConcurrentPositions: normalizePositiveInteger(payload.maxConcurrentPositions, empty.maxConcurrentPositions, 20),
    sectorLimit: normalizePositiveInteger(payload.sectorLimit, empty.sectorLimit, 10),
    positions: normalizePositions(payload.positions),
    updatedAt:
      typeof payload.updatedAt === "string" && payload.updatedAt.trim() ? payload.updatedAt : empty.updatedAt,
    updatedBy:
      typeof payload.updatedBy === "string" && payload.updatedBy.trim() ? payload.updatedBy : empty.updatedBy
  };
}

export function isPortfolioProfileConfigured(profile: PortfolioProfile | null | undefined) {
  const empty = createEmptyPortfolioProfile();
  if (!profile) {
    return false;
  }

  return (
    profile.updatedAt !== empty.updatedAt ||
    profile.updatedBy !== empty.updatedBy ||
    profile.name !== empty.name ||
    profile.totalCapital !== empty.totalCapital ||
    profile.availableCash !== empty.availableCash ||
    profile.maxRiskPerTradePercent !== empty.maxRiskPerTradePercent ||
    profile.maxConcurrentPositions !== empty.maxConcurrentPositions ||
    profile.sectorLimit !== empty.sectorLimit ||
    profile.positions.length > 0
  );
}

export async function loadPortfolioProfileDocument(): Promise<PortfolioProfile> {
  try {
    const content = await readFile(getPortfolioProfilePath(), "utf8");
    return normalizePortfolioProfile(JSON.parse(content.replace(/^\uFEFF/, "")));
  } catch {
    const runtimeDocument = await loadRuntimeDocument<PortfolioProfile>(PORTFOLIO_PROFILE_DOCUMENT_NAME);
    return normalizePortfolioProfile(runtimeDocument);
  }
}

export async function savePortfolioProfileDocument(profile: unknown) {
  const normalized = normalizePortfolioProfile(profile);
  await mkdir(path.dirname(getPortfolioProfilePath()), { recursive: true });
  await writeFile(getPortfolioProfilePath(), `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  await saveRuntimeDocument(PORTFOLIO_PROFILE_DOCUMENT_NAME, normalized);
  return normalized;
}
