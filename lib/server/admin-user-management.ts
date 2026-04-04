import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { ApiError } from "@/lib/server/api-error";
import { loadRuntimeDocument, saveRuntimeDocument } from "@/lib/server/runtime-documents";
import { getRuntimePaths } from "@/lib/server/runtime-paths";

const USER_ACCOUNTS_DOCUMENT_NAME = "user-accounts";
const USER_SESSIONS_DOCUMENT_NAME = "user-sessions";
const USER_PORTFOLIO_PROFILES_DOCUMENT_NAME = "user-portfolio-profiles";
const USER_PORTFOLIO_JOURNALS_DOCUMENT_NAME = "user-portfolio-journals";
const USER_PORTFOLIO_CLOSE_REVIEWS_DOCUMENT_NAME = "user-portfolio-close-reviews";
const USER_PORTFOLIO_PERSONAL_RULES_DOCUMENT_NAME = "user-portfolio-personal-rules";
const USER_OPENING_RECHECK_DOCUMENT_NAME = "user-opening-recheck-board";

interface StoredUserAccount {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
  passwordSalt?: string;
  passwordHash?: string;
  status?: "active" | "suspended";
  suspendedUntil?: string;
  adminNote?: string;
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
  emailIndex: Record<string, string>;
}

interface UserSessionsDocument {
  sessions: Record<string, StoredUserSession>;
}

interface UserPortfolioProfilesDocument {
  profiles: Record<string, StoredPortfolioProfile>;
}

interface UserPortfolioJournalsDocument {
  journals: Record<string, { events?: unknown[]; updatedAt?: string }>;
}

interface UserPortfolioCloseReviewsDocument {
  reviews: Record<string, Record<string, unknown>>;
}

interface UserPortfolioPersonalRulesDocument {
  rules: Record<string, unknown[]>;
}

interface UserOpeningRecheckBoardsDocument {
  boards: Record<string, { scans?: Record<string, unknown> }>;
}

export interface AdminUserSessionItem {
  id: string;
  updatedAt: string;
  expiresAt: string;
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
  status: "active" | "suspended";
  suspendedUntil: string | null;
  adminNote: string | null;
  journalEventCount: number;
  closeReviewCount: number;
  personalRuleCount: number;
  openingScanCount: number;
  recentSessions: AdminUserSessionItem[];
}

export interface AdminUsersSummary {
  totalUsers: number;
  recentSignups7d: number;
  activeUsers: number;
  configuredPortfolios: number;
  activeSessions: number;
  suspendedUsers: number;
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

function getUserPortfolioJournalsPath() {
  return process.env.SWING_RADAR_USER_PORTFOLIO_JOURNALS_FILE
    ? path.resolve(process.env.SWING_RADAR_USER_PORTFOLIO_JOURNALS_FILE)
    : path.join(getRuntimePaths().usersDir, "portfolio-journals.json");
}

function getUserPortfolioCloseReviewsPath() {
  return process.env.SWING_RADAR_USER_PORTFOLIO_CLOSE_REVIEWS_FILE
    ? path.resolve(process.env.SWING_RADAR_USER_PORTFOLIO_CLOSE_REVIEWS_FILE)
    : path.join(getRuntimePaths().usersDir, "portfolio-close-reviews.json");
}

function getUserPortfolioPersonalRulesPath() {
  return process.env.SWING_RADAR_USER_PORTFOLIO_PERSONAL_RULES_FILE
    ? path.resolve(process.env.SWING_RADAR_USER_PORTFOLIO_PERSONAL_RULES_FILE)
    : path.join(getRuntimePaths().usersDir, "portfolio-personal-rules.json");
}

function getUserOpeningRecheckBoardPath() {
  return process.env.SWING_RADAR_USER_OPENING_RECHECK_FILE
    ? path.resolve(process.env.SWING_RADAR_USER_OPENING_RECHECK_FILE)
    : path.join(getRuntimePaths().usersDir, "opening-recheck-board.json");
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
    email: email.toLowerCase(),
    displayName,
    createdAt,
    updatedAt,
    passwordSalt: normalizeString(payload.passwordSalt) ?? undefined,
    passwordHash: normalizeString(payload.passwordHash) ?? undefined,
    status: payload.status === "suspended" ? "suspended" : "active",
    suspendedUntil: normalizeIsoDate(payload.suspendedUntil) ?? undefined,
    adminNote: normalizeString(payload.adminNote) ?? undefined
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

function normalizeAccountsDocument(value: unknown): UserAccountsDocument {
  if (!value || typeof value !== "object") {
    return { accounts: {}, emailIndex: {} };
  }

  const payload = value as Record<string, unknown>;
  const accountsPayload = payload.accounts;
  if (!accountsPayload || typeof accountsPayload !== "object") {
    return { accounts: {}, emailIndex: {} };
  }

  const accounts = Object.fromEntries(
    Object.entries(accountsPayload).flatMap(([userId, accountValue]) => {
      const account = normalizeUserAccount(accountValue);
      return account ? [[userId, account]] : [];
    })
  );

  return {
    accounts,
    emailIndex: Object.fromEntries(Object.values(accounts).map((account) => [account.email, account.id]))
  };
}

function normalizeSessionsDocument(value: unknown, now = Date.now()): UserSessionsDocument {
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

function normalizePortfolioProfilesDocument(value: unknown): UserPortfolioProfilesDocument {
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
      Object.entries(profilesPayload).map(([userId, profileValue]) => [
        userId,
        profileValue && typeof profileValue === "object" ? (profileValue as StoredPortfolioProfile) : {}
      ])
    )
  };
}

function normalizePortfolioJournalsDocument(value: unknown): UserPortfolioJournalsDocument {
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
      Object.entries(journalsPayload).map(([userId, journalValue]) => [
        userId,
        journalValue && typeof journalValue === "object" ? (journalValue as UserPortfolioJournalsDocument["journals"][string]) : {}
      ])
    )
  };
}

