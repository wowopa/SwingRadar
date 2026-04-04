import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  assertAdminRequest: vi.fn(),
  listAdminUsers: vi.fn(),
  revokeAdminUserSessions: vi.fn(),
  updateAdminUserAccount: vi.fn(),
  suspendAdminUserAccount: vi.fn(),
  clearAdminUserSuspension: vi.fn(),
  deleteAdminUserAccount: vi.fn(),
  recordAuditLog: vi.fn()
}));

vi.mock("@/lib/server/admin-auth", () => ({
  assertAdminRequest: mocks.assertAdminRequest
}));

vi.mock("@/lib/server/admin-user-management", () => ({
  listAdminUsers: mocks.listAdminUsers,
  revokeAdminUserSessions: mocks.revokeAdminUserSessions,
  updateAdminUserAccount: mocks.updateAdminUserAccount,
  suspendAdminUserAccount: mocks.suspendAdminUserAccount,
  clearAdminUserSuspension: mocks.clearAdminUserSuspension,
  deleteAdminUserAccount: mocks.deleteAdminUserAccount
}));

vi.mock("@/lib/server/audit-log", () => ({
  recordAuditLog: mocks.recordAuditLog
}));

import { GET, POST } from "@/app/api/admin/users/route";

function createRequest(url: string, init?: RequestInit) {
  return new Request(url, {
    headers: {
      authorization: "Bearer test-token",
      "x-request-id": "req-test",
      ...(init?.headers ?? {})
    },
    ...init
  });
}

async function parseJson<T>(response: Response) {
  return JSON.parse(await response.text()) as T;
}

describe("admin users route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assertAdminRequest.mockReturnValue(undefined);
    mocks.recordAuditLog.mockResolvedValue(undefined);
    mocks.listAdminUsers.mockResolvedValue({
      summary: {
        totalUsers: 1,
        recentSignups7d: 1,
        activeUsers: 1,
        configuredPortfolios: 1,
        activeSessions: 2,
        suspendedUsers: 0
      },
      items: [
        {
          id: "user-1",
          email: "user@example.com",
          displayName: "사용자",
          createdAt: "2026-04-01T00:00:00.000Z",
          updatedAt: "2026-04-02T00:00:00.000Z",
          activeSessionCount: 2,
          lastActivityAt: "2026-04-03T00:00:00.000Z",
          portfolioConfigured: true,
          portfolioPositionCount: 2,
          portfolioUpdatedAt: "2026-04-03T00:00:00.000Z",
          status: "active",
          suspendedUntil: null,
          adminNote: null,
          journalEventCount: 5,
          closeReviewCount: 1,
          personalRuleCount: 2,
          openingScanCount: 3,
          recentSessions: [
            {
              id: "session-1",
              updatedAt: "2026-04-03T00:00:00.000Z",
              expiresAt: "2026-04-10T00:00:00.000Z"
            }
          ]
        }
      ]
    });
  });

  it("returns users and supports filtering by query", async () => {
    const response = await GET(createRequest("http://localhost/api/admin/users?q=user"));
    const payload = await parseJson<{
      ok: boolean;
      requestId: string;
      query: string;
      summary: { totalUsers: number; suspendedUsers: number };
      items: Array<{ id: string; email: string }>;
    }>(response);

    expect(response.status).toBe(200);
    expect(mocks.listAdminUsers).toHaveBeenCalledTimes(1);
    expect(payload).toMatchObject({
      ok: true,
      requestId: "req-test",
      query: "user",
      summary: {
        totalUsers: 1,
        suspendedUsers: 0
      },
      items: [{ id: "user-1", email: "user@example.com" }]
    });
  });

  it("updates an account and records an audit log", async () => {
    mocks.updateAdminUserAccount.mockResolvedValue({
      id: "user-1",
      email: "updated@example.com",
      displayName: "수정된 사용자"
    });

    const response = await POST(
      createRequest("http://localhost/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          action: "update-account",
          userId: "user-1",
          email: "updated@example.com",
          displayName: "수정된 사용자",
          adminNote: "메모"
        })
      })
    );
    const payload = await parseJson<{ ok: boolean; requestId: string }>(response);

    expect(response.status).toBe(200);
    expect(mocks.updateAdminUserAccount).toHaveBeenCalledWith({
      userId: "user-1",
      email: "updated@example.com",
      displayName: "수정된 사용자",
      adminNote: "메모"
    });
    expect(mocks.recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "admin_user_updated",
        status: "success",
        requestId: "req-test"
      })
    );
    expect(payload).toMatchObject({
      ok: true,
      requestId: "req-test"
    });
  });

  it("suspends an account and records suspension metadata", async () => {
    mocks.suspendAdminUserAccount.mockResolvedValue({
      suspendedUntil: "2026-04-10T00:00:00.000Z",
      removedSessions: 2
    });

    const response = await POST(
      createRequest("http://localhost/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          action: "suspend-account",
          userId: "user-1",
          days: 7,
          adminNote: "테스트 정지"
        })
      })
    );
    const payload = await parseJson<{
      ok: boolean;
      result: { suspendedUntil: string; removedSessions: number };
    }>(response);

    expect(response.status).toBe(200);
    expect(mocks.suspendAdminUserAccount).toHaveBeenCalledWith({
      userId: "user-1",
      days: 7,
      adminNote: "테스트 정지"
    });
    expect(mocks.recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "admin_user_suspended",
        status: "warning",
        requestId: "req-test"
      })
    );
    const suspendAudit = mocks.recordAuditLog.mock.calls[0]?.[0] as {
      metadata?: { userId?: string; days?: number; removedSessions?: number };
    };
    expect(suspendAudit.metadata).toMatchObject({
      userId: "user-1",
      days: 7,
      removedSessions: 2
    });
    expect(payload).toMatchObject({
      ok: true,
      result: {
        suspendedUntil: "2026-04-10T00:00:00.000Z",
        removedSessions: 2
      }
    });
  });

  it("deletes an account and records an audit log", async () => {
    mocks.deleteAdminUserAccount.mockResolvedValue({
      email: "user@example.com",
      removedSessions: 1
    });

    const response = await POST(
      createRequest("http://localhost/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          action: "delete-account",
          userId: "user-1"
        })
      })
    );
    const payload = await parseJson<{
      ok: boolean;
      result: { email: string; removedSessions: number };
    }>(response);

    expect(response.status).toBe(200);
    expect(mocks.deleteAdminUserAccount).toHaveBeenCalledWith("user-1");
    expect(mocks.recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "admin_user_deleted",
        status: "warning",
        requestId: "req-test"
      })
    );
    const deleteAudit = mocks.recordAuditLog.mock.calls[0]?.[0] as {
      metadata?: { userId?: string; removedSessions?: number };
    };
    expect(deleteAudit.metadata).toMatchObject({
      userId: "user-1",
      removedSessions: 1
    });
    expect(payload).toMatchObject({
      ok: true,
      result: {
        email: "user@example.com",
        removedSessions: 1
      }
    });
  });
});
