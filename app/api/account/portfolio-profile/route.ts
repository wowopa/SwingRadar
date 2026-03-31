import { z } from "zod";

import { jsonOk } from "@/lib/server/api-response";
import {
  loadPortfolioProfileForUser,
  savePortfolioProfileForUser
} from "@/lib/server/portfolio-profile";
import { buildResponseMeta, withRouteTelemetry } from "@/lib/server/telemetry";
import { requireUserSession } from "@/lib/server/user-auth";

const portfolioPositionSchema = z.object({
  ticker: z.string().trim().min(1).max(16).regex(/^[A-Za-z0-9._-]+$/),
  company: z.string().trim().optional(),
  sector: z.string().trim().optional(),
  quantity: z.number().min(0),
  averagePrice: z.number().min(0),
  enteredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")).or(z.null()),
  note: z.string().trim().max(300).optional().or(z.literal("")).or(z.null())
});

const portfolioProfileSchema = z.object({
  name: z.string().trim().min(1).max(80),
  totalCapital: z.number().min(0),
  availableCash: z.number().min(0),
  maxRiskPerTradePercent: z.number().min(0).max(100),
  maxConcurrentPositions: z.number().int().min(1).max(20),
  sectorLimit: z.number().int().min(1).max(10),
  positions: z.array(portfolioPositionSchema).max(50).default([])
});

export async function GET(request: Request) {
  return withRouteTelemetry(request, { route: "/api/account/portfolio-profile" }, async (context) => {
    const session = await requireUserSession(request);

    return jsonOk(
      {
        ok: true,
        requestId: context.requestId,
        profile: await loadPortfolioProfileForUser(session.user.id)
      },
      buildResponseMeta(context, 0)
    );
  });
}

export async function POST(request: Request) {
  return withRouteTelemetry(request, { route: "/api/account/portfolio-profile" }, async (context) => {
    const session = await requireUserSession(request);
    const payload = portfolioProfileSchema.parse(await request.json());
    const profile = await savePortfolioProfileForUser(session.user.id, {
      ...payload,
      updatedAt: new Date().toISOString(),
      updatedBy: session.user.email
    });

    return jsonOk(
      {
        ok: true,
        requestId: context.requestId,
        profile
      },
      buildResponseMeta(context, 0)
    );
  });
}