function normalizePortfolioCloseReviewsDocument(value: unknown): UserPortfolioCloseReviewsDocument {
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
      Object.entries(reviewsPayload).map(([userId, reviews]) => [
        userId,
        reviews && typeof reviews === "object" ? (reviews as Record<string, unknown>) : {}
      ])
    )
  };
}

function normalizePortfolioPersonalRulesDocument(value: unknown): UserPortfolioPersonalRulesDocument {
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
      Object.entries(rulesPayload).map(([userId, rules]) => [userId, Array.isArray(rules) ? rules : []])
    )
  };
}

function normalizeOpeningRecheckBoardsDocument(value: unknown): UserOpeningRecheckBoardsDocument {
  if (!value || typeof value !== "object") {
    return { boards: {} };
  }

  const payload = value as Record<string, unknown>;
  const boardsPayload = payload.boards;
  if (!boardsPayload || typeof boardsPayload !== "object") {
    return { boards: {} };
  }

  return {
    boards: Object.fromEntries(
      Object.entries(boardsPayload).map(([userId, board]) => [
        userId,
        board && typeof board === "object" ? (board as { scans?: Record<string, unknown> }) : {}
      ])
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

async function saveJsonDocument<T>(filePath: string, documentName: string, payload: T, normalize?: (value: unknown) => T) {
  const nextPayload = normalize ? normalize(payload) : payload;
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(nextPayload, null, 2)}\n`, "utf8");
  await saveRuntimeDocument(documentName, nextPayload);
  return nextPayload;
}

async function loadAccountsDocument() {
  return loadJsonDocument(getUserAccountsPath(), USER_ACCOUNTS_DOCUMENT_NAME, normalizeAccountsDocument);
}

async function saveAccountsDocument(document: UserAccountsDocument) {
  return saveJsonDocument(getUserAccountsPath(), USER_ACCOUNTS_DOCUMENT_NAME, document, normalizeAccountsDocument);
}

async function loadSessionsDocument() {
  return loadJsonDocument(getUserSessionsPath(), USER_SESSIONS_DOCUMENT_NAME, (value) => normalizeSessionsDocument(value));
}

async function saveSessionsDocument(document: UserSessionsDocument) {
  return saveJsonDocument(getUserSessionsPath(), USER_SESSIONS_DOCUMENT_NAME, document, normalizeSessionsDocument);
}

async function loadPortfolioProfilesDocument() {
  return loadJsonDocument(
    getUserPortfolioProfilesPath(),
    USER_PORTFOLIO_PROFILES_DOCUMENT_NAME,
    normalizePortfolioProfilesDocument
  );
}

async function savePortfolioProfilesDocument(document: UserPortfolioProfilesDocument) {
  return saveJsonDocument(
    getUserPortfolioProfilesPath(),
    USER_PORTFOLIO_PROFILES_DOCUMENT_NAME,
    document,
    normalizePortfolioProfilesDocument
  );
}

async function loadPortfolioJournalsDocument() {
  return loadJsonDocument(
    getUserPortfolioJournalsPath(),
    USER_PORTFOLIO_JOURNALS_DOCUMENT_NAME,
    normalizePortfolioJournalsDocument
  );
}

async function savePortfolioJournalsDocument(document: UserPortfolioJournalsDocument) {
  return saveJsonDocument(
    getUserPortfolioJournalsPath(),
    USER_PORTFOLIO_JOURNALS_DOCUMENT_NAME,
    document,
    normalizePortfolioJournalsDocument
  );
}

async function loadPortfolioCloseReviewsDocument() {
  return loadJsonDocument(
    getUserPortfolioCloseReviewsPath(),
    USER_PORTFOLIO_CLOSE_REVIEWS_DOCUMENT_NAME,
    normalizePortfolioCloseReviewsDocument
  );
}

async function savePortfolioCloseReviewsDocument(document: UserPortfolioCloseReviewsDocument) {
  return saveJsonDocument(
    getUserPortfolioCloseReviewsPath(),
    USER_PORTFOLIO_CLOSE_REVIEWS_DOCUMENT_NAME,
    document,
    normalizePortfolioCloseReviewsDocument
  );
}

async function loadPortfolioPersonalRulesDocument() {
  return loadJsonDocument(
    getUserPortfolioPersonalRulesPath(),
    USER_PORTFOLIO_PERSONAL_RULES_DOCUMENT_NAME,
    normalizePortfolioPersonalRulesDocument
  );
}

async function savePortfolioPersonalRulesDocument(document: UserPortfolioPersonalRulesDocument) {
  return saveJsonDocument(
    getUserPortfolioPersonalRulesPath(),
    USER_PORTFOLIO_PERSONAL_RULES_DOCUMENT_NAME,
    document,
    normalizePortfolioPersonalRulesDocument
  );
}

async function loadOpeningRecheckBoardsDocument() {
  return loadJsonDocument(
    getUserOpeningRecheckBoardPath(),
    USER_OPENING_RECHECK_DOCUMENT_NAME,
    normalizeOpeningRecheckBoardsDocument
  );
}

async function saveOpeningRecheckBoardsDocument(document: UserOpeningRecheckBoardsDocument) {
  return saveJsonDocument(
    getUserOpeningRecheckBoardPath(),
    USER_OPENING_RECHECK_DOCUMENT_NAME,
    document,
    normalizeOpeningRecheckBoardsDocument
  );
}

function resolveAccountStatus(account: StoredUserAccount, now = Date.now()) {
  if (account.status !== "suspended") {
    return "active" as const;
  }

  const suspendedUntil = account.suspendedUntil ? new Date(account.suspendedUntil).getTime() : null;
  if (suspendedUntil && Number.isFinite(suspendedUntil) && suspendedUntil > now) {
    return "suspended" as const;
  }

  return "active" as const;
}

function countRecentUsers(items: AdminUserItem[], days: number) {
  const threshold = Date.now() - days * 86_400_000;
  return items.filter((item) => new Date(item.createdAt).getTime() >= threshold).length;
}

function buildAdminUserItem(
  account: StoredUserAccount,
  sessions: StoredUserSession[],
  profile: StoredPortfolioProfile | undefined,
  journal: UserPortfolioJournalsDocument["journals"][string] | undefined,
  closeReviews: UserPortfolioCloseReviewsDocument["reviews"][string] | undefined,
  personalRules: UserPortfolioPersonalRulesDocument["rules"][string] | undefined,
  openingBoard: UserOpeningRecheckBoardsDocument["boards"][string] | undefined
): AdminUserItem {
  const recentSessions = [...sessions]
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, 5)
    .map((session) => ({
      id: session.id,
      updatedAt: session.updatedAt,
      expiresAt: session.expiresAt
    }));
  const lastActivityAt = recentSessions[0]?.updatedAt ?? null;
  const portfolioPositionCount = Array.isArray(profile?.positions) ? profile.positions.length : 0;
  const portfolioUpdatedAt = normalizeIsoDate(profile?.updatedAt);
  const journalEventCount = Array.isArray(journal?.events) ? journal.events.length : 0;
  const closeReviewCount = closeReviews ? Object.keys(closeReviews).length : 0;
  const personalRuleCount = Array.isArray(personalRules) ? personalRules.length : 0;
  const openingScanCount = openingBoard?.scans ? Object.keys(openingBoard.scans).length : 0;
  const status = resolveAccountStatus(account);

  return {
    id: account.id,
    email: account.email,
    displayName: account.displayName,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
    activeSessionCount: sessions.length,
    lastActivityAt,
    portfolioConfigured:
      portfolioPositionCount > 0 ||
      Boolean(portfolioUpdatedAt && portfolioUpdatedAt !== new Date(0).toISOString()),
    portfolioPositionCount,
    portfolioUpdatedAt,
    status,
    suspendedUntil: status === "suspended" ? account.suspendedUntil ?? null : null,
    adminNote: account.adminNote ?? null,
    journalEventCount,
    closeReviewCount,
    personalRuleCount,
    openingScanCount,
    recentSessions
  };
}

export async function listAdminUsers() {
  const [
    accountsDocument,
    sessionsDocument,
    portfolioProfilesDocument,
    portfolioJournalsDocument,
    portfolioCloseReviewsDocument,
    portfolioPersonalRulesDocument,
    openingRecheckBoardsDocument
  ] = await Promise.all([
    loadAccountsDocument(),
    loadSessionsDocument(),
    loadPortfolioProfilesDocument(),
    loadPortfolioJournalsDocument(),
    loadPortfolioCloseReviewsDocument(),
    loadPortfolioPersonalRulesDocument(),
    loadOpeningRecheckBoardsDocument()
  ]);

  const sessionsByUserId = new Map<string, StoredUserSession[]>();
  for (const session of Object.values(sessionsDocument.sessions)) {
    const list = sessionsByUserId.get(session.userId) ?? [];
    list.push(session);
    sessionsByUserId.set(session.userId, list);
  }

  const items = Object.values(accountsDocument.accounts)
    .map((account) =>
      buildAdminUserItem(
        account,
        sessionsByUserId.get(account.id) ?? [],
        portfolioProfilesDocument.profiles[account.id],
        portfolioJournalsDocument.journals[account.id],
        portfolioCloseReviewsDocument.reviews[account.id],
        portfolioPersonalRulesDocument.rules[account.id],
        openingRecheckBoardsDocument.boards[account.id]
      )
    )
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
    activeSessions: items.reduce((total, item) => total + item.activeSessionCount, 0),
    suspendedUsers: items.filter((item) => item.status === "suspended").length
  };

  return { items, summary };
}

export async function revokeAdminUserSessions(userId: string) {
  const sessionsDocument = await loadSessionsDocument();
  const removedSessionIds = Object.entries(sessionsDocument.sessions)
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

export async function updateAdminUserAccount(input: {
  userId: string;
  email: string;
  displayName: string;
  adminNote?: string | null;
}) {
  const accountsDocument = await loadAccountsDocument();
  const account = accountsDocument.accounts[input.userId];
  if (!account) {
    throw new ApiError(404, "ADMIN_USER_NOT_FOUND", "The requested user account could not be found.");
  }

  const nextEmail = input.email.trim().toLowerCase();
  const nextDisplayName = input.displayName.trim();
  const nextAdminNote = input.adminNote?.trim() ? input.adminNote.trim() : undefined;

  if (!nextEmail) {
    throw new ApiError(400, "ADMIN_USER_EMAIL_REQUIRED", "Email is required.");
  }

  if (!nextDisplayName) {
    throw new ApiError(400, "ADMIN_USER_NAME_REQUIRED", "Display name is required.");
  }

  const existingUserId = accountsDocument.emailIndex[nextEmail];
  if (existingUserId && existingUserId !== input.userId) {
    throw new ApiError(409, "ADMIN_USER_EMAIL_CONFLICT", "Another account is already using that email.");
  }

  if (account.email !== nextEmail) {
    delete accountsDocument.emailIndex[account.email];
    accountsDocument.emailIndex[nextEmail] = account.id;
  }

  accountsDocument.accounts[input.userId] = {
    ...account,
    email: nextEmail,
    displayName: nextDisplayName,
    adminNote: nextAdminNote,
    updatedAt: new Date().toISOString()
  };

  await saveAccountsDocument(accountsDocument);
  return accountsDocument.accounts[input.userId];
}

export async function suspendAdminUserAccount(input: { userId: string; days: number; adminNote?: string | null }) {
  const accountsDocument = await loadAccountsDocument();
  const account = accountsDocument.accounts[input.userId];
  if (!account) {
    throw new ApiError(404, "ADMIN_USER_NOT_FOUND", "The requested user account could not be found.");
  }

  const days = Math.max(1, Math.round(input.days));
  const suspendedUntil = new Date(Date.now() + days * 86_400_000).toISOString();
  accountsDocument.accounts[input.userId] = {
    ...account,
    status: "suspended",
    suspendedUntil,
    adminNote: input.adminNote?.trim() ? input.adminNote.trim() : account.adminNote,
    updatedAt: new Date().toISOString()
  };

  await saveAccountsDocument(accountsDocument);
  const revokeResult = await revokeAdminUserSessions(input.userId);

  return {
    account: accountsDocument.accounts[input.userId],
    suspendedUntil,
    removedSessions: revokeResult.removedCount
  };
}

export async function clearAdminUserSuspension(userId: string) {
  const accountsDocument = await loadAccountsDocument();
  const account = accountsDocument.accounts[userId];
  if (!account) {
    throw new ApiError(404, "ADMIN_USER_NOT_FOUND", "The requested user account could not be found.");
  }

  accountsDocument.accounts[userId] = {
    ...account,
    status: "active",
    suspendedUntil: undefined,
    updatedAt: new Date().toISOString()
  };

  await saveAccountsDocument(accountsDocument);
  return accountsDocument.accounts[userId];
}

export async function deleteAdminUserAccount(userId: string) {
  const [
    accountsDocument,
    sessionsDocument,
    portfolioProfilesDocument,
    portfolioJournalsDocument,
    portfolioCloseReviewsDocument,
    portfolioPersonalRulesDocument,
    openingRecheckBoardsDocument
  ] = await Promise.all([
    loadAccountsDocument(),
    loadSessionsDocument(),
    loadPortfolioProfilesDocument(),
    loadPortfolioJournalsDocument(),
    loadPortfolioCloseReviewsDocument(),
    loadPortfolioPersonalRulesDocument(),
    loadOpeningRecheckBoardsDocument()
  ]);

  const account = accountsDocument.accounts[userId];
  if (!account) {
    throw new ApiError(404, "ADMIN_USER_NOT_FOUND", "The requested user account could not be found.");
  }

  delete accountsDocument.accounts[userId];
  delete accountsDocument.emailIndex[account.email];

  const removedSessionIds = Object.entries(sessionsDocument.sessions)
    .filter(([, session]) => session.userId === userId)
    .map(([sessionId]) => sessionId);
  for (const sessionId of removedSessionIds) {
    delete sessionsDocument.sessions[sessionId];
  }

  delete portfolioProfilesDocument.profiles[userId];
  delete portfolioJournalsDocument.journals[userId];
  delete portfolioCloseReviewsDocument.reviews[userId];
  delete portfolioPersonalRulesDocument.rules[userId];
  delete openingRecheckBoardsDocument.boards[userId];

  await Promise.all([
    saveAccountsDocument(accountsDocument),
    saveSessionsDocument(sessionsDocument),
    savePortfolioProfilesDocument(portfolioProfilesDocument),
    savePortfolioJournalsDocument(portfolioJournalsDocument),
    savePortfolioCloseReviewsDocument(portfolioCloseReviewsDocument),
    savePortfolioPersonalRulesDocument(portfolioPersonalRulesDocument),
    saveOpeningRecheckBoardsDocument(openingRecheckBoardsDocument)
  ]);

  return {
    email: account.email,
    removedSessions: removedSessionIds.length
  };
}
