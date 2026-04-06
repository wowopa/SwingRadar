import { z } from "zod";

import { jsonOk } from "@/lib/server/api-response";
import { assertAdminRequest } from "@/lib/server/admin-auth";
import { recordAuditLog } from "@/lib/server/audit-log";
import { refetchTopCandidateMissingNews } from "@/lib/server/admin-news-refetch";
import { buildResponseMeta, withRouteTelemetry } from "@/lib/server/telemetry";

const refetchPayloadSchema = z.object({
  tickers: z.array(z.string().trim().min(1).max(16)).max(20).optional()
});

export async function POST(request: Request) {
  return withRouteTelemetry(request, { route: "/api/admin/news-refetch" }, async (context) => {
    assertAdminRequest(request);
    const body = refetchPayloadSchema.parse(await request.json().catch(() => ({})));
    const result = await refetchTopCandidateMissingNews(body.tickers ?? []);

    await recordAuditLog({
      eventType: "admin_news_refetch",
      actor: "admin-api",
      status: result.noop ? "warning" : "success",
      requestId: context.requestId,
      summary: result.noop
        ? "Top candidate news refetch skipped"
        : `Top candidate news refetch completed for ${result.requestedTickers.length} ticker(s)`,
      metadata: {
        scope: result.scope,
        requestedTickers: result.requestedTickers.join(","),
        missingTickersBefore: result.missingTickersBefore.join(","),
        missingTickersAfter: result.missingTickersAfter.join(","),
        resolvedTickers: result.resolvedTickers.join(","),
        noop: String(result.noop),
        reportCompletedAt: result.reportCompletedAt ?? "",
        scripts: JSON.stringify(result.scripts)
      }
    });

    return jsonOk(
      {
        ok: true,
        requestId: context.requestId,
        result
      },
      buildResponseMeta(context, 0)
    );
  });
}
