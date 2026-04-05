import { z } from "zod";

import { jsonOk } from "@/lib/server/api-response";
import { buildResponseMeta, withRouteTelemetry } from "@/lib/server/telemetry";
import {
  changeUserPassword,
  getUserSessionTokenFromRequest,
  requireUserSession
} from "@/lib/server/user-auth";

const passwordSchema = z.object({
  currentPassword: z.string().min(1).max(100),
  nextPassword: z.string().min(8).max(100)
});

export async function POST(request: Request) {
  return withRouteTelemetry(request, { route: "/api/account/password" }, async (context) => {
    const session = await requireUserSession(request);
    const payload = passwordSchema.parse(await request.json());
    const result = await changeUserPassword({
      userId: session.user.id,
      currentPassword: payload.currentPassword,
      nextPassword: payload.nextPassword,
      rawToken: getUserSessionTokenFromRequest(request)
    });

    return jsonOk(
      {
        ok: true,
        requestId: context.requestId,
        ...result
      },
      buildResponseMeta(context, 0)
    );
  });
}
