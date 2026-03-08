import { z } from "zod";

import { jsonOk } from "@/lib/server/api-response";
import { assertAdminRequest } from "@/lib/server/admin-auth";
import { recordAuditLog } from "@/lib/server/audit-log";
import { getDailyCandidates } from "@/lib/repositories/daily-candidates";
import { listUniverseCandidateReviews, saveUniverseCandidateReview } from "@/lib/server/universe-candidate-reviews";
import { buildResponseMeta, withRouteTelemetry } from "@/lib/server/telemetry";

const reviewPayloadSchema = z.object({
  ticker: z.string().min(6).max(6),
  status: z.enum(["new", "reviewing", "hold", "promoted", "rejected"]),
  note: z.string().max(1000).optional()
});

export async function GET(request: Request) {
  return withRouteTelemetry(request, { route: "/api/admin/universe" }, async (context) => {
    assertAdminRequest(request);
    const [dailyCandidates, reviews] = await Promise.all([getDailyCandidates(), listUniverseCandidateReviews()]);

    const mergedDailyCandidates = dailyCandidates
      ? {
          ...dailyCandidates,
          topCandidates: dailyCandidates.topCandidates.map((candidate) => ({
            ...candidate,
            review: reviews[candidate.ticker]
          }))
        }
      : null;

    return jsonOk(
      {
        ok: true,
        requestId: context.requestId,
        dailyCandidates: mergedDailyCandidates,
        reviews
      },
      buildResponseMeta(context, 0)
    );
  });
}

export async function PUT(request: Request) {
  return withRouteTelemetry(request, { route: "/api/admin/universe" }, async (context) => {
    assertAdminRequest(request);
    const body = reviewPayloadSchema.parse(await request.json());
    const review = await saveUniverseCandidateReview({
      ticker: body.ticker,
      status: body.status,
      note: body.note,
      updatedBy: "admin-editor"
    });

    await recordAuditLog({
      eventType: "universe_review_update",
      actor: "admin-api",
      status: "success",
      requestId: context.requestId,
      summary: `Universe candidate review updated: ${body.ticker}`,
      metadata: {
        ticker: body.ticker,
        reviewStatus: body.status,
        note: body.note?.trim() ?? ""
      }
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
