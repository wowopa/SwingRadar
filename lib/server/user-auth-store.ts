import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { loadRuntimeDocument, saveRuntimeDocument } from "@/lib/server/runtime-documents";
import { getRuntimePaths } from "@/lib/server/runtime-paths";
import type { AuthUser } from "@/types/auth";

export const USER_ACCOUNTS_DOCUMENT_NAME = "user-accounts";
export const USER_SESSIONS_DOCUMENT_NAME = "user-sessions";
export const USER_LOGIN_ATTEMPTS_DOCUMENT_NAME = "user-login-attempts";
export const USER_AUTH_ACTIONS_DOCUMENT_NAME = "user-auth-actions";
export const USER_SESSION_COOKIE_NAME = "swing_radar_session";
export const USER_SESSION_TTL_DAYS = 30;
export const LOGIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_ATTEMPT_BLOCK_MS = 15 * 60 * 1000;
export const LOGIN_ATTEMPT_MAX_FAILURES = 5;
export const EMAIL_VERIFICATION_TTL_MS = 48 * 60 * 60 * 1000;
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

export type AuthActionKind = "email_verification" | "password_reset";

export interface StoredUserAccount extends AuthUser {
  passwordSalt: string;
  passwordHash: string;
  status?: "active" | "suspended";
  suspendedUntil?: string;
  adminNote?: string;
}

export interface StoredUserSession {
  id: string;
  userId: string;
  tokenHash: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  userAgent?: string;
  ipHash?: string;
}

export interface StoredLoginAttempt {
  failures: string[];
  blockedUntil?: string;
  updatedAt: string;
}

export interface StoredAuthActionToken {
  id: string;
  kind: AuthActionKind;
  userId: string;
  email: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
  requestedUserAgent?: string;
  requestedIpHash?: string;
}

export interface UserAccountsDocument {
  accounts: Record<string, StoredUserAccount>;
  emailIndex: Record<string, string>;
}

export interface UserSessionsDocument {
  sessions: Record<string, StoredUserSession>;
}

export interface UserLoginAttemptsDocument {
  attempts: Record<string, StoredLoginAttempt>;
}

export interface UserAuthActionsDocument {
  actions: Record<string, StoredAuthActionToken>;
}

declare global {
  var __swingRadarAuthMemoryStore: Map<string, unknown> | undefined;
}

export function createEmptyAccountsDocument(): UserAccountsDocument {
  return {
    accounts: {},
    emailIndex: {}
  };
}

export function createEmptySessionsDocument(): UserSessionsDocument {
  return {
    sessions: {}
  };
}

export function createEmptyLoginAttemptsDocument(): UserLoginAttemptsDocument {
  return {
    attempts: {}
  };
}

export function createEmptyAuthActionsDocument(): UserAuthActionsDocument {
  return {
    actions: {}
  };
}

export function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isIsoDate(value: unknown) {
  return typeof value === "string" && value.trim() && !Number.isNaN(new Date(value).getTime());
}

export function hashIdentifier(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function resolveLegacyAuthStorageNamespace() {
  const legacySeed =
    normalizeOptionalString(process.env.SWING_RADAR_USER_ACCOUNTS_FILE) ??
    normalizeOptionalString(process.env.SWING_RADAR_USER_SESSIONS_FILE) ??
    normalizeOptionalString(process.env.SWING_RADAR_USER_LOGIN_ATTEMPTS_FILE);

  if (!legacySeed) {
    return null;
  }

  return hashIdentifier(legacySeed).slice(0, 16);
}

function resolvePreferredAuthStorageNamespace() {
  return normalizeOptionalString(process.env.SWING_RADAR_AUTH_STORAGE_NAMESPACE) ?? "default";
}

function getScopedDocumentName(documentName: string, namespace = resolvePreferredAuthStorageNamespace()) {
  return `${documentName}:${namespace}`;
}

function getPreferredScopedDocumentName(documentName: string) {
  return getScopedDocumentName(documentName, resolvePreferredAuthStorageNamespace());
}

function getDocumentLookupNames(documentName: string) {
  const preferred = getPreferredScopedDocumentName(documentName);
  const legacyNamespace = resolveLegacyAuthStorageNamespace();

  return Array.from(
    new Set([
      preferred,
      legacyNamespace ? getScopedDocumentName(documentName, legacyNamespace) : null,
      documentName
    ].filter((value): value is string => Boolean(value)))
  );
}

function sanitizeDocumentFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-");
}

