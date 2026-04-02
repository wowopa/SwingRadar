import { z } from "zod";

import { jsonOk } from "@/lib/server/api-response";
import {
  loadPortfolioCloseReviewsForUser,
  savePortfolioCloseReviewForUser
} from "@/lib/server/portfolio-close-reviews";
import { buildResponseMeta, withRouteTelemetry } from "@/lib/server/telemetry";
import { requireUserSession } from "@/lib/server/user-auth";

const closeReviewSchema = z.object({
  positionKey: z.string().trim().min(1).max(120),
  ticker: z.string().trim().min(1).max(16).regex(/^[A-Za-z0-9._:-]+$/),
  closedAt: z.string().trim().min(1),
  strengthsNote: z.string().trim().max(500).optional().or(z.literal("")).or(z.null()),
  watchoutsNote: z.string().trim().max(500).optional().or(z.literal("")).or(z.null()),
  nextRuleNote: z.string().trim().max(500).optional().or(z.literal("")).or(z.null())
});

export async function GET(request: Request) {
  return withRouteTelemetry(request, { route: "/api/account/portfolio-close-review" }, async (context) => {
    const session = await requireUserSession(request);

    return jsonOk(
      {
        ok: true,
        requestId: context.requestId,
        reviews: await loadPortfolioCloseReviewsForUser(session.user.id)
      },
      buildResponseMeta(context, 0)
    );
  });
}

export async function POST(request: Request) {
  return withRouteTelemetry(request, { route: "/api/account/portfolio-close-review" }, async (context) => {
    const session = await requireUserSession(request);
    const payload = closeReviewSchema.parse(await request.json());
    const review = await savePortfolioCloseReviewForUser(session.user.id, {
      ...payload,
      strengthsNote: payload.strengthsNote ?? undefined,
      watchoutsNote: payload.watchoutsNote ?? undefined,
      nextRuleNote: payload.nextRuleNote ?? undefined,
      updatedBy: session.user.email
    });

    return jsonOk(
      {
        ok: true,
        requestId: context.requestId,
        review
      },
      buildResponseMeta(context, 0)
    );
  });
}
