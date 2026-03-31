import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ApiError } from "@/lib/server/api-error";
import { loadRuntimeDocument, saveRuntimeDocument } from "@/lib/server/runtime-documents";
import { getRuntimePaths } from "@/lib/server/runtime-paths";
import type { AuthSession, AuthUser } from "@/types/auth";

const USER_ACCOUNTS_DOCUMENT_NAME = "user-accounts";
const USER_SESSIONS_DOCUMENT_NAME = "user-sessions";
const USER_SESSION_COOKIE_NAME = "swing_radar_session";
const USER_SESSION_TTL_DAYS = 30;

interface StoredUserAccount extends AuthUser {
  passwordSalt: string;
  passwordHash: string;
}

interface StoredUserSession {
  id: string;
  userId: string;
  tokenHash: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

interface UserAccountsDocument {
  accounts: Record<string, StoredUserAccount>;
  emailIndex: Record<string, string>;
}

interface UserSessionsDocument {
  sessions: Record<string, StoredUserSession>;
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

function createEmptyAccountsDocument(): UserAccountsDocument {
  return {
    accounts: {},
    emailIndex: {}
  };
}

function createEmptySessionsDocument(): UserSessionsDocument {
  return {
    sessions: {}
  };
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isIsoDate(value: unknown) {
  return typeof value === "string" && value.trim() && !Number.isNaN(new Date(value).getTime());
}

function toPublicUser(account: StoredUserAccount): AuthUser {
  return {
    id: account.id,
    email: account.email,
    displayName: account.displayName,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt
  };
}

function hashPassword(password: string, salt: string) {
  return scryptSync(password, salt, 64).toString("hex");
}

function createPasswordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  return {
    passwordSalt: salt,
    passwordHash: hashPassword(password, salt)
  };
}

function verifyPassword(password: string, account: StoredUserAccount) {
  const expected = Buffer.from(account.passwordHash, "hex");
  const received = Buffer.from(hashPassword(password, account.passwordSalt), "hex");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function normalizeAccount(value: unknown): StoredUserAccount | null {
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
    createdAt,
    updatedAt
  };
}

function normalizeAccountsDocument(value: unknown): UserAccountsDocument {
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
  const emailIndex = Object.fromEntries(
    Object.values(accounts).map((account) => [normalizeEmail(account.email), account.id])
  );

  return { accounts, emailIndex };
}

function normalizeSession(value: unknown): StoredUserSession | null {
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
    expiresAt
  };
}

function trimExpiredSessions(document: UserSessionsDocument, now = Date.now()) {
  const sessions = Object.fromEntries(
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
  );

  return { sessions };
}

function normalizeSessionsDocument(value: unknown): UserSessionsDocument {
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

async function loadAccountsDocument() {
  try {
    const content = await readFile(getUserAccountsPath(), "utf8");
    return normalizeAccountsDocument(JSON.parse(content.replace(/^\uFEFF/, "")));
  } catch {
    const runtimeDocument = await loadRuntimeDocument<UserAccountsDocument>(USER_ACCOUNTS_DOCUMENT_NAME);
    return normalizeAccountsDocument(runtimeDocument);
  }
}

async function saveAccountsDocument(document: UserAccountsDocument) {
  const normalized = normalizeAccountsDocument(document);
  await mkdir(path.dirname(getUserAccountsPath()), { recursive: true });
  await writeFile(getUserAccountsPath(), `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  await saveRuntimeDocument(USER_ACCOUNTS_DOCUMENT_NAME, normalized);
}

async function loadSessionsDocument() {
  try {
    const content = await readFile(getUserSessionsPath(), "utf8");
    return normalizeSessionsDocument(JSON.parse(content.replace(/^\uFEFF/, "")));
  } catch {
    const runtimeDocument = await loadRuntimeDocument<UserSessionsDocument>(USER_SESSIONS_DOCUMENT_NAME);
    return normalizeSessionsDocument(runtimeDocument);
  }
}

async function saveSessionsDocument(document: UserSessionsDocument) {
  const normalized = normalizeSessionsDocument(document);
  await mkdir(path.dirname(getUserSessionsPath()), { recursive: true });
  await writeFile(getUserSessionsPath(), `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  await saveRuntimeDocument(USER_SESSIONS_DOCUMENT_NAME, normalized);
}

function extractCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) {
    return null;
  }

  for (const entry of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = entry.trim().split("=");
    if (rawName === name) {
      return decodeURIComponent(rawValue.join("="));
    }
  }

  return null;
}

function createSessionExpiration() {
  return new Date(Date.now() + USER_SESSION_TTL_DAYS * 86_400_000).toISOString();
}

export function getUserSessionCookieName() {
  return USER_SESSION_COOKIE_NAME;
}

export async function createUserAccount(input: {
  email: string;
  displayName: string;
  password: string;
}) {
  const email = normalizeEmail(input.email);
  const displayName = input.displayName.trim();
  const password = input.password;

  if (!email) {
    throw new ApiError(400, "AUTH_EMAIL_REQUIRED", "이메일을 입력해 주세요.");
  }

  if (!displayName) {
    throw new ApiError(400, "AUTH_DISPLAY_NAME_REQUIRED", "이름을 입력해 주세요.");
  }

  if (password.length < 8) {
    throw new ApiError(400, "AUTH_PASSWORD_TOO_SHORT", "비밀번호는 8자 이상이어야 합니다.");
  }

  const document = await loadAccountsDocument();
  if (document.emailIndex[email]) {
    throw new ApiError(409, "AUTH_EMAIL_CONFLICT", "이미 사용 중인 이메일입니다.");
  }

  const now = new Date().toISOString();
  const account: StoredUserAccount = {
    id: randomBytes(12).toString("hex"),
    email,
    displayName,
    ...createPasswordHash(password),
    createdAt: now,
    updatedAt: now
  };

  document.accounts[account.id] = account;
  document.emailIndex[email] = account.id;
  await saveAccountsDocument(document);

  return toPublicUser(account);
}

export async function authenticateUserAccount(input: { email: string; password: string }) {
  const email = normalizeEmail(input.email);
  const document = await loadAccountsDocument();
  const userId = document.emailIndex[email];
  const account = userId ? document.accounts[userId] : null;

  if (!account || !verifyPassword(input.password, account)) {
    throw new ApiError(401, "AUTH_INVALID_CREDENTIALS", "이메일 또는 비밀번호가 맞지 않습니다.");
  }

  return toPublicUser(account);
}

export async function createUserSession(user: AuthUser) {
  const rawToken = randomBytes(24).toString("hex");
  const now = new Date().toISOString();
  const session: StoredUserSession = {
    id: randomBytes(12).toString("hex"),
    userId: user.id,
    tokenHash: hashSessionToken(rawToken),
    createdAt: now,
    updatedAt: now,
    expiresAt: createSessionExpiration()
  };

  const document = await loadSessionsDocument();
  document.sessions[session.id] = session;
  await saveSessionsDocument(document);

  return {
    rawToken,
    session: {
      sessionId: session.id,
      user,
      expiresAt: session.expiresAt
    } satisfies AuthSession
  };
}

async function resolveSessionByRawToken(rawToken: string | null): Promise<AuthSession | null> {
  if (!rawToken) {
    return null;
  }

  const tokenHash = hashSessionToken(rawToken);
  const [accountsDocument, sessionsDocument] = await Promise.all([loadAccountsDocument(), loadSessionsDocument()]);
  const session = Object.values(sessionsDocument.sessions).find((entry) => entry.tokenHash === tokenHash);
  if (!session) {
    return null;
  }

  const account = accountsDocument.accounts[session.userId];
  if (!account) {
    return null;
  }

  return {
    sessionId: session.id,
    user: toPublicUser(account),
    expiresAt: session.expiresAt
  };
}

export async function getUserSessionFromRequest(request: Request) {
  return resolveSessionByRawToken(extractCookieValue(request.headers.get("cookie"), USER_SESSION_COOKIE_NAME));
}

export async function getCurrentUserSession() {
  try {
    const cookieStore = await cookies();
    return resolveSessionByRawToken(cookieStore.get(USER_SESSION_COOKIE_NAME)?.value ?? null);
  } catch {
    return null;
  }
}

export async function requireUserSession(request: Request) {
  const session = await getUserSessionFromRequest(request);
  if (!session) {
    throw new ApiError(401, "AUTH_UNAUTHORIZED", "로그인이 필요합니다.");
  }

  return session;
}

export function applyUserSessionCookie(
  response: NextResponse,
  input: { rawToken: string; expiresAt: string }
) {
  response.cookies.set({
    name: USER_SESSION_COOKIE_NAME,
    value: input.rawToken,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(input.expiresAt)
  });
}

export function clearUserSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: USER_SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0)
  });
}

export async function revokeUserSession(rawToken: string | null) {
  if (!rawToken) {
    return false;
  }

  const tokenHash = hashSessionToken(rawToken);
  const document = await loadSessionsDocument();
  const sessionId = Object.values(document.sessions).find((entry) => entry.tokenHash === tokenHash)?.id;
  if (!sessionId) {
    return false;
  }

  delete document.sessions[sessionId];
  await saveSessionsDocument(document);
  return true;
}