function resolveProjectRoot() {
  return process.cwd();
}

function getLegacyDocumentPath(documentName: string) {
  if (documentName === USER_ACCOUNTS_DOCUMENT_NAME) {
    return normalizeOptionalString(process.env.SWING_RADAR_USER_ACCOUNTS_FILE);
  }

  if (documentName === USER_SESSIONS_DOCUMENT_NAME) {
    return normalizeOptionalString(process.env.SWING_RADAR_USER_SESSIONS_FILE);
  }

  if (documentName === USER_LOGIN_ATTEMPTS_DOCUMENT_NAME) {
    return normalizeOptionalString(process.env.SWING_RADAR_USER_LOGIN_ATTEMPTS_FILE);
  }

  if (documentName === USER_AUTH_ACTIONS_DOCUMENT_NAME) {
    return normalizeOptionalString(process.env.SWING_RADAR_USER_AUTH_ACTIONS_FILE);
  }

  return undefined;
}

function getPreferredDocumentFilePath(documentName: string) {
  const legacyPath = getLegacyDocumentPath(documentName);
  if (legacyPath) {
    return path.resolve(legacyPath);
  }

  const scopedName = getPreferredScopedDocumentName(documentName);
  const runtimePaths = getRuntimePaths(resolveProjectRoot());
  return path.join(runtimePaths.usersDir, "auth", `${sanitizeDocumentFileName(scopedName)}.json`);
}

function getDocumentFileCandidatePaths(documentName: string) {
  const legacyPath = getLegacyDocumentPath(documentName);
  if (legacyPath) {
    return [path.resolve(legacyPath)];
  }

  const runtimePaths = getRuntimePaths(resolveProjectRoot());
  return Array.from(
    new Set(
      getDocumentLookupNames(documentName).map((candidateName) =>
        path.join(runtimePaths.usersDir, "auth", `${sanitizeDocumentFileName(candidateName)}.json`)
      )
    )
  );
}

function allowInMemoryAuthStore() {
  return process.env.NODE_ENV !== "production" || process.env.SWING_RADAR_ALLOW_IN_MEMORY_AUTH === "1";
}

function getInMemoryAuthStore() {
  if (!globalThis.__swingRadarAuthMemoryStore) {
    globalThis.__swingRadarAuthMemoryStore = new Map<string, unknown>();
  }

  return globalThis.__swingRadarAuthMemoryStore;
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content.replace(/^\uFEFF/, "")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    if (error instanceof SyntaxError) {
      console.warn(`[user-auth-store] Invalid JSON ignored: ${filePath}`, error.message);
      return null;
    }

    throw error;
  }
}

async function loadFromFileStorage<T>(documentName: string) {
  for (const filePath of getDocumentFileCandidatePaths(documentName)) {
    const document = await readJsonFile<T>(filePath);
    if (document !== null) {
      return {
        document,
        filePath
      };
    }
  }

  return null;
}

