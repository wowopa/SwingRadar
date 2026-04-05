import { z } from "zod";

import { jsonOk } from "@/lib/server/api-response";
import { buildResponseMeta, withRouteTelemetry } from "@/lib/server/telemetry";
import { confirmEmailVerification } from "@/lib/server/user-auth";

const confirmSchema = z.object({
  token: z.string().trim().min(1)
});

export async function POST(request: Request) {
  return withRouteTelemetry(request, { route: "/api/auth/email-verification/confirm" }, async (context) => {
    const payload = confirmSchema.parse(await request.json());
    const user = await confirmEmailVerification(payload.token);

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
