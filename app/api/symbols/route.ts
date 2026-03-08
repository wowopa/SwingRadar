import { jsonOk } from "@/lib/server/api-response";
import { buildResponseMeta, withRouteTelemetry } from "@/lib/server/telemetry";
import { getFeaturedSymbols, searchSymbols } from "@/lib/symbols/master";

export async function GET(request: Request) {
  return withRouteTelemetry(request, { route: "/api/symbols" }, async (context) => {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") ?? "";
    const limit = Number(searchParams.get("limit") ?? "8");
    const items = query.trim() ? searchSymbols(query, limit) : getFeaturedSymbols(limit);

    return jsonOk(
      {
        items,
        query
      },
      buildResponseMeta(context, 60)
    );
  });
}
