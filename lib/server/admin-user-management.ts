import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { loadRuntimeDocument, saveRuntimeDocument } from "@/lib/server/runtime-documents";
import { getRuntimePaths } from "@/lib/server/runtime-paths";

const USER_ACCOUNTS_DOCUMENT_NAME = "user-accounts";
const USER_SESSIONS_DOCUMENT_NAME = "user-sessions";
const USER_PORTFOLIO_PROFILES_DOCUMENT_NAME = "user-portfolio-profiles";

interface StoredUserAccount {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
  passwordSalt?: string;
  passwordHash?: string;
}

interface StoredUserSession {
  id: string;
  userId: string;
  tokenHash: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

interface StoredPortfolioProfile {
  updatedAt?: string;
  positions?: Array<{ ticker?: string }>;
}

interface UserAccountsDocument {
  accounts: Record<string, StoredUserAccount>;
}

interface UserSessionsDocument {
  sessions: Record<string, StoredUserSession>;
}

interface UserPortfolioProfilesDocument {
  profiles: Record<string, StoredPortfolioProfile>;
}

export interface AdminUserItem {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
  activeSessionCount: number;
  lastActivityAt: string | null;
  portfolioConfigured: boolean;
  portfolioPositionCount: number;
  portfolioUpdatedAt: string | null;
}

export interface AdminUsersSummary {
  totalUsers: number;
  recentSignups7d: number;
  activeUsers: number;
  configuredPortfolios: number;
  activeSessions: number;
}

function getUserAccountsPath() {
  return process.env.SWING_RADAR_USER_ACCOUNTS_FILE
    ? path.resolve(process.env.SWING_RADAR_USER_ACCOUNTS_FILE)
    : path.join(getRuntimePaths().usersDir, "accounts.json");
}

function getUserSessionsPath() {
  return process.env.SWING_RADAR_USER_SESSIONS_FILE
    ? path.resolve(process.env.SWING_RADAR_USER_SESSIONS_FILE)
    : path.join(getRuntimePaths().usersDir, "sessions.json");
}

function getUserPortfolioProfilesPath() {
  return process.env.SWING_RADAR_USER_PORTFOLIO_PROFILES_FILE
    ? path.resolve(process.env.SWING_RADAR_USER_PORTFOLIO_PROFILES_FILE)
    : path.join(getRuntimePaths().usersDir, "portfolio-profiles.json");
}

function normalizeString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeIsoDate(value: unknown) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  return Number.isNaN(new Date(normalized).getTime()) ? null : normalized;
}

function normalizeUserAccount(value: unknown): StoredUserAccount | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Record<string, unknown>;
  const id = normalizeString(payload.id);
  const email = normalizeString(payload.email);
  const displayName = normalizeString(payload.displayName);
  const createdAt = normalizeIsoDate(payload.createdAt);
  const updatedAt = normalizeIsoDate(payload.updatedAt);

  if (!id || !email || !displayName || !createdAt || !updatedAt) {
    return null;
  }

  return {
    id,
    email,
    displayName,
    createdAt,
    updatedAt,
    passwordSalt: normalizeString(payload.passwordSalt) ?? undefined,
    passwordHash: normalizeString(payload.passwordHash) ?? undefined
  };
}

function normalizeUserSession(value: unknown): StoredUserSession | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Record<string, unknown>;
  const id = normalizeString(payload.id);
  const userId = normalizeString(payload.userId);
  const tokenHash = normalizeString(payload.tokenHash);
  const createdAt = normalizeIsoDate(payload.createdAt);
  const updatedAt = normalizeIsoDate(payload.updatedAt);
  const expiresAt = normalizeIsoDate(payload.expiresAt);

  if (!id || !userId || !tokenHash || !createdAt || !updatedAt || !expiresAt) {
    return null;
  }

  return {
    id,
    userId,
    tokenHash,
    createdAt,
    updatedAt,
    expiresAt
  };
}

function normalizeUserAccountsDocument(value: unknown): UserAccountsDocument {
  if (!value || typeof value !== "object") {
    return { accounts: {} };
  }

  const payload = value as Record<string, unknown>;
  const accountsPayload = payload.accounts;
  if (!accountsPayload || typeof accountsPayload !== "object") {
    return { accounts: {} };
  }

  return {
    accounts: Object.fromEntries(
      Object.entries(accountsPayload).flatMap(([userId, accountValue]) => {
        const account = normalizeUserAccount(accountValue);
        return account ? [[userId, account]] : [];
      })
    )
  };
}

function normalizeUserSessionsDocument(value: unknown, now = Date.now()): UserSessionsDocument {
  if (!value || typeof value !== "object") {
    return { sessions: {} };
  }

  const payload = value as Record<string, unknown>;
  const sessionsPayload = payload.sessions;
  if (!sessionsPayload || typeof sessionsPayload !== "object") {
    return { sessions: {} };
  }

  return {
    sessions: Object.fromEntries(
      Object.entries(sessionsPayload).flatMap(([sessionId, sessionValue]) => {
        const session = normalizeUserSession(sessionValue);
        if (!session) {
          return [];
        }

        const expiresAt = new Date(session.expiresAt).getTime();
        if (Number.isNaN(expiresAt) || expiresAt <= now) {
          return [];
        }

        return [[sessionId, session]];
      })
    )
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
      Object.entries(profilesPayload).map(([userId, profileValue]) => {
        const profile = profileValue && typeof profileValue === "object" ? (profileValue as StoredPortfolioProfile) : {};
        return [userId, profile];
      })
    )
  };
}

