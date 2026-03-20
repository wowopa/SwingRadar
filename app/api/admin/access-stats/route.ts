import { z } from "zod";

import { jsonOk } from "@/lib/server/api-response";
import { lookupAccessStatsByDate, loadAccessStatsReport } from "@/lib/server/access-stats";
import { assertAdminRequest } from "@/lib/server/admin-auth";
import { buildResponseMeta, withRouteTelemetry } from "@/lib/server/telemetry";

const querySchema = z.object({
  date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

export async function GET(request: Request) {
  return withRouteTelemetry(request, { route: "/api/admin/access-stats" }, async (context) => {
    assertAdminRequest(request);
    const { searchParams } = new URL(request.url);
    const query = querySchema.parse({
      date: searchParams.get("date") ?? undefined
    });

    const [report, lookup] = await Promise.all([
      loadAccessStatsReport(),
      query.date ? lookupAccessStatsByDate(query.date) : Promise.resolve(null)
    ]);

    return jsonOk(
      {
        ok: true,
        requestId: context.requestId,
        report,
        lookup
      },
      buildResponseMeta(context, 0)
    );
  });
}
