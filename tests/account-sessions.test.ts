import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { DELETE as deleteAccountSessionsRoute, GET as getAccountSessionsRoute } from "@/app/api/account/sessions/route";
import { POST as postLoginRoute } from "@/app/api/auth/login/route";
import { POST as postSignupRoute } from "@/app/api/auth/signup/route";

function createRequest(url: string, init?: RequestInit) {
  return new Request(url, init);
}

async function parseJson<T>(response: Response): Promise<T> {
  return JSON.parse(await response.text()) as T;
}

function extractCookie(response: Response) {
  const header = response.headers.get("set-cookie");
  return header?.split(";")[0] ?? "";
}

describe("account sessions route", () => {
  let tempDir = "";
  const previousAccountsFile = process.env.SWING_RADAR_USER_ACCOUNTS_FILE;
  const previousSessionsFile = process.env.SWING_RADAR_USER_SESSIONS_FILE;
  const previousLoginAttemptsFile = process.env.SWING_RADAR_USER_LOGIN_ATTEMPTS_FILE;
  const previousProfilesFile = process.env.SWING_RADAR_USER_PORTFOLIO_PROFILES_FILE;
  const previousDatabaseUrl = process.env.SWING_RADAR_DATABASE_URL;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "swing-radar-account-sessions-"));
    process.env.SWING_RADAR_USER_ACCOUNTS_FILE = path.join(tempDir, "accounts.json");
    process.env.SWING_RADAR_USER_SESSIONS_FILE = path.join(tempDir, "sessions.json");
    process.env.SWING_RADAR_USER_LOGIN_ATTEMPTS_FILE = path.join(tempDir, "login-attempts.json");
    process.env.SWING_RADAR_USER_PORTFOLIO_PROFILES_FILE = path.join(tempDir, "portfolio-profiles.json");
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

    if (previousLoginAttemptsFile === undefined) {
      delete process.env.SWING_RADAR_USER_LOGIN_ATTEMPTS_FILE;
    } else {
      process.env.SWING_RADAR_USER_LOGIN_ATTEMPTS_FILE = previousLoginAttemptsFile;
    }

    if (previousProfilesFile === undefined) {
      delete process.env.SWING_RADAR_USER_PORTFOLIO_PROFILES_FILE;
    } else {
      process.env.SWING_RADAR_USER_PORTFOLIO_PROFILES_FILE = previousProfilesFile;
    }

    if (previousDatabaseUrl === undefined) {
      delete process.env.SWING_RADAR_DATABASE_URL;
    } else {
      process.env.SWING_RADAR_DATABASE_URL = previousDatabaseUrl;
    }

    await rm(tempDir, { recursive: true, force: true });
  });

  it("lists current sessions and revokes other sessions", async () => {
    await postSignupRoute(
      createRequest("http://localhost/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          email: "tester@example.com",
          displayName: "Tester",
          password: "strong-pass-123"
        })
      })
    );

    const firstLogin = await postLoginRoute(
      createRequest("http://localhost/api/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "user-agent": "chrome-windows"
        },
        body: JSON.stringify({
          email: "tester@example.com",
          password: "strong-pass-123"
        })
      })
    );
    const firstCookie = extractCookie(firstLogin);

    const secondLogin = await postLoginRoute(
      createRequest("http://localhost/api/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "user-agent": "mobile-safari"
        },
        body: JSON.stringify({
          email: "tester@example.com",
          password: "strong-pass-123"
        })
      })
    );
    const secondCookie = extractCookie(secondLogin);

    const listResponse = await getAccountSessionsRoute(
      createRequest("http://localhost/api/account/sessions", {
        headers: {
          cookie: secondCookie
        }
      })
    );
    const listPayload = await parseJson<{ sessions: Array<{ sessionId: string; isCurrent: boolean }> }>(listResponse);

    expect(listResponse.status).toBe(200);
    expect(listPayload.sessions).toHaveLength(3);
    expect(listPayload.sessions.filter((session) => session.isCurrent)).toHaveLength(1);

    const revokeResponse = await deleteAccountSessionsRoute(
      createRequest("http://localhost/api/account/sessions", {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
          cookie: secondCookie
        },
        body: JSON.stringify({
          scope: "others"
        })
      })
    );
    const revokePayload = await parseJson<{
      removedCount: number;
      sessions: Array<{ sessionId: string; isCurrent: boolean }>;
    }>(revokeResponse);

    expect(firstCookie).toContain("swing_radar_session=");
    expect(revokeResponse.status).toBe(200);
    expect(revokePayload.removedCount).toBe(2);
    expect(revokePayload.sessions).toHaveLength(1);
    expect(revokePayload.sessions[0]?.isCurrent).toBe(true);
  });
});
