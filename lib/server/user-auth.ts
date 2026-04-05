import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ApiError } from "@/lib/server/api-error";
import { buildAppUrl } from "@/lib/server/app-origin";
import {
  EMAIL_VERIFICATION_TTL_MS,
  LOGIN_ATTEMPT_BLOCK_MS,
  LOGIN_ATTEMPT_MAX_FAILURES,
  LOGIN_ATTEMPT_WINDOW_MS,
  PASSWORD_RESET_TTL_MS,
  USER_SESSION_COOKIE_NAME,
  USER_SESSION_TTL_DAYS,
  hashIdentifier,
  loadAccountsDocument,
  loadAuthActionsDocument,
  loadLoginAttemptsDocument,
  loadSessionsDocument,
  normalizeEmail,
  normalizeOptionalString,
  resolveStoredAccountStatus,
  saveAccountsDocument,
  saveAuthActionsDocument,
  saveLoginAttemptsDocument,
  saveSessionsDocument,
  toPublicUser,
  type AuthActionKind,
  type StoredAuthActionToken,
  type StoredUserAccount,
  type StoredUserSession
} from "@/lib/server/user-auth-store";
import type { AccountSessionItem, AuthSession, AuthUser } from "@/types/auth";

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
  return hashIdentifier(token);
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
  const fingerprint = [
    normalizeEmail(email),
    resolveClientIp(request) ?? "unknown",
    request.headers.get("user-agent") ?? "unknown"
  ].join("|");
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

function assertPasswordStrength(password: string) {
  if (password.length < 8) {
    throw new ApiError(400, "AUTH_PASSWORD_TOO_SHORT", "비밀번호는 8자 이상이어야 합니다.");
  }

  if (password.length > 100) {
    throw new ApiError(400, "AUTH_PASSWORD_TOO_LONG", "비밀번호는 100자 이하로 입력해 주세요.");
  }
}

async function getStoredAccountById(userId: string) {
  const document = await loadAccountsDocument();
  return document.accounts[userId] ?? null;
}

async function requireStoredAccountById(userId: string) {
  const account = await getStoredAccountById(userId);
  if (!account) {
    throw new ApiError(404, "AUTH_ACCOUNT_NOT_FOUND", "계정을 찾을 수 없습니다.");
  }

  return account;
}

async function updateStoredAccount(userId: string, mutator: (account: StoredUserAccount) => StoredUserAccount) {
  const document = await loadAccountsDocument();
  const account = document.accounts[userId];
  if (!account) {
    throw new ApiError(404, "AUTH_ACCOUNT_NOT_FOUND", "계정을 찾을 수 없습니다.");
  }

  document.accounts[userId] = mutator(account);
  document.emailIndex = Object.fromEntries(
    Object.values(document.accounts).map((storedAccount) => [normalizeEmail(storedAccount.email), storedAccount.id])
  );
  await saveAccountsDocument(document);
  return document.accounts[userId];
}

function exposeAuthPreviewLinks() {
  return process.env.NODE_ENV !== "production" || process.env.SWING_RADAR_AUTH_PREVIEW_LINKS === "1";
}

async function createAuthActionLink(input: {
  kind: AuthActionKind;
  userId: string;
  email: string;
  ttlMs: number;
  request?: Request;
}) {
  const document = await loadAuthActionsDocument();

  for (const [actionId, action] of Object.entries(document.actions)) {
    if (action.userId === input.userId && action.kind === input.kind) {
      delete document.actions[actionId];
    }
  }

  const rawToken = randomBytes(24).toString("hex");
  const pathname = input.kind === "email_verification" ? "/verify-email" : "/reset-password";
  const action: StoredAuthActionToken = {
    id: randomBytes(12).toString("hex"),
    kind: input.kind,
    userId: input.userId,
    email: normalizeEmail(input.email),
    tokenHash: hashSessionToken(rawToken),
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + input.ttlMs).toISOString(),
    requestedUserAgent: resolveSessionUserAgent(input.request),
    requestedIpHash: resolveSessionIpHash(input.request)
  };

  document.actions[action.id] = action;
  await saveAuthActionsDocument(document);

  return {
    action,
    previewUrl: exposeAuthPreviewLinks()
      ? buildAppUrl(`${pathname}?token=${encodeURIComponent(rawToken)}`, input.request)
      : null
  };
}

