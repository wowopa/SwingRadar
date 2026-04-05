import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { loadRuntimeDocument, saveRuntimeDocument } from "@/lib/server/runtime-documents";
import { getRuntimePaths } from "@/lib/server/runtime-paths";
import { getSymbolByTicker, resolveTicker } from "@/lib/server/runtime-symbol-master";
import type {
  PortfolioProfile,
  PortfolioProfilePosition,
  PortfolioTradeEventType
} from "@/types/recommendation";

const PORTFOLIO_PROFILE_DOCUMENT_NAME = "portfolio-profile";
const USER_PORTFOLIO_PROFILES_DOCUMENT_NAME = "user-portfolio-profiles";
const DEFAULT_PROFILE_UPDATED_AT = new Date(0).toISOString();

interface UserPortfolioProfilesDocument {
  profiles: Record<string, PortfolioProfile>;
}

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

function getUserPortfolioProfilesPath() {
  return process.env.SWING_RADAR_USER_PORTFOLIO_PROFILES_FILE
    ? path.resolve(process.env.SWING_RADAR_USER_PORTFOLIO_PROFILES_FILE)
    : path.join(getRuntimePaths().usersDir, "portfolio-profiles.json");
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

function normalizeOptionalDate(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : undefined;
}

function normalizeNonNegativeNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function normalizePositiveNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
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
    enteredAt: normalizeOptionalDate(payload.enteredAt),
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

function normalizeUserPortfolioProfilesDocument(value: unknown): UserPortfolioProfilesDocument {
  if (!value || typeof value !== "object") {
    return { profiles: {} };
  }

  const payload = value as Record<string, unknown>;
  const profilesPayload = payload.profiles;
  if (!profilesPayload || typeof profilesPayload !== "object") {
    return { profiles: {} };
  }

  return {
    profiles: Object.fromEntries(
      Object.entries(profilesPayload).map(([userId, profileValue]) => [userId, normalizePortfolioProfile(profileValue)])
    )
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

async function loadUserPortfolioProfilesDocument() {
  try {
    const content = await readFile(getUserPortfolioProfilesPath(), "utf8");
    return normalizeUserPortfolioProfilesDocument(JSON.parse(content.replace(/^\uFEFF/, "")));
  } catch {
    const runtimeDocument = await loadRuntimeDocument<UserPortfolioProfilesDocument>(USER_PORTFOLIO_PROFILES_DOCUMENT_NAME);
    return normalizeUserPortfolioProfilesDocument(runtimeDocument);
  }
}

async function saveUserPortfolioProfilesDocument(document: UserPortfolioProfilesDocument) {
  const normalized = normalizeUserPortfolioProfilesDocument(document);
  await mkdir(path.dirname(getUserPortfolioProfilesPath()), { recursive: true });
  await writeFile(getUserPortfolioProfilesPath(), `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  await saveRuntimeDocument(USER_PORTFOLIO_PROFILES_DOCUMENT_NAME, normalized);
  return normalized;
}

export async function savePortfolioProfileDocument(profile: unknown) {
  const normalized = normalizePortfolioProfile(profile);
  await mkdir(path.dirname(getPortfolioProfilePath()), { recursive: true });
  await writeFile(getPortfolioProfilePath(), `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  await saveRuntimeDocument(PORTFOLIO_PROFILE_DOCUMENT_NAME, normalized);
  return normalized;
}

export async function loadPortfolioProfileForUser(userId?: string | null) {
  if (!userId) {
    return loadPortfolioProfileDocument();
  }

  const document = await loadUserPortfolioProfilesDocument();
  return normalizePortfolioProfile(document.profiles[userId]);
}

export async function savePortfolioProfileForUser(userId: string, profile: unknown) {
  const document = await loadUserPortfolioProfilesDocument();
  document.profiles[userId] = normalizePortfolioProfile(profile);
  await saveUserPortfolioProfilesDocument(document);
  return document.profiles[userId];
}

export async function deletePortfolioProfileForUser(userId: string) {
  const document = await loadUserPortfolioProfilesDocument();
  if (!document.profiles[userId]) {
    return false;
  }

  delete document.profiles[userId];
  await saveUserPortfolioProfilesDocument(document);
  return true;
}

type SyncablePortfolioTradeEvent = {
  ticker: string;
  type: PortfolioTradeEventType;
  quantity: number;
  price: number;
  fees?: number;
  tradedAt?: string;
  note?: string;
};

function clampCurrency(value: number) {
  return Math.max(0, Math.round(value));
}

function getTradeEnteredAt(value?: string) {
  if (!value) {
    return undefined;
  }

  const normalized = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : undefined;
}

function buildPositionFromTradeEvent(event: SyncablePortfolioTradeEvent) {
  const ticker = resolveTicker(event.ticker);
  const symbol = getSymbolByTicker(ticker);
  const fees = normalizeNonNegativeNumber(event.fees, 0);
  const averagePrice = event.quantity > 0 ? (event.price * event.quantity + fees) / event.quantity : event.price;

  return {
    ticker,
    company: symbol?.company ?? ticker,
    sector: symbol?.sector ?? "미분류",
    quantity: event.quantity,
    averagePrice,
    enteredAt: getTradeEnteredAt(event.tradedAt),
    note: normalizeOptionalString(event.note)
  } satisfies PortfolioProfilePosition;
}

export function applyTradeEventToPortfolioProfile(
  profile: PortfolioProfile,
  event: SyncablePortfolioTradeEvent,
  updatedBy: string
) {
  const normalized = normalizePortfolioProfile(profile);
  const ticker = resolveTicker(event.ticker);
  const fees = normalizeNonNegativeNumber(event.fees, 0);
  const positions = [...normalized.positions];
  const positionIndex = positions.findIndex((position) => position.ticker === ticker);
  const existingPosition = positionIndex >= 0 ? positions[positionIndex] : null;
  let availableCash = normalized.availableCash;

  if (event.type === "buy" || event.type === "add") {
    const quantity = normalizePositiveNumber(event.quantity, 0);
    const price = normalizePositiveNumber(event.price, 0);

    if (quantity > 0 && price > 0) {
      if (existingPosition) {
        const totalCost =
          existingPosition.quantity * existingPosition.averagePrice + quantity * price + fees;
        const nextQuantity = existingPosition.quantity + quantity;
        positions[positionIndex] = {
          ...existingPosition,
          quantity: nextQuantity,
          averagePrice: totalCost / nextQuantity,
          enteredAt: existingPosition.enteredAt ?? getTradeEnteredAt(event.tradedAt),
          note: normalizeOptionalString(event.note) ?? existingPosition.note
        };
      } else {
        positions.push(buildPositionFromTradeEvent(event));
      }

      availableCash = clampCurrency(availableCash - quantity * price - fees);
    }
  } else if (existingPosition) {
    const effectiveQuantity = Math.min(existingPosition.quantity, normalizePositiveNumber(event.quantity, 0));

    if (effectiveQuantity > 0) {
      const remainingQuantity = Math.max(0, existingPosition.quantity - effectiveQuantity);
      if (remainingQuantity > 0) {
        positions[positionIndex] = {
          ...existingPosition,
          quantity: remainingQuantity
        };
      } else {
        positions.splice(positionIndex, 1);
      }

      availableCash = clampCurrency(availableCash + effectiveQuantity * event.price - fees);
    }
  }

  return normalizePortfolioProfile({
    ...normalized,
    availableCash,
    positions,
    updatedAt: new Date().toISOString(),
    updatedBy
  });
}

export async function syncPortfolioProfileWithTradeEventForUser(
  userId: string,
  event: SyncablePortfolioTradeEvent,
  updatedBy: string
) {
  const current = await loadPortfolioProfileForUser(userId);
  const nextProfile = applyTradeEventToPortfolioProfile(current, event, updatedBy);
  return savePortfolioProfileForUser(userId, nextProfile);
}
