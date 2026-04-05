import { z } from "zod";

import { jsonOk } from "@/lib/server/api-response";
import { buildResponseMeta, withRouteTelemetry } from "@/lib/server/telemetry";
import { confirmPasswordReset } from "@/lib/server/user-auth";

const confirmResetSchema = z.object({
  token: z.string().trim().min(1),
  password: z.string().min(8).max(100)
});

export async function POST(request: Request) {
  return withRouteTelemetry(request, { route: "/api/auth/password-reset/confirm" }, async (context) => {
    const payload = confirmResetSchema.parse(await request.json());
    const user = await confirmPasswordReset(payload);

    return jsonOk(
      {
        ok: true,
        requestId: context.requestId,
        user
      },
      buildResponseMeta(context, 0)
    );
  });
}