async function requireAuthAction(input: { kind: AuthActionKind; token: string }) {
  const tokenHash = hashSessionToken(input.token);
  const document = await loadAuthActionsDocument();
  const action = Object.values(document.actions).find(
    (candidate) => candidate.kind === input.kind && candidate.tokenHash === tokenHash
  );

  if (!action) {
    throw new ApiError(400, "AUTH_TOKEN_INVALID", "링크가 유효하지 않거나 만료되었습니다.");
  }

  return action;
}

async function deleteAuthActionById(actionId: string) {
  const document = await loadAuthActionsDocument();
  if (!document.actions[actionId]) {
    return false;
  }

  delete document.actions[actionId];
  await saveAuthActionsDocument(document);
  return true;
}

async function revokeAllUserSessionsForUser(userId: string) {
  const document = await loadSessionsDocument();
  const sessionIds = Object.entries(document.sessions)
    .filter(([, session]) => session.userId === userId)
    .map(([sessionId]) => sessionId);

  for (const sessionId of sessionIds) {
    delete document.sessions[sessionId];
  }

  await saveSessionsDocument(document);
  return sessionIds.length;
}

export async function getUserAccountById(userId: string) {
  const account = await getStoredAccountById(userId);
  return account ? toPublicUser(account) : null;
}

export async function verifyUserPasswordById(userId: string, password: string) {
  const account = await requireStoredAccountById(userId);
  if (!verifyPassword(password, account)) {
    throw new ApiError(401, "AUTH_INVALID_CREDENTIALS", "현재 비밀번호가 올바르지 않습니다.");
  }

  return account;
}