async function saveToFileStorage(documentName: string, payload: unknown) {
  const filePath = getPreferredDocumentFilePath(documentName);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function loadStoredDocument<T>(documentName: string) {
  const preferredScopedName = getPreferredScopedDocumentName(documentName);
  const lookupNames = getDocumentLookupNames(documentName);

  for (const runtimeName of lookupNames) {
    try {
      const runtimeDocument = await loadRuntimeDocument<T>(runtimeName);
      if (!runtimeDocument) {
        continue;
      }

      if (runtimeName !== preferredScopedName) {
        try {
          await saveRuntimeDocument(preferredScopedName, runtimeDocument);
        } catch (error) {
          console.warn(
            `[user-auth-store] Runtime auth storage migration failed for ${documentName}, continuing with legacy runtime document.`,
            error
          );
        }
      }

      try {
        await saveToFileStorage(documentName, runtimeDocument);
      } catch (error) {
        console.warn(
          `[user-auth-store] File auth backup sync failed for ${documentName}, continuing with runtime storage.`,
          error
        );
      }

      return runtimeDocument;
    } catch (error) {
      console.warn(
        `[user-auth-store] Runtime auth storage read failed for ${documentName} (${runtimeName}), falling back to next storage.`,
        error
      );
    }
  }

  const fileEntry = await loadFromFileStorage<T>(documentName);
  if (fileEntry !== null) {
    try {
      await saveRuntimeDocument(preferredScopedName, fileEntry.document);
    } catch (error) {
      console.warn(
        `[user-auth-store] Runtime auth storage sync failed for ${documentName}, continuing with file storage.`,
        error
      );
    }

    if (fileEntry.filePath !== getPreferredDocumentFilePath(documentName)) {
      try {
        await saveToFileStorage(documentName, fileEntry.document);
      } catch (error) {
        console.warn(
          `[user-auth-store] Preferred file auth storage sync failed for ${documentName}, continuing with legacy file storage.`,
          error
        );
      }
    }

    return fileEntry.document;
  }

  if (allowInMemoryAuthStore()) {
    const store = getInMemoryAuthStore();
    for (const lookupName of lookupNames) {
      const inMemoryDocument = store.get(lookupName) as T | undefined;
      if (inMemoryDocument !== undefined) {
        if (lookupName !== preferredScopedName) {
          store.set(preferredScopedName, inMemoryDocument);
        }
        return inMemoryDocument;
      }
    }

    return null;
  }

  return null;
}

async function saveStoredDocument(documentName: string, payload: unknown) {
  const scopedName = getPreferredScopedDocumentName(documentName);
  let runtimeSaved = false;

  try {
    runtimeSaved = await saveRuntimeDocument(scopedName, payload);
  } catch (error) {
    console.warn(
      `[user-auth-store] Runtime auth storage write failed for ${documentName}, falling back to file storage.`,
      error
    );
  }

  try {
    await saveToFileStorage(documentName, payload);
    return;
  } catch (error) {
    if (runtimeSaved) {
      console.warn(
        `[user-auth-store] File auth backup write failed for ${documentName}, keeping runtime storage as source of truth.`,
        error
      );
      return;
    }

    if (!allowInMemoryAuthStore()) {
      throw new Error(`Persistent auth storage is not configured for ${documentName}.`);
    }

    console.warn(
      `[user-auth-store] File auth storage write failed for ${documentName}, falling back to in-memory storage.`,
      error
    );
    getInMemoryAuthStore().set(scopedName, payload);
    return;
  }

  if (!allowInMemoryAuthStore()) {
    throw new Error(`Persistent auth storage is not configured for ${documentName}.`);
  }
}

export function toPublicUser(account: StoredUserAccount): AuthUser {
  return {
    id: account.id,
    email: account.email,
    displayName: account.displayName,
    emailVerifiedAt: account.emailVerifiedAt ?? null,
    passwordUpdatedAt: account.passwordUpdatedAt ?? null,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt
  };
}

export function resolveStoredAccountStatus(account: StoredUserAccount, now = Date.now()) {
  if (account.status !== "suspended") {
    return "active" as const;
  }

  const suspendedUntil = account.suspendedUntil ? new Date(account.suspendedUntil).getTime() : null;
  if (suspendedUntil && Number.isFinite(suspendedUntil) && suspendedUntil > now) {
    return "suspended" as const;
  }

  return "active" as const;
}

export function normalizeAccount(value: unknown): StoredUserAccount | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Record<string, unknown>;
  const id = normalizeOptionalString(payload.id);
  const email = normalizeOptionalString(payload.email);
  const displayName = normalizeOptionalString(payload.displayName);
  const passwordSalt = normalizeOptionalString(payload.passwordSalt);
  const passwordHash = normalizeOptionalString(payload.passwordHash);
  const createdAt = isIsoDate(payload.createdAt) ? String(payload.createdAt) : undefined;
  const updatedAt = isIsoDate(payload.updatedAt) ? String(payload.updatedAt) : undefined;

  if (!id || !email || !displayName || !passwordSalt || !passwordHash || !createdAt || !updatedAt) {
    return null;
  }

  return {
    id,
    email: normalizeEmail(email),
    displayName,
    passwordSalt,
    passwordHash,
    emailVerifiedAt: isIsoDate(payload.emailVerifiedAt) ? String(payload.emailVerifiedAt) : null,
    passwordUpdatedAt: isIsoDate(payload.passwordUpdatedAt) ? String(payload.passwordUpdatedAt) : createdAt,
    status: payload.status === "suspended" ? "suspended" : "active",
    suspendedUntil: normalizeOptionalString(payload.suspendedUntil),
    adminNote: normalizeOptionalString(payload.adminNote),
    createdAt,
    updatedAt
  };
}

