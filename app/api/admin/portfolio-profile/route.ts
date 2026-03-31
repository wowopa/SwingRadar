import { z } from "zod";

import { jsonOk } from "@/lib/server/api-response";
import { assertAdminRequest } from "@/lib/server/admin-auth";
import { recordAuditLog } from "@/lib/server/audit-log";
import {
  loadPortfolioProfileDocument,
  savePortfolioProfileDocument
} from "@/lib/server/portfolio-profile";
import { buildResponseMeta, withRouteTelemetry } from "@/lib/server/telemetry";

const portfolioPositionSchema = z.object({
  ticker: z.string().trim().min(1).max(16).regex(/^[A-Za-z0-9._-]+$/),
  company: z.string().trim().optional(),
  sector: z.string().trim().optional(),
  quantity: z.number().min(0),
  averagePrice: z.number().min(0),
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
  return withRouteTelemetry(request, { route: "/api/admin/portfolio-profile" }, async (context) => {
    assertAdminRequest(request);

    return jsonOk(
      {
        ok: true,
        requestId: context.requestId,
        profile: await loadPortfolioProfileDocument()
      },
      buildResponseMeta(context, 0)
    );
  });
}

export async function POST(request: Request) {
  return withRouteTelemetry(request, { route: "/api/admin/portfolio-profile" }, async (context) => {
    assertAdminRequest(request);
    const payload = portfolioProfileSchema.parse(await request.json());
    const profile = await savePortfolioProfileDocument({
      ...payload,
      updatedAt: new Date().toISOString(),
      updatedBy: "admin-dashboard"
    });

    await recordAuditLog({
      eventType: "portfolio_profile_saved",
      actor: "admin-api",
      status: "success",
      requestId: context.requestId,
      summary: `Portfolio profile updated: ${profile.name}`,
      metadata: {
        totalCapital: profile.totalCapital,
        availableCash: profile.availableCash,
        maxRiskPerTradePercent: profile.maxRiskPerTradePercent,
        maxConcurrentPositions: profile.maxConcurrentPositions,
        sectorLimit: profile.sectorLimit,
        positionCount: profile.positions.length
      }
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
