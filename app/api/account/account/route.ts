import { z } from "zod";

import { jsonOk } from "@/lib/server/api-response";
import { buildResponseMeta, withRouteTelemetry } from "@/lib/server/telemetry";
import { deleteCurrentUserAccount } from "@/lib/server/account-lifecycle";
import {
  clearUserSessionCookie,
  requireUserSession
} from "@/lib/server/user-auth";

const deleteAccountSchema = z.object({
  password: z.string().min(1).max(100),
  confirmation: z.literal("DELETE")
});

export async function DELETE(request: Request) {
  return withRouteTelemetry(request, { route: "/api/account/account" }, async (context) => {
    const session = await requireUserSession(request);
    const payload = deleteAccountSchema.parse(await request.json());

    await deleteCurrentUserAccount({
      userId: session.user.id,
      password: payload.password
    });

    const response = jsonOk(
      {
        ok: true,
        requestId: context.requestId
      },
      buildResponseMeta(context, 0)
    );
    clearUserSessionCookie(response);
    return response;
  });
}
