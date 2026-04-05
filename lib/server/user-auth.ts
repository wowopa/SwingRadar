import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ApiError } from "@/lib/server/api-error";
import { loadRuntimeDocument, saveRuntimeDocument } from "@/lib/server/runtime-documents";
import { getRuntimePaths } from "@/lib/server/runtime-paths";
import type { AccountSessionItem, AuthSession, AuthUser } from "@/types/auth";

const USER_ACCOUNTS_DOCUMENT_NAME = "user-accounts";
const USER_SESSIONS_DOCUMENT_NAME = "user-sessions";
const USER_LOGIN_ATTEMPTS_DOCUMENT_NAME = "user-login-attempts";
const USER_SESSION_COOKIE_NAME = "swing_radar_session";
const USER_SESSION_TTL_DAYS = 30;
const LOGIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_ATTEMPT_BLOCK_MS = 15 * 60 * 1000;
const LOGIN_ATTEMPT_MAX_FAILURES = 5;

interface StoredUserAccount extends AuthUser {
  passwordSalt: string;
  passwordHash: string;
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
  userAgent?: string;
  ipHash?: string;
}

interface UserAccountsDocument {
  accounts: Record<string, StoredUserAccount>;
  emailIndex: Record<string, string>;
}

interface UserSessionsDocument {
  sessions: Record<string, StoredUserSession>;
}

interface StoredLoginAttempt {
  failures: string[];
  blockedUntil?: string;
  updatedAt: string;
}

