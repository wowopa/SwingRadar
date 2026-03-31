import { z } from "zod";

import { jsonOk } from "@/lib/server/api-response";
import { buildResponseMeta, withRouteTelemetry } from "@/lib/server/telemetry";
import {
  applyUserSessionCookie,
  authenticateUserAccount,
  createUserSession
} from "@/lib/server/user-auth";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(100)
});

export async function POST(request: Request) {
  return withRouteTelemetry(request, { route: "/api/auth/login" }, async (context) => {
    const payload = loginSchema.parse(await request.json());
    const user = await authenticateUserAccount(payload);
    const { rawToken, session } = await createUserSession(user);
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
