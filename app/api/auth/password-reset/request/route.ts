import { z } from "zod";

import { jsonOk } from "@/lib/server/api-response";
import { buildResponseMeta, withRouteTelemetry } from "@/lib/server/telemetry";
import { requestPasswordReset } from "@/lib/server/user-auth";

const resetRequestSchema = z.object({
  email: z.string().trim().email()
});

export async function POST(request: Request) {
  return withRouteTelemetry(request, { route: "/api/auth/password-reset/request" }, async (context) => {
    const payload = resetRequestSchema.parse(await request.json());
    const result = await requestPasswordReset(payload.email, request);

    return jsonOk(
      {
        ok: true,
        requestId: context.requestId,
        ...result,
        message: "입력한 이메일이 가입되어 있으면 비밀번호 재설정 링크가 준비됩니다."
      },
      buildResponseMeta(context, 0)
    );
  });
}
