import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GET as getAccountProfileRoute, POST as postAccountProfileRoute } from "@/app/api/account/portfolio-profile/route";
import { POST as postLoginRoute } from "@/app/api/auth/login/route";
import { POST as postLogoutRoute } from "@/app/api/auth/logout/route";
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

describe("auth routes", () => {
  let tempDir = "";
  const previousAccountsFile = process.env.SWING_RADAR_USER_ACCOUNTS_FILE;
  const previousSessionsFile = process.env.SWING_RADAR_USER_SESSIONS_FILE;
  const previousUserProfilesFile = process.env.SWING_RADAR_USER_PORTFOLIO_PROFILES_FILE;
  const previousDatabaseUrl = process.env.SWING_RADAR_DATABASE_URL;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "swing-radar-auth-routes-"));
    process.env.SWING_RADAR_USER_ACCOUNTS_FILE = path.join(tempDir, "accounts.json");
    process.env.SWING_RADAR_USER_SESSIONS_FILE = path.join(tempDir, "sessions.json");
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

    if (previousUserProfilesFile === undefined) {
      delete process.env.SWING_RADAR_USER_PORTFOLIO_PROFILES_FILE;
    } else {
      process.env.SWING_RADAR_USER_PORTFOLIO_PROFILES_FILE = previousUserProfilesFile;
    }

    if (previousDatabaseUrl === undefined) {
      delete process.env.SWING_RADAR_DATABASE_URL;
    } else {
      process.env.SWING_RADAR_DATABASE_URL = previousDatabaseUrl;
    }

    await rm(tempDir, { recursive: true, force: true });
  });

  it("signs users up and creates a session cookie", async () => {
    const response = await postSignupRoute(
      createRequest("http://localhost/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          email: "tester@example.com",
          displayName: "Tester",
          password: "strong-pass-123"
        })
      })
    );
    const payload = await parseJson<{
      ok: boolean;
      session: { user: { email: string; displayName: string } };
    }>(response);

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      session: {
        user: {
          email: "tester@example.com",
          displayName: "Tester"
        }
      }
    });
    expect(response.headers.get("set-cookie")).toContain("swing_radar_session=");
  });

  it("logs in, saves a user portfolio profile, and clears the session on logout", async () => {
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

    const loginResponse = await postLoginRoute(
      createRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "tester@example.com",
          password: "strong-pass-123"
        })
      })
    );
    const cookie = extractCookie(loginResponse);

    const saveResponse = await postAccountProfileRoute(
      createRequest("http://localhost/api/account/portfolio-profile", {
        method: "POST",
        headers: {
          cookie
        },
        body: JSON.stringify({
          name: "내 포트폴리오",
          totalCapital: 30_000_000,
          availableCash: 8_000_000,
          maxRiskPerTradePercent: 1,
          maxConcurrentPositions: 4,
          sectorLimit: 2,
          positions: [
            {
              ticker: "005930",
              quantity: 7,
              averagePrice: 71_000,
              enteredAt: "2026-03-20",
              note: "core"
            }
          ]
        })
      })
    );
    const savedPayload = await parseJson<{
      ok: boolean;
      profile: { name: string; positions: Array<{ ticker: string; enteredAt?: string }> };
    }>(saveResponse);

    const loadResponse = await getAccountProfileRoute(
      createRequest("http://localhost/api/account/portfolio-profile", {
        headers: {
          cookie
        }
      })
    );
    const loadedPayload = await parseJson<{
      ok: boolean;
      profile: { name: string; positions: Array<{ ticker: string; enteredAt?: string }> };
    }>(loadResponse);

    const logoutResponse = await postLogoutRoute(
      createRequest("http://localhost/api/auth/logout", {
        method: "POST",
        headers: {
          cookie
        }
      })
    );

    expect(savedPayload.profile).toMatchObject({
      name: "내 포트폴리오",
      positions: [
        {
          ticker: "005930",
          enteredAt: "2026-03-20"
        }
      ]
    });
    expect(loadedPayload.profile).toEqual(savedPayload.profile);
    expect(logoutResponse.headers.get("set-cookie")).toContain("swing_radar_session=");
  });
});
