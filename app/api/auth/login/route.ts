import { z } from "zod";

import { jsonOk } from "@/lib/server/api-response";
import { buildResponseMeta, withRouteTelemetry } from "@/lib/server/telemetry";
import {
  applyUserSessionCookie,
  assertLoginAttemptAllowed,
  authenticateUserAccount,
  clearLoginAttemptFailures,
  createUserSession,
  recordLoginAttemptFailure
} from "@/lib/server/user-auth";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(100)
});

export async function POST(request: Request) {
  return withRouteTelemetry(request, { route: "/api/auth/login" }, async (context) => {
    const payload = loginSchema.parse(await request.json());
    await assertLoginAttemptAllowed(request, payload.email);

    let user;
    try {
      user = await authenticateUserAccount(payload);
    } catch (error) {
      await recordLoginAttemptFailure(request, payload.email);
      throw error;
    }

    await clearLoginAttemptFailures(request, payload.email);
    const { rawToken, session } = await createUserSession(user, request);
    const response = jsonOk(
      {
        ok: true,
        requestId: context.requestId,
        session
      },
      buildResponseMeta(context, 0)
    );
    applyUserSessionCookie(response, {
      rawToken,
      expiresAt: session.expiresAt
    });
    return response;
  });
}