export function normalizeAccountsDocument(value: unknown): UserAccountsDocument {
  if (!value || typeof value !== "object") {
    return createEmptyAccountsDocument();
  }

  const payload = value as Record<string, unknown>;
  const accountsPayload = payload.accounts;
  if (!accountsPayload || typeof accountsPayload !== "object") {
    return createEmptyAccountsDocument();
  }

  const accounts = Object.fromEntries(
    Object.entries(accountsPayload).flatMap(([userId, accountValue]) => {
      const normalized = normalizeAccount(accountValue);
      return normalized ? [[userId, normalized]] : [];
    })
  );

  return {
    accounts,
    emailIndex: Object.fromEntries(Object.values(accounts).map((account) => [normalizeEmail(account.email), account.id]))
  };
}

export function normalizeSession(value: unknown): StoredUserSession | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Record<string, unknown>;
  const id = normalizeOptionalString(payload.id);
  const userId = normalizeOptionalString(payload.userId);
  const tokenHash = normalizeOptionalString(payload.tokenHash);
  const createdAt = isIsoDate(payload.createdAt) ? String(payload.createdAt) : undefined;
  const updatedAt = isIsoDate(payload.updatedAt) ? String(payload.updatedAt) : undefined;
  const expiresAt = isIsoDate(payload.expiresAt) ? String(payload.expiresAt) : undefined;

  if (!id || !userId || !tokenHash || !createdAt || !updatedAt || !expiresAt) {
    return null;
  }

  return {
    id,
    userId,
    tokenHash,
    createdAt,
    updatedAt,
    expiresAt,
    userAgent: normalizeOptionalString(payload.userAgent),
    ipHash: normalizeOptionalString(payload.ipHash)
  };
}

