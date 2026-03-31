import { mkdtemp, rm } from "node:fs/promises";
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
  const previousAccountsFile = process.env.SWING_RADAR_USER_ACCOUNTS_FILE;
  const previousSessionsFile = process.env.SWING_RADAR_USER_SESSIONS_FILE;
  const previousDatabaseUrl = process.env.SWING_RADAR_DATABASE_URL;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "swing-radar-user-auth-"));
    process.env.SWING_RADAR_USER_ACCOUNTS_FILE = path.join(tempDir, "accounts.json");
    process.env.SWING_RADAR_USER_SESSIONS_FILE = path.join(tempDir, "sessions.json");
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

    if (previousDatabaseUrl === undefined) {
      delete process.env.SWING_RADAR_DATABASE_URL;
    } else {
      process.env.SWING_RADAR_DATABASE_URL = previousDatabaseUrl;
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
});
