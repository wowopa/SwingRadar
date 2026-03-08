import { z } from "zod";

import { jsonOk } from "@/lib/server/api-response";
import { assertAdminRequest } from "@/lib/server/admin-auth";
import { recordAuditLog } from "@/lib/server/audit-log";
import { getDailyCandidates } from "@/lib/repositories/daily-candidates";
import { listUniverseCandidateReviews, saveUniverseCandidateReview } from "@/lib/server/universe-candidate-reviews";
import { promoteUniverseCandidate } from "@/lib/server/universe-promotion";
import { buildResponseMeta, withRouteTelemetry } from "@/lib/server/telemetry";

const reviewPayloadSchema = z.object({
  ticker: z.string().trim().min(1).max(16).regex(/^[A-Za-z0-9._-]+$/),
  status: z.enum(["new", "reviewing", "hold", "promoted", "rejected"]),
  note: z.string().max(1000).optional()
});

const promotePayloadSchema = z.object({
  ticker: z.string().trim().min(1).max(16).regex(/^[A-Za-z0-9._-]+$/),
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

export async function POST(request: Request) {
  return withRouteTelemetry(request, { route: "/api/admin/universe" }, async (context) => {
    assertAdminRequest(request);
    const body = promotePayloadSchema.parse(await request.json());
    const result = await promoteUniverseCandidate({
      ticker: body.ticker,
      note: body.note,
      updatedBy: "admin-editor"
    });

    await Promise.all([
      recordAuditLog({
        eventType: "universe_review_update",
        actor: "admin-api",
        status: "success",
        requestId: context.requestId,
        summary: `Universe candidate promoted: ${body.ticker}`,
        metadata: {
          ticker: body.ticker,
          reviewStatus: "promoted",
          note: result.review.note
        }
      }),
      recordAuditLog({
        eventType: "watchlist_add",
        actor: "admin-api",
        status: result.watchlist.added ? "success" : "warning",
        requestId: context.requestId,
        summary: result.watchlist.added
          ? `Watchlist symbol added from universe: ${body.ticker}`
          : `Universe candidate already present in watchlist: ${body.ticker}`,
        metadata: {
          ticker: body.ticker,
          timings: result.watchlist.timings,
          estimate: result.watchlist.estimate
        }
      })
    ]);

    return jsonOk(
      {
        ok: true,
        requestId: context.requestId,
        review: result.review,
        watchlist: result.watchlist
      },
      buildResponseMeta(context, 0)
    );
  });
}