async function loadJsonDocument<T>(filePath: string, documentName: string, normalize: (value: unknown) => T) {
  try {
    const content = await readFile(filePath, "utf8");
    return normalize(JSON.parse(content.replace(/^\uFEFF/, "")));
  } catch {
    const runtimeDocument = await loadRuntimeDocument(documentName);
    return normalize(runtimeDocument);
  }
}

async function loadAccountsDocument() {
  return loadJsonDocument(getUserAccountsPath(), USER_ACCOUNTS_DOCUMENT_NAME, normalizeUserAccountsDocument);
}

async function loadSessionsDocument() {
  return loadJsonDocument(getUserSessionsPath(), USER_SESSIONS_DOCUMENT_NAME, (value) =>
    normalizeUserSessionsDocument(value)
  );
}

async function saveSessionsDocument(document: UserSessionsDocument) {
  const normalized = normalizeUserSessionsDocument(document);
  await mkdir(path.dirname(getUserSessionsPath()), { recursive: true });
  await writeFile(getUserSessionsPath(), `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  await saveRuntimeDocument(USER_SESSIONS_DOCUMENT_NAME, normalized);
  return normalized;
}

async function loadPortfolioProfilesDocument() {
  return loadJsonDocument(
    getUserPortfolioProfilesPath(),
    USER_PORTFOLIO_PROFILES_DOCUMENT_NAME,
    normalizeUserPortfolioProfilesDocument
  );
}

function countRecentUsers(items: AdminUserItem[], days: number) {
  const threshold = Date.now() - days * 86_400_000;
  return items.filter((item) => new Date(item.createdAt).getTime() >= threshold).length;
}

export async function listAdminUsers() {
  const [accountsDocument, sessionsDocument, portfolioProfilesDocument] = await Promise.all([
    loadAccountsDocument(),
    loadSessionsDocument(),
    loadPortfolioProfilesDocument()
  ]);

  const sessionsByUserId = new Map<string, StoredUserSession[]>();
  for (const session of Object.values(sessionsDocument.sessions)) {
    const list = sessionsByUserId.get(session.userId) ?? [];
    list.push(session);
    sessionsByUserId.set(session.userId, list);
  }

  const items = Object.values(accountsDocument.accounts)
    .map<AdminUserItem>((account) => {
      const userSessions = sessionsByUserId.get(account.id) ?? [];
      const latestSessionAt =
        userSessions
          .map((session) => new Date(session.updatedAt).getTime())
          .filter((value) => Number.isFinite(value))
          .sort((left, right) => right - left)[0] ?? null;
      const profile = portfolioProfilesDocument.profiles[account.id];
      const positionCount = Array.isArray(profile?.positions) ? profile.positions.length : 0;
      const portfolioUpdatedAt = normalizeIsoDate(profile?.updatedAt);

      return {
        id: account.id,
        email: account.email,
        displayName: account.displayName,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
        activeSessionCount: userSessions.length,
        lastActivityAt: latestSessionAt ? new Date(latestSessionAt).toISOString() : null,
        portfolioConfigured: positionCount > 0 || Boolean(portfolioUpdatedAt && portfolioUpdatedAt !== new Date(0).toISOString()),
        portfolioPositionCount: positionCount,
        portfolioUpdatedAt
      };
    })
    .sort((left, right) => {
      const rightTime = new Date(right.lastActivityAt ?? right.updatedAt).getTime();
      const leftTime = new Date(left.lastActivityAt ?? left.updatedAt).getTime();
      return rightTime - leftTime;
    });

  const summary: AdminUsersSummary = {
    totalUsers: items.length,
    recentSignups7d: countRecentUsers(items, 7),
    activeUsers: items.filter((item) => item.activeSessionCount > 0).length,
    configuredPortfolios: items.filter((item) => item.portfolioConfigured).length,
    activeSessions: items.reduce((total, item) => total + item.activeSessionCount, 0)
  };

  return { items, summary };
}

export async function revokeAdminUserSessions(userId: string) {
  const sessionsDocument = await loadSessionsDocument();
  const entries = Object.entries(sessionsDocument.sessions);
  const removedSessionIds = entries
    .filter(([, session]) => session.userId === userId)
    .map(([sessionId]) => sessionId);

  if (!removedSessionIds.length) {
    return { removedCount: 0 };
  }

  for (const sessionId of removedSessionIds) {
    delete sessionsDocument.sessions[sessionId];
  }

  await saveSessionsDocument(sessionsDocument);
  return { removedCount: removedSessionIds.length };
}