export async function deleteUserAuthFootprint(userId: string) {
  const [accountsDocument, sessionsDocument, actionsDocument] = await Promise.all([
    loadAccountsDocument(),
    loadSessionsDocument(),
    loadAuthActionsDocument()
  ]);
  const account = accountsDocument.accounts[userId];
  if (!account) {
    return false;
  }

  delete accountsDocument.accounts[userId];
  delete accountsDocument.emailIndex[normalizeEmail(account.email)];

  for (const [sessionId, session] of Object.entries(sessionsDocument.sessions)) {
    if (session.userId === userId) {
      delete sessionsDocument.sessions[sessionId];
    }
  }

  for (const [actionId, action] of Object.entries(actionsDocument.actions)) {
    if (action.userId === userId) {
      delete actionsDocument.actions[actionId];
    }
  }

  await Promise.all([
    saveAccountsDocument(accountsDocument),
    saveSessionsDocument(sessionsDocument),
    saveAuthActionsDocument(actionsDocument)
  ]);

  return true;
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

  if (!email) {
    throw new ApiError(400, "AUTH_EMAIL_REQUIRED", "이메일을 입력해 주세요.");
  }

  if (!displayName) {
    throw new ApiError(400, "AUTH_DISPLAY_NAME_REQUIRED", "이름을 입력해 주세요.");
  }

  assertPasswordStrength(input.password);

  const document = await loadAccountsDocument();
  if (document.emailIndex[email]) {
    throw new ApiError(409, "AUTH_EMAIL_CONFLICT", "이미 사용 중인 이메일입니다.");
  }

  const now = new Date().toISOString();
  const account: StoredUserAccount = {
    id: randomBytes(12).toString("hex"),
    email,
    displayName,
    ...createPasswordHash(input.password),
    emailVerifiedAt: null,
    passwordUpdatedAt: now,
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
  const key = buildLoginAttemptKey(request, email);
  const attempt = document.attempts[key];

  if (!attempt?.blockedUntil) {
    return;
  }

  if (new Date(attempt.blockedUntil).getTime() <= Date.now()) {
    delete document.attempts[key];
    await saveLoginAttemptsDocument(document);
    return;
  }

  const retryMinutes = formatRetryMinutes(attempt.blockedUntil);
  throw new ApiError(
    429,
    "AUTH_TOO_MANY_ATTEMPTS",
    `로그인 시도가 너무 많습니다. ${retryMinutes}분 후에 다시 시도해 주세요.`,
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

  for (const sessionId of removableSessionIds) {
    delete document.sessions[sessionId];
  }

  if (removableSessionIds.length) {
    await saveSessionsDocument(document);
  }

  return removableSessionIds.length;
}

export async function createEmailVerificationRequest(userId: string, request?: Request) {
  const account = await requireStoredAccountById(userId);

  if (account.emailVerifiedAt) {
    return {
      alreadyVerified: true,
      expiresAt: null,
      previewUrl: null
    };
  }

  const { action, previewUrl } = await createAuthActionLink({
    kind: "email_verification",
    userId: account.id,
    email: account.email,
    ttlMs: EMAIL_VERIFICATION_TTL_MS,
    request
  });

  return {
    alreadyVerified: false,
    expiresAt: action.expiresAt,
    previewUrl
  };
}

export async function confirmEmailVerification(token: string) {
  const action = await requireAuthAction({ kind: "email_verification", token });
  const now = new Date().toISOString();
  const account = await updateStoredAccount(action.userId, (current) => ({
    ...current,
    emailVerifiedAt: now,
    updatedAt: now
  }));

  await deleteAuthActionById(action.id);
  return toPublicUser(account);
}

export async function requestPasswordReset(email: string, request?: Request) {
  const normalizedEmail = normalizeEmail(email);
  const accountsDocument = await loadAccountsDocument();
  const userId = accountsDocument.emailIndex[normalizedEmail];
  const account = userId ? accountsDocument.accounts[userId] : null;

  if (!account || resolveStoredAccountStatus(account) === "suspended") {
    return {
      accepted: true,
      expiresAt: null,
      previewUrl: null
    };
  }

  const { action, previewUrl } = await createAuthActionLink({
    kind: "password_reset",
    userId: account.id,
    email: account.email,
    ttlMs: PASSWORD_RESET_TTL_MS,
    request
  });

  return {
    accepted: true,
    expiresAt: action.expiresAt,
    previewUrl
  };
}

export async function confirmPasswordReset(input: { token: string; password: string }) {
  assertPasswordStrength(input.password);
  const action = await requireAuthAction({ kind: "password_reset", token: input.token });
  const now = new Date().toISOString();
  const account = await updateStoredAccount(action.userId, (current) => ({
    ...current,
    ...createPasswordHash(input.password),
    passwordUpdatedAt: now,
    updatedAt: now
  }));

  await Promise.all([revokeAllUserSessionsForUser(account.id), deleteAuthActionById(action.id)]);
  return toPublicUser(account);
}

export async function changeUserPassword(input: {
  userId: string;
  currentPassword: string;
  nextPassword: string;
  rawToken?: string | null;
}) {
  const account = await verifyUserPasswordById(input.userId, input.currentPassword);
  assertPasswordStrength(input.nextPassword);

  if (verifyPassword(input.nextPassword, account)) {
    throw new ApiError(400, "AUTH_PASSWORD_REUSED", "새 비밀번호를 현재 비밀번호와 다르게 입력해 주세요.");
  }

  const now = new Date().toISOString();
  const updatedAccount = await updateStoredAccount(account.id, (current) => ({
    ...current,
    ...createPasswordHash(input.nextPassword),
    passwordUpdatedAt: now,
    updatedAt: now
  }));
  const revokedOtherSessions = await revokeOtherUserSessions(account.id, input.rawToken ?? null);

  return {
    user: toPublicUser(updatedAccount),
    revokedOtherSessions
  };
}
