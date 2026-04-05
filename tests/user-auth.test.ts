import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  authenticateUserAccount,
  createUserAccount,
  createUserSession,
  getUserSessionCookieName,
  getUserSessionFromRequest,
  revokeUserSession
} from "@/lib/server/user-auth";

describe("user auth storage", () => {
  let tempDir = "";
  const env = process.env as Record<string, string | undefined>;
  const previousAccountsFile = process.env.SWING_RADAR_USER_ACCOUNTS_FILE;
  const previousSessionsFile = process.env.SWING_RADAR_USER_SESSIONS_FILE;
  const previousAttemptsFile = process.env.SWING_RADAR_USER_LOGIN_ATTEMPTS_FILE;
  const previousActionsFile = process.env.SWING_RADAR_USER_AUTH_ACTIONS_FILE;
  const previousDatabaseUrl = process.env.SWING_RADAR_DATABASE_URL;
  const previousNodeEnv = process.env.NODE_ENV;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "swing-radar-user-auth-"));
    process.env.SWING_RADAR_USER_ACCOUNTS_FILE = path.join(tempDir, "accounts.json");
    process.env.SWING_RADAR_USER_SESSIONS_FILE = path.join(tempDir, "sessions.json");
    process.env.SWING_RADAR_USER_LOGIN_ATTEMPTS_FILE = path.join(tempDir, "login-attempts.json");
    process.env.SWING_RADAR_USER_AUTH_ACTIONS_FILE = path.join(tempDir, "auth-actions.json");
    delete process.env.SWING_RADAR_DATABASE_URL;
  });

  afterEach(async () => {
    if (previousAccountsFile === undefined) {
      delete process.env.SWING_RADAR_USER_ACCOUNTS_FILE;
    } else {
      process.env.SWING_RADAR_USER_ACCOUNTS_FILE = previousAccountsFile;
    }

    if (previousSessionsFile === undefined) {
      delete process.env.SWING_RADAR_USER_SESSIONS_FILE;
    } else {
      process.env.SWING_RADAR_USER_SESSIONS_FILE = previousSessionsFile;
    }

    if (previousAttemptsFile === undefined) {
      delete process.env.SWING_RADAR_USER_LOGIN_ATTEMPTS_FILE;
    } else {
      process.env.SWING_RADAR_USER_LOGIN_ATTEMPTS_FILE = previousAttemptsFile;
    }

    if (previousActionsFile === undefined) {
      delete process.env.SWING_RADAR_USER_AUTH_ACTIONS_FILE;
    } else {
      process.env.SWING_RADAR_USER_AUTH_ACTIONS_FILE = previousActionsFile;
    }

    if (previousDatabaseUrl === undefined) {
      delete process.env.SWING_RADAR_DATABASE_URL;
    } else {
      process.env.SWING_RADAR_DATABASE_URL = previousDatabaseUrl;
    }

    if (previousNodeEnv === undefined) {
      delete env.NODE_ENV;
    } else {
      env.NODE_ENV = previousNodeEnv;
    }

    await rm(tempDir, { recursive: true, force: true });
  });

  it("creates accounts, authenticates them, and resolves sessions from cookies", async () => {
    const user = await createUserAccount({
      email: "tester@example.com",
      displayName: "Tester",
      password: "strong-pass-123"
    });
    const authenticated = await authenticateUserAccount({
      email: "tester@example.com",
      password: "strong-pass-123"
    });
    const createdSession = await createUserSession(user);
    const request = new Request("http://localhost/recommendations", {
      headers: {
        cookie: `${getUserSessionCookieName()}=${createdSession.rawToken}`
      }
    });

    const resolvedSession = await getUserSessionFromRequest(request);

    expect(authenticated.email).toBe("tester@example.com");
    expect(createdSession.session.user.id).toBe(user.id);
    expect(resolvedSession?.user.email).toBe("tester@example.com");

    await revokeUserSession(createdSession.rawToken);
    expect(await getUserSessionFromRequest(request)).toBeNull();
  });

  it("persists auth data to files even when running in production mode without runtime documents", async () => {
    env.NODE_ENV = "production";

    const user = await createUserAccount({
      email: "ops@example.com",
      displayName: "Ops User",
      password: "strong-pass-456"
    });
    const createdSession = await createUserSession(user);

    const [accountsFile, sessionsFile] = await Promise.all([
      readFile(process.env.SWING_RADAR_USER_ACCOUNTS_FILE!, "utf8"),
      readFile(process.env.SWING_RADAR_USER_SESSIONS_FILE!, "utf8")
    ]);

    expect(accountsFile).toContain("ops@example.com");
    expect(sessionsFile).toContain(createdSession.session.sessionId);
  });
});
