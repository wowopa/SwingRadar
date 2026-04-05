import { jsonOk } from "@/lib/server/api-response";
import { buildResponseMeta, withRouteTelemetry } from "@/lib/server/telemetry";
import { createEmailVerificationRequest, requireUserSession } from "@/lib/server/user-auth";

export async function POST(request: Request) {
  return withRouteTelemetry(request, { route: "/api/account/email-verification" }, async (context) => {
    const session = await requireUserSession(request);
    const result = await createEmailVerificationRequest(session.user.id, request);

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
