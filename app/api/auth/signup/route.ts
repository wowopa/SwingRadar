import { z } from "zod";

import { jsonOk } from "@/lib/server/api-response";
import { savePortfolioProfileForUser } from "@/lib/server/portfolio-profile";
import { buildResponseMeta, withRouteTelemetry } from "@/lib/server/telemetry";
import {
  applyUserSessionCookie,
  createUserAccount,
  createUserSession
} from "@/lib/server/user-auth";

const signupSchema = z.object({
  email: z.string().trim().email(),
  displayName: z.string().trim().min(1).max(40),
  password: z.string().min(8).max(100)
});

export async function POST(request: Request) {
  return withRouteTelemetry(request, { route: "/api/auth/signup" }, async (context) => {
    const payload = signupSchema.parse(await request.json());
    const user = await createUserAccount(payload);
    await savePortfolioProfileForUser(user.id, {
      name: `${user.displayName} 포트폴리오`,
      totalCapital: 0,
      availableCash: 0,
      maxRiskPerTradePercent: 0.8,
      maxConcurrentPositions: 4,
      sectorLimit: 2,
      positions: [],
      updatedAt: new Date(0).toISOString(),
      updatedBy: user.email
    });

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
