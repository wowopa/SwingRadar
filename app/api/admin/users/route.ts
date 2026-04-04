import { z } from "zod";

import { jsonOk } from "@/lib/server/api-response";
import { assertAdminRequest } from "@/lib/server/admin-auth";
import {
  clearAdminUserSuspension,
  deleteAdminUserAccount,
  listAdminUsers,
  revokeAdminUserSessions,
  suspendAdminUserAccount,
  updateAdminUserAccount
} from "@/lib/server/admin-user-management";
import { recordAuditLog } from "@/lib/server/audit-log";
import { ApiError } from "@/lib/server/api-error";
import { buildResponseMeta, withRouteTelemetry } from "@/lib/server/telemetry";

const adminUserActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("revoke-sessions"),
    userId: z.string().trim().min(1)
  }),
  z.object({
    action: z.literal("update-account"),
    userId: z.string().trim().min(1),
    email: z.string().trim().email(),
    displayName: z.string().trim().min(1).max(40),
    adminNote: z.string().trim().max(500).optional().or(z.literal("")).or(z.null())
  }),
  z.object({
    action: z.literal("suspend-account"),
    userId: z.string().trim().min(1),
    days: z.number().int().min(1).max(365),
    adminNote: z.string().trim().max(500).optional().or(z.literal("")).or(z.null())
  }),
  z.object({
    action: z.literal("clear-suspension"),
    userId: z.string().trim().min(1)
  }),
  z.object({
    action: z.literal("delete-account"),
    userId: z.string().trim().min(1)
  })
]);

export async function GET(request: Request) {
  return withRouteTelemetry(request, { route: "/api/admin/users" }, async (context) => {
    assertAdminRequest(request);

    const url = new URL(request.url);
    const query = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
    const { items, summary } = await listAdminUsers();
    const filteredItems = query
      ? items.filter(
          (item) =>
            item.email.toLowerCase().includes(query) ||
            item.displayName.toLowerCase().includes(query) ||
            item.id.toLowerCase().includes(query)
        )
      : items;

    return jsonOk(
      {
        ok: true,
        requestId: context.requestId,
        summary,
        items: filteredItems,
        query
      },
      buildResponseMeta(context, 0)
    );
  });
}

export async function POST(request: Request) {
  return withRouteTelemetry(request, { route: "/api/admin/users" }, async (context) => {
    assertAdminRequest(request);

    const payload = adminUserActionSchema.parse(await request.json());
    const { items } = await listAdminUsers();
    const account = items.find((item) => item.id === payload.userId);
    if (!account) {
      throw new ApiError(404, "ADMIN_USER_NOT_FOUND", "The requested user account could not be found.");
    }

    if (payload.action === "revoke-sessions") {
      const result = await revokeAdminUserSessions(payload.userId);
      await recordAuditLog({
        eventType: "admin_user_sessions_revoked",
        actor: "admin-api",
        status: result.removedCount > 0 ? "success" : "warning",
        requestId: context.requestId,
        summary:
          result.removedCount > 0
            ? `Revoked ${result.removedCount} active sessions for ${account.email}`
            : `No active sessions to revoke for ${account.email}`,
        metadata: {
          userId: account.id,
          email: account.email,
          removedCount: result.removedCount
        }
      });

      return jsonOk(
        {
          ok: true,
          requestId: context.requestId,
          result
        },
        buildResponseMeta(context, 0)
      );
    }

    if (payload.action === "update-account") {
      const updated = await updateAdminUserAccount({
        userId: payload.userId,
        email: payload.email,
        displayName: payload.displayName,
        adminNote: payload.adminNote
      });

      await recordAuditLog({
        eventType: "admin_user_updated",
        actor: "admin-api",
        status: "success",
        requestId: context.requestId,
        summary: `Updated account settings for ${updated.email}`,
        metadata: {
          userId: updated.id,
          email: updated.email
        }
      });

      return jsonOk(
        {
          ok: true,
          requestId: context.requestId
        },
        buildResponseMeta(context, 0)
      );
    }

    if (payload.action === "suspend-account") {
      const result = await suspendAdminUserAccount({
        userId: payload.userId,
        days: payload.days,
        adminNote: payload.adminNote
      });

      await recordAuditLog({
        eventType: "admin_user_suspended",
        actor: "admin-api",
        status: "warning",
        requestId: context.requestId,
        summary: `Suspended ${account.email} for ${payload.days} day(s)`,
        metadata: {
          userId: account.id,
          email: account.email,
          days: payload.days,
          suspendedUntil: result.suspendedUntil,
          removedSessions: result.removedSessions
        }
      });

      return jsonOk(
        {
          ok: true,
          requestId: context.requestId,
          result
        },
        buildResponseMeta(context, 0)
      );
    }

    if (payload.action === "clear-suspension") {
      const restored = await clearAdminUserSuspension(payload.userId);

      await recordAuditLog({
        eventType: "admin_user_reactivated",
        actor: "admin-api",
        status: "success",
        requestId: context.requestId,
        summary: `Cleared suspension for ${restored.email}`,
        metadata: {
          userId: restored.id,
          email: restored.email
        }
      });

      return jsonOk(
        {
          ok: true,
          requestId: context.requestId
        },
        buildResponseMeta(context, 0)
      );
    }

    if (payload.action === "delete-account") {
      const result = await deleteAdminUserAccount(payload.userId);

      await recordAuditLog({
        eventType: "admin_user_deleted",
        actor: "admin-api",
        status: "warning",
        requestId: context.requestId,
        summary: `Deleted account ${result.email}`,
        metadata: {
          userId: payload.userId,
          email: result.email,
          removedSessions: result.removedSessions
        }
      });

      return jsonOk(
        {
          ok: true,
          requestId: context.requestId,
          result
        },
        buildResponseMeta(context, 0)
      );
    }

    throw new ApiError(400, "ADMIN_USERS_INVALID_ACTION", "Unsupported admin user action.");
  });
}