export function trimExpiredSessions(document: UserSessionsDocument, now = Date.now()) {
  return {
    sessions: Object.fromEntries(
      Object.entries(document.sessions).flatMap(([sessionId, sessionValue]) => {
        const session = normalizeSession(sessionValue);
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

export function normalizeSessionsDocument(value: unknown): UserSessionsDocument {
  if (!value || typeof value !== "object") {
    return createEmptySessionsDocument();
  }

  const payload = value as Record<string, unknown>;
  const sessionsPayload = payload.sessions;
  if (!sessionsPayload || typeof sessionsPayload !== "object") {
    return createEmptySessionsDocument();
  }

  return trimExpiredSessions({
    sessions: Object.fromEntries(
      Object.entries(sessionsPayload).flatMap(([sessionId, sessionValue]) => {
        const normalized = normalizeSession(sessionValue);
        return normalized ? [[sessionId, normalized]] : [];
      })
    )
  });
}

export function normalizeLoginAttempt(value: unknown): StoredLoginAttempt | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Record<string, unknown>;
  const failures = Array.isArray(payload.failures)
    ? payload.failures.flatMap((item) => (isIsoDate(item) ? [String(item)] : []))
    : [];
  const updatedAt = isIsoDate(payload.updatedAt)
    ? String(payload.updatedAt)
    : failures.at(-1) ?? new Date(0).toISOString();
  const blockedUntil = isIsoDate(payload.blockedUntil) ? String(payload.blockedUntil) : undefined;

  return {
    failures,
    blockedUntil,
    updatedAt
  };
}

export function trimExpiredLoginAttempts(document: UserLoginAttemptsDocument, now = Date.now()) {
  return {
    attempts: Object.fromEntries(
      Object.entries(document.attempts).flatMap(([key, value]) => {
        const normalized = normalizeLoginAttempt(value);
        if (!normalized) {
          return [];
        }

        const failures = normalized.failures.filter((failureAt) => {
          const failureTime = new Date(failureAt).getTime();
          return Number.isFinite(failureTime) && now - failureTime <= LOGIN_ATTEMPT_WINDOW_MS;
        });
        const blockedUntil =
          normalized.blockedUntil && new Date(normalized.blockedUntil).getTime() > now
            ? normalized.blockedUntil
            : undefined;

        if (!failures.length && !blockedUntil) {
          return [];
        }

        return [
          [
            key,
            {
              failures,
              blockedUntil,
              updatedAt: failures.at(-1) ?? normalized.updatedAt
            } satisfies StoredLoginAttempt
          ]
        ];
      })
    )
  };
}

export function normalizeLoginAttemptsDocument(value: unknown): UserLoginAttemptsDocument {
  if (!value || typeof value !== "object") {
    return createEmptyLoginAttemptsDocument();
  }

  const payload = value as Record<string, unknown>;
  const attemptsPayload = payload.attempts;
  if (!attemptsPayload || typeof attemptsPayload !== "object") {
    return createEmptyLoginAttemptsDocument();
  }

  return trimExpiredLoginAttempts({
    attempts: Object.fromEntries(
      Object.entries(attemptsPayload).flatMap(([key, attemptValue]) => {
        const normalized = normalizeLoginAttempt(attemptValue);
        return normalized ? [[key, normalized]] : [];
      })
    )
  });
}

function normalizeAuthActionKind(value: unknown): AuthActionKind | null {
  return value === "email_verification" || value === "password_reset" ? value : null;
}

export function normalizeAuthAction(value: unknown): StoredAuthActionToken | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Record<string, unknown>;
  const id = normalizeOptionalString(payload.id);
  const kind = normalizeAuthActionKind(payload.kind);
  const userId = normalizeOptionalString(payload.userId);
  const email = normalizeOptionalString(payload.email);
  const tokenHash = normalizeOptionalString(payload.tokenHash);
  const createdAt = isIsoDate(payload.createdAt) ? String(payload.createdAt) : undefined;
  const expiresAt = isIsoDate(payload.expiresAt) ? String(payload.expiresAt) : undefined;

  if (!id || !kind || !userId || !email || !tokenHash || !createdAt || !expiresAt) {
    return null;
  }

  return {
    id,
    kind,
    userId,
    email: normalizeEmail(email),
    tokenHash,
    createdAt,
    expiresAt,
    requestedUserAgent: normalizeOptionalString(payload.requestedUserAgent),
    requestedIpHash: normalizeOptionalString(payload.requestedIpHash)
  };
}

export function trimExpiredAuthActions(document: UserAuthActionsDocument, now = Date.now()) {
  return {
    actions: Object.fromEntries(
      Object.entries(document.actions).flatMap(([actionId, value]) => {
        const action = normalizeAuthAction(value);
        if (!action) {
          return [];
        }

        const expiresAt = new Date(action.expiresAt).getTime();
        if (!Number.isFinite(expiresAt) || expiresAt <= now) {
          return [];
        }

        return [[actionId, action]];
      })
    )
  };
}

export function normalizeAuthActionsDocument(value: unknown): UserAuthActionsDocument {
  if (!value || typeof value !== "object") {
    return createEmptyAuthActionsDocument();
  }

  const payload = value as Record<string, unknown>;
  const actionsPayload = payload.actions;
  if (!actionsPayload || typeof actionsPayload !== "object") {
    return createEmptyAuthActionsDocument();
  }

  return trimExpiredAuthActions({
    actions: Object.fromEntries(
      Object.entries(actionsPayload).flatMap(([actionId, actionValue]) => {
        const normalized = normalizeAuthAction(actionValue);
        return normalized ? [[actionId, normalized]] : [];
      })
    )
  });
}

export async function loadAccountsDocument() {
  const document = await loadStoredDocument<UserAccountsDocument>(USER_ACCOUNTS_DOCUMENT_NAME);
  return normalizeAccountsDocument(document);
}

export async function saveAccountsDocument(document: UserAccountsDocument) {
  const normalized = normalizeAccountsDocument(document);
  await saveStoredDocument(USER_ACCOUNTS_DOCUMENT_NAME, normalized);
}

export async function loadSessionsDocument() {
  const document = await loadStoredDocument<UserSessionsDocument>(USER_SESSIONS_DOCUMENT_NAME);
  return normalizeSessionsDocument(document);
}

export async function saveSessionsDocument(document: UserSessionsDocument) {
  const normalized = normalizeSessionsDocument(document);
  await saveStoredDocument(USER_SESSIONS_DOCUMENT_NAME, normalized);
}

export async function loadLoginAttemptsDocument() {
  const document = await loadStoredDocument<UserLoginAttemptsDocument>(USER_LOGIN_ATTEMPTS_DOCUMENT_NAME);
  return normalizeLoginAttemptsDocument(document);
}

export async function saveLoginAttemptsDocument(document: UserLoginAttemptsDocument) {
  const normalized = normalizeLoginAttemptsDocument(document);
  await saveStoredDocument(USER_LOGIN_ATTEMPTS_DOCUMENT_NAME, normalized);
}

export async function loadAuthActionsDocument() {
  const document = await loadStoredDocument<UserAuthActionsDocument>(USER_AUTH_ACTIONS_DOCUMENT_NAME);
  return normalizeAuthActionsDocument(document);
}

export async function saveAuthActionsDocument(document: UserAuthActionsDocument) {
  const normalized = normalizeAuthActionsDocument(document);
  await saveStoredDocument(USER_AUTH_ACTIONS_DOCUMENT_NAME, normalized);
}
