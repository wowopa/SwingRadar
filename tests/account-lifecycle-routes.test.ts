import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { DELETE as deleteAccountRoute } from "@/app/api/account/account/route";
import { POST as postAccountEmailVerificationRoute } from "@/app/api/account/email-verification/route";
import { GET as getAccountExportRoute } from "@/app/api/account/export/route";
import { POST as postAccountPasswordRoute } from "@/app/api/account/password/route";
import { POST as postEmailVerificationConfirmRoute } from "@/app/api/auth/email-verification/confirm/route";
import { POST as postLoginRoute } from "@/app/api/auth/login/route";
import { POST as postPasswordResetConfirmRoute } from "@/app/api/auth/password-reset/confirm/route";
import { POST as postPasswordResetRequestRoute } from "@/app/api/auth/password-reset/request/route";
import { GET as getSessionRoute } from "@/app/api/auth/session/route";
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

function extractTokenFromPreviewUrl(previewUrl: string) {
  return new URL(previewUrl).searchParams.get("token");
}

describe("account lifecycle routes", () => {
  let tempDir = "";
  const previousAccountsFile = process.env.SWING_RADAR_USER_ACCOUNTS_FILE;
  const previousSessionsFile = process.env.SWING_RADAR_USER_SESSIONS_FILE;
  const previousLoginAttemptsFile = process.env.SWING_RADAR_USER_LOGIN_ATTEMPTS_FILE;
  const previousProfilesFile = process.env.SWING_RADAR_USER_PORTFOLIO_PROFILES_FILE;
  const previousJournalsFile = process.env.SWING_RADAR_USER_PORTFOLIO_JOURNALS_FILE;
  const previousReviewsFile = process.env.SWING_RADAR_USER_PORTFOLIO_CLOSE_REVIEWS_FILE;
  const previousRulesFile = process.env.SWING_RADAR_USER_PORTFOLIO_PERSONAL_RULES_FILE;
  const previousOpeningCheckFile = process.env.SWING_RADAR_USER_OPENING_RECHECK_FILE;
  const previousDatabaseUrl = process.env.SWING_RADAR_DATABASE_URL;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "swing-radar-account-lifecycle-"));
    process.env.SWING_RADAR_USER_ACCOUNTS_FILE = path.join(tempDir, "accounts.json");
    process.env.SWING_RADAR_USER_SESSIONS_FILE = path.join(tempDir, "sessions.json");
    process.env.SWING_RADAR_USER_LOGIN_ATTEMPTS_FILE = path.join(tempDir, "login-attempts.json");
    process.env.SWING_RADAR_USER_PORTFOLIO_PROFILES_FILE = path.join(tempDir, "portfolio-profiles.json");
    process.env.SWING_RADAR_USER_PORTFOLIO_JOURNALS_FILE = path.join(tempDir, "portfolio-journals.json");
    process.env.SWING_RADAR_USER_PORTFOLIO_CLOSE_REVIEWS_FILE = path.join(tempDir, "portfolio-close-reviews.json");
    process.env.SWING_RADAR_USER_PORTFOLIO_PERSONAL_RULES_FILE = path.join(tempDir, "portfolio-personal-rules.json");
    process.env.SWING_RADAR_USER_OPENING_RECHECK_FILE = path.join(tempDir, "opening-recheck.json");
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

    if (previousJournalsFile === undefined) {
      delete process.env.SWING_RADAR_USER_PORTFOLIO_JOURNALS_FILE;
    } else {
      process.env.SWING_RADAR_USER_PORTFOLIO_JOURNALS_FILE = previousJournalsFile;
    }

    if (previousReviewsFile === undefined) {
      delete process.env.SWING_RADAR_USER_PORTFOLIO_CLOSE_REVIEWS_FILE;
    } else {
      process.env.SWING_RADAR_USER_PORTFOLIO_CLOSE_REVIEWS_FILE = previousReviewsFile;
    }

    if (previousRulesFile === undefined) {
      delete process.env.SWING_RADAR_USER_PORTFOLIO_PERSONAL_RULES_FILE;
    } else {
      process.env.SWING_RADAR_USER_PORTFOLIO_PERSONAL_RULES_FILE = previousRulesFile;
    }

    if (previousOpeningCheckFile === undefined) {
      delete process.env.SWING_RADAR_USER_OPENING_RECHECK_FILE;
    } else {
      process.env.SWING_RADAR_USER_OPENING_RECHECK_FILE = previousOpeningCheckFile;
    }

    if (previousDatabaseUrl === undefined) {
      delete process.env.SWING_RADAR_DATABASE_URL;
    } else {
      process.env.SWING_RADAR_DATABASE_URL = previousDatabaseUrl;
    }

    await rm(tempDir, { recursive: true, force: true });
  });

  it("supports email verification, password flows, export, and self-delete", async () => {
    const signupResponse = await postSignupRoute(
      createRequest("http://localhost/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          email: "tester@example.com",
          displayName: "Tester",
          password: "strong-pass-123"
        })
      })
    );
    const cookie = extractCookie(signupResponse);

    const verificationRequestResponse = await postAccountEmailVerificationRoute(
      createRequest("http://localhost/api/account/email-verification", {
        method: "POST",
        headers: {
          cookie
        },
        body: JSON.stringify({})
      })
    );
    const verificationRequestPayload = await parseJson<{ previewUrl?: string | null }>(verificationRequestResponse);
    const verificationToken = verificationRequestPayload.previewUrl
      ? extractTokenFromPreviewUrl(verificationRequestPayload.previewUrl)
      : null;

    expect(verificationRequestResponse.status).toBe(200);
    expect(verificationToken).toBeTruthy();

    const verificationConfirmResponse = await postEmailVerificationConfirmRoute(
      createRequest("http://localhost/api/auth/email-verification/confirm", {
        method: "POST",
        body: JSON.stringify({
          token: verificationToken
        })
      })
    );
    const verificationConfirmPayload = await parseJson<{ user: { emailVerifiedAt?: string | null } }>(
      verificationConfirmResponse
    );

    expect(verificationConfirmResponse.status).toBe(200);
    expect(verificationConfirmPayload.user.emailVerifiedAt).toBeTruthy();

    const sessionResponse = await getSessionRoute(
      createRequest("http://localhost/api/auth/session", {
        headers: {
          cookie
        }
      })
    );
    const sessionPayload = await parseJson<{ session: { user: { emailVerifiedAt?: string | null } } | null }>(
      sessionResponse
    );

    expect(sessionPayload.session?.user.emailVerifiedAt).toBeTruthy();

    const changePasswordResponse = await postAccountPasswordRoute(
      createRequest("http://localhost/api/account/password", {
        method: "POST",
        headers: {
          cookie
        },
        body: JSON.stringify({
          currentPassword: "strong-pass-123",
          nextPassword: "new-strong-pass-456"
        })
      })
    );

    expect(changePasswordResponse.status).toBe(200);

    const failedOldLogin = await postLoginRoute(
      createRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "tester@example.com",
          password: "strong-pass-123"
        })
      })
    );
    expect(failedOldLogin.status).toBe(401);

    const newLogin = await postLoginRoute(
      createRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "tester@example.com",
          password: "new-strong-pass-456"
        })
      })
    );
    const refreshedCookie = extractCookie(newLogin);

    expect(newLogin.status).toBe(200);

    const resetRequestResponse = await postPasswordResetRequestRoute(
      createRequest("http://localhost/api/auth/password-reset/request", {
        method: "POST",
        body: JSON.stringify({
          email: "tester@example.com"
        })
      })
    );
    const resetRequestPayload = await parseJson<{ previewUrl?: string | null }>(resetRequestResponse);
    const resetToken = resetRequestPayload.previewUrl ? extractTokenFromPreviewUrl(resetRequestPayload.previewUrl) : null;

    expect(resetRequestResponse.status).toBe(200);
    expect(resetToken).toBeTruthy();

    const resetConfirmResponse = await postPasswordResetConfirmRoute(
      createRequest("http://localhost/api/auth/password-reset/confirm", {
        method: "POST",
        body: JSON.stringify({
          token: resetToken,
          password: "reset-pass-789"
        })
      })
    );

    expect(resetConfirmResponse.status).toBe(200);

    const failedChangedLogin = await postLoginRoute(
      createRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "tester@example.com",
          password: "new-strong-pass-456"
        })
      })
    );
    expect(failedChangedLogin.status).toBe(401);

    const resetLogin = await postLoginRoute(
      createRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "tester@example.com",
          password: "reset-pass-789"
        })
      })
    );
    const resetCookie = extractCookie(resetLogin);

    expect(resetLogin.status).toBe(200);

    const exportResponse = await getAccountExportRoute(
      createRequest("http://localhost/api/account/export", {
        headers: {
          cookie: resetCookie || refreshedCookie
        }
      })
    );
    const exportPayload = await parseJson<{
      user: { email: string };
      portfolio: { profile: { name: string } };
    }>(exportResponse);

    expect(exportResponse.status).toBe(200);
    expect(exportResponse.headers.get("content-disposition")).toContain("attachment;");
    expect(exportPayload.user.email).toBe("tester@example.com");
    expect(exportPayload.portfolio.profile.name).toBeTruthy();

    const deleteResponse = await deleteAccountRoute(
      createRequest("http://localhost/api/account/account", {
        method: "DELETE",
        headers: {
          cookie: resetCookie || refreshedCookie
        },
        body: JSON.stringify({
          password: "reset-pass-789",
          confirmation: "DELETE"
        })
      })
    );

    expect(deleteResponse.status).toBe(200);

    const deletedLogin = await postLoginRoute(
      createRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "tester@example.com",
          password: "reset-pass-789"
        })
      })
    );

    expect(deletedLogin.status).toBe(401);
  });
});
