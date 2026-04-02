import { z } from "zod";

import { jsonOk } from "@/lib/server/api-response";
import {
  loadPortfolioPersonalRulesForUser,
  savePortfolioPersonalRuleForUser
} from "@/lib/server/portfolio-personal-rules";
import { buildResponseMeta, withRouteTelemetry } from "@/lib/server/telemetry";
import { requireUserSession } from "@/lib/server/user-auth";

const personalRuleSchema = z.object({
  text: z.string().trim().min(1).max(240),
  sourceCategory: z.enum(["strengths", "watchouts", "next_rule"])
});

export async function GET(request: Request) {
  return withRouteTelemetry(request, { route: "/api/account/portfolio-personal-rules" }, async (context) => {
    const session = await requireUserSession(request);

    return jsonOk(
      {
        ok: true,
        requestId: context.requestId,
        rules: await loadPortfolioPersonalRulesForUser(session.user.id)
      },
      buildResponseMeta(context, 0)
    );
  });
}

export async function POST(request: Request) {
  return withRouteTelemetry(request, { route: "/api/account/portfolio-personal-rules" }, async (context) => {
    const session = await requireUserSession(request);
    const payload = personalRuleSchema.parse(await request.json());
    const rule = await savePortfolioPersonalRuleForUser(session.user.id, {
      ...payload,
      updatedBy: session.user.email
    });

    return jsonOk(
      {
        ok: true,
        requestId: context.requestId,
        rule
      },
      buildResponseMeta(context, 0)
    );
  });
}
