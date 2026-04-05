import { z } from "zod";

import { jsonOk } from "@/lib/server/api-response";
import { ApiError } from "@/lib/server/api-error";
import { buildResponseMeta, withRouteTelemetry } from "@/lib/server/telemetry";
import {
  getUserSessionTokenFromRequest,
  listUserSessions,
  requireUserSession,
  revokeOtherUserSessions,
  revokeUserSessionById
} from "@/lib/server/user-auth";

const deleteSessionSchema = z.object({
  scope: z.enum(["others", "session"]).default("others"),
  sessionId: z.string().trim().optional()
});

export async function GET(request: Request) {
  return withRouteTelemetry(request, { route: "/api/account/sessions" }, async (context) => {
    const session = await requireUserSession(request);
    const sessions = await listUserSessions(session.user.id, getUserSessionTokenFromRequest(request));

    return jsonOk(
      {
        ok: true,
        requestId: context.requestId,
        sessions
      },
      buildResponseMeta(context, 0)
    );
  });
}

export async function DELETE(request: Request) {
  return withRouteTelemetry(request, { route: "/api/account/sessions" }, async (context) => {
    const session = await requireUserSession(request);
    const rawToken = getUserSessionTokenFromRequest(request);
    const payload = deleteSessionSchema.parse(await request.json().catch(() => ({})));
    let removedCount = 0;

    if (payload.scope === "others") {
      removedCount = await revokeOtherUserSessions(session.user.id, rawToken);
    } else {
      if (!payload.sessionId) {
        throw new ApiError(400, "AUTH_SESSION_ID_REQUIRED", "해제할 세션을 선택해 주세요.");
      }

      const sessions = await listUserSessions(session.user.id, rawToken);
      const selectedSession = sessions.find((item) => item.sessionId === payload.sessionId);
      if (!selectedSession) {
        throw new ApiError(404, "AUTH_SESSION_NOT_FOUND", "선택한 세션을 찾지 못했습니다.");
      }

      if (selectedSession.isCurrent) {
        throw new ApiError(400, "AUTH_CURRENT_SESSION_PROTECTED", "현재 사용 중인 세션은 여기서 해제할 수 없습니다.");
      }

      removedCount = (await revokeUserSessionById(session.user.id, payload.sessionId)) ? 1 : 0;
    }

    return jsonOk(
      {
        ok: true,
        requestId: context.requestId,
        removedCount,
        sessions: await listUserSessions(session.user.id, rawToken)
      },
      buildResponseMeta(context, 0)
    );
  });
}
