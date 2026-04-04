import { z } from "zod";

import { jsonOk } from "@/lib/server/api-response";
import { assertAdminRequest } from "@/lib/server/admin-auth";
import { recordAuditLog } from "@/lib/server/audit-log";
import { listAdminUsers, revokeAdminUserSessions } from "@/lib/server/admin-user-management";
import { ApiError } from "@/lib/server/api-error";
import { buildResponseMeta, withRouteTelemetry } from "@/lib/server/telemetry";

const updateUserSchema = z.object({
  userId: z.string().trim().min(1),
  action: z.literal("revoke-sessions")
});

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

    const payload = updateUserSchema.parse(await request.json());
    if (payload.action !== "revoke-sessions") {
      throw new ApiError(400, "ADMIN_USERS_INVALID_ACTION", "Unsupported admin user action.");
    }

    const { items } = await listAdminUsers();
    const account = items.find((item) => item.id === payload.userId);
    if (!account) {
      throw new ApiError(404, "ADMIN_USER_NOT_FOUND", "The requested user account could not be found.");
    }

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
  });
}