interface UserLoginAttemptsDocument {
  attempts: Record<string, StoredLoginAttempt>;
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

function getUserLoginAttemptsPath() {
  return process.env.SWING_RADAR_USER_LOGIN_ATTEMPTS_FILE
    ? path.resolve(process.env.SWING_RADAR_USER_LOGIN_ATTEMPTS_FILE)
    : path.join(getRuntimePaths().usersDir, "login-attempts.json");
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

function createEmptyLoginAttemptsDocument(): UserLoginAttemptsDocument {
  return {
    attempts: {}
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

function resolveStoredAccountStatus(account: StoredUserAccount, now = Date.now()) {
  if (account.status !== "suspended") {
    return "active" as const;
  }

  const suspendedUntil = account.suspendedUntil ? new Date(account.suspendedUntil).getTime() : null;
  if (suspendedUntil && Number.isFinite(suspendedUntil) && suspendedUntil > now) {
    return "suspended" as const;
  }

  return "active" as const;
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

function hashIdentifier(value: string) {
  return createHash("sha256").update(value).digest("hex");
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
    status: payload.status === "suspended" ? "suspended" : "active",
    suspendedUntil: normalizeOptionalString(payload.suspendedUntil) ?? undefined,
    adminNote: normalizeOptionalString(payload.adminNote) ?? undefined,
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
    expiresAt,
    userAgent: normalizeOptionalString(payload.userAgent) ?? undefined,
    ipHash: normalizeOptionalString(payload.ipHash) ?? undefined
  };
}

function normalizeLoginAttempt(value: unknown): StoredLoginAttempt | null {
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

function trimExpiredLoginAttempts(document: UserLoginAttemptsDocument, now = Date.now()) {
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

function normalizeLoginAttemptsDocument(value: unknown): UserLoginAttemptsDocument {
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

async function loadLoginAttemptsDocument() {
  try {
    const content = await readFile(getUserLoginAttemptsPath(), "utf8");
    return normalizeLoginAttemptsDocument(JSON.parse(content.replace(/^\uFEFF/, "")));
  } catch {
    const runtimeDocument = await loadRuntimeDocument<UserLoginAttemptsDocument>(USER_LOGIN_ATTEMPTS_DOCUMENT_NAME);
    return normalizeLoginAttemptsDocument(runtimeDocument);
  }
}

async function saveLoginAttemptsDocument(document: UserLoginAttemptsDocument) {
  const normalized = normalizeLoginAttemptsDocument(document);
  await mkdir(path.dirname(getUserLoginAttemptsPath()), { recursive: true });
  await writeFile(getUserLoginAttemptsPath(), `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  await saveRuntimeDocument(USER_LOGIN_ATTEMPTS_DOCUMENT_NAME, normalized);
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

function resolveClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const [candidate] = forwardedFor.split(",");
    const normalized = normalizeOptionalString(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return (
    normalizeOptionalString(request.headers.get("cf-connecting-ip")) ??
    normalizeOptionalString(request.headers.get("x-real-ip")) ??
    null
  );
}

function resolveSessionUserAgent(request?: Request) {
  return request ? normalizeOptionalString(request.headers.get("user-agent"))?.slice(0, 180) ?? undefined : undefined;
}

function resolveSessionIpHash(request?: Request) {
  const clientIp = request ? resolveClientIp(request) : null;
  return clientIp ? hashIdentifier(clientIp) : undefined;
}

function buildLoginAttemptKey(request: Request, email: string) {
  const fingerprint = [normalizeEmail(email), resolveClientIp(request) ?? "unknown", request.headers.get("user-agent") ?? "unknown"].join("|");
  return hashIdentifier(fingerprint);
}

function formatRetryMinutes(blockedUntil: string) {
  const remainingMs = new Date(blockedUntil).getTime() - Date.now();
  return Math.max(1, Math.ceil(remainingMs / 60_000));
}

function describeSessionClient(userAgent?: string) {
  const normalized = userAgent?.toLowerCase() ?? "";

  const device = normalized.includes("iphone")
    ? "iPhone"
    : normalized.includes("ipad")
      ? "iPad"
      : normalized.includes("android")
        ? "Android"
        : normalized.includes("windows")
          ? "Windows"
          : normalized.includes("macintosh") || normalized.includes("mac os x")
            ? "Mac"
            : normalized.includes("linux")
              ? "Linux"
              : "알 수 없는 기기";

  const browser = normalized.includes("whale")
    ? "Whale"
    : normalized.includes("edg/")
      ? "Edge"
      : normalized.includes("chrome/")
        ? "Chrome"
        : normalized.includes("safari/")
          ? "Safari"
          : normalized.includes("firefox/")
            ? "Firefox"
            : "브라우저";

  return `${device} · ${browser}`;
}

function buildPublicSession(session: StoredUserSession, account: StoredUserAccount): AuthSession {
  return {
    sessionId: session.id,
    user: toPublicUser(account),
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    expiresAt: session.expiresAt
  };
}

export function getUserSessionTokenFromRequest(request: Request) {
  return extractCookieValue(request.headers.get("cookie"), USER_SESSION_COOKIE_NAME);
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
    status: "active",
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
    throw new ApiError(401, "AUTH_INVALID_CREDENTIALS", "이메일 또는 비밀번호가 올바르지 않습니다.");
  }

  if (resolveStoredAccountStatus(account) === "suspended") {
    throw new ApiError(
      403,
      "AUTH_ACCOUNT_SUSPENDED",
      account.suspendedUntil
        ? `계정이 ${account.suspendedUntil.slice(0, 10)}까지 정지되어 있습니다.`
        : "계정이 정지되어 있습니다."
    );
  }

  return toPublicUser(account);
}

export async function assertLoginAttemptAllowed(request: Request, email: string) {
  const document = await loadLoginAttemptsDocument();
  const attempt = document.attempts[buildLoginAttemptKey(request, email)];

  if (!attempt?.blockedUntil) {
    return;
  }

  if (new Date(attempt.blockedUntil).getTime() <= Date.now()) {
    delete document.attempts[buildLoginAttemptKey(request, email)];
    await saveLoginAttemptsDocument(document);
    return;
  }

  const retryMinutes = formatRetryMinutes(attempt.blockedUntil);
  throw new ApiError(
    429,
    "AUTH_TOO_MANY_ATTEMPTS",
    `로그인 시도가 너무 많습니다. ${retryMinutes}분 뒤에 다시 시도해 주세요.`,
    {
      retryAfterMinutes: retryMinutes
    }
  );
}

export async function recordLoginAttemptFailure(request: Request, email: string) {
  const key = buildLoginAttemptKey(request, email);
  const document = await loadLoginAttemptsDocument();
  const current = document.attempts[key];
  const now = new Date().toISOString();
  const recentFailures = (current?.failures ?? []).filter((failureAt) => {
    const failureTime = new Date(failureAt).getTime();
    return Number.isFinite(failureTime) && Date.now() - failureTime <= LOGIN_ATTEMPT_WINDOW_MS;
  });
  const nextFailures = [...recentFailures, now];

  document.attempts[key] = {
    failures: nextFailures,
    blockedUntil:
      nextFailures.length >= LOGIN_ATTEMPT_MAX_FAILURES
        ? new Date(Date.now() + LOGIN_ATTEMPT_BLOCK_MS).toISOString()
        : undefined,
    updatedAt: now
  };

  await saveLoginAttemptsDocument(document);
}

export async function clearLoginAttemptFailures(request: Request, email: string) {
  const key = buildLoginAttemptKey(request, email);
  const document = await loadLoginAttemptsDocument();
  if (!document.attempts[key]) {
    return;
  }

  delete document.attempts[key];
  await saveLoginAttemptsDocument(document);
}

export async function createUserSession(user: AuthUser, request?: Request) {
  const rawToken = randomBytes(24).toString("hex");
  const now = new Date().toISOString();
  const session: StoredUserSession = {
    id: randomBytes(12).toString("hex"),
    userId: user.id,
    tokenHash: hashSessionToken(rawToken),
    createdAt: now,
    updatedAt: now,
    expiresAt: createSessionExpiration(),
    userAgent: resolveSessionUserAgent(request),
    ipHash: resolveSessionIpHash(request)
  };

  const document = await loadSessionsDocument();
  document.sessions[session.id] = session;
  await saveSessionsDocument(document);

  return {
    rawToken,
    session: {
      sessionId: session.id,
      user,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
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

  if (resolveStoredAccountStatus(account) === "suspended") {
    return null;
  }

  return buildPublicSession(session, account);
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

export async function listUserSessions(userId: string, rawToken: string | null) {
  const tokenHash = rawToken ? hashSessionToken(rawToken) : null;
  const document = await loadSessionsDocument();

  return Object.values(document.sessions)
    .filter((session) => session.userId === userId)
    .sort((left, right) => {
      const leftCurrent = left.tokenHash === tokenHash ? 1 : 0;
      const rightCurrent = right.tokenHash === tokenHash ? 1 : 0;
      if (leftCurrent !== rightCurrent) {
        return rightCurrent - leftCurrent;
      }

      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    })
    .map((session) => ({
      sessionId: session.id,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      expiresAt: session.expiresAt,
      clientLabel: describeSessionClient(session.userAgent),
      isCurrent: session.tokenHash === tokenHash
    }) satisfies AccountSessionItem);
}

export async function revokeUserSessionById(userId: string, sessionId: string) {
  const document = await loadSessionsDocument();
  const session = document.sessions[sessionId];
  if (!session || session.userId !== userId) {
    return false;
  }

  delete document.sessions[sessionId];
  await saveSessionsDocument(document);
  return true;
}

export async function revokeOtherUserSessions(userId: string, rawToken: string | null) {
  const tokenHash = rawToken ? hashSessionToken(rawToken) : null;
  const document = await loadSessionsDocument();
  const removableSessionIds = Object.entries(document.sessions)
    .filter(([, session]) => session.userId === userId && session.tokenHash !== tokenHash)
    .map(([sessionId]) => sessionId);

  if (!removableSessionIds.length) {
    return 0;
  }

  for (const sessionId of removableSessionIds) {
    delete document.sessions[sessionId];
  }

  await saveSessionsDocument(document);
  return removableSessionIds.length;
}
