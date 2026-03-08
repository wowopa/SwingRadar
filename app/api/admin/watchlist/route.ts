import { z } from "zod";

import { jsonOk } from "@/lib/server/api-response";
import { assertAdminRequest } from "@/lib/server/admin-auth";
import { recordAuditLog } from "@/lib/server/audit-log";
import { addSymbolToWatchlist, listWatchlistEntries, updateWatchlistEntry } from "@/lib/server/watchlist-manager";
import { getFeaturedSymbols, getSymbolSuggestionByTicker, searchSymbols } from "@/lib/symbols/master";
import { buildResponseMeta, withRouteTelemetry } from "@/lib/server/telemetry";

const addPayloadSchema = z.object({
  ticker: z.string().min(6).max(6)
});

const updatePayloadSchema = z.object({
  ticker: z.string().min(6).max(6),
  sector: z.string().min(1),
  newsQuery: z.string().min(1),
  dartCorpCode: z.string().optional(),
  requiredKeywords: z.array(z.string()).default([]),
  contextKeywords: z.array(z.string()).default([]),
  blockedKeywords: z.array(z.string()).default([]),
  blockedDomains: z.array(z.string()).default([]),
  preferredDomains: z.array(z.string()).default([]),
  minArticleScore: z.number().min(0).max(100).default(12),
  rerunPipeline: z.boolean().default(true)
});

export async function GET(request: Request) {
  return withRouteTelemetry(request, { route: "/api/admin/watchlist" }, async (context) => {
    assertAdminRequest(request);
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") ?? "";
    const items = query.trim() ? searchSymbols(query, 12) : getFeaturedSymbols(12);

    return jsonOk(
      {
        items,
        watchlist: await listWatchlistEntries(),
        suggestions: Object.fromEntries(items.map((item) => [item.ticker, getSymbolSuggestionByTicker(item.ticker)]))
      },
      buildResponseMeta(context, 30)
    );
  });
}

export async function POST(request: Request) {
  return withRouteTelemetry(request, { route: "/api/admin/watchlist" }, async (context) => {
    assertAdminRequest(request);
    const body = addPayloadSchema.parse(await request.json());
    const symbol = searchSymbols(body.ticker, 1)[0];

    if (!symbol || symbol.ticker !== body.ticker) {
      throw new Error(`Unknown ticker: ${body.ticker}`);
    }

    const result = await addSymbolToWatchlist(symbol);

    await recordAuditLog({
      eventType: "watchlist_add",
      actor: "admin-api",
      status: result.added ? "success" : "warning",
      requestId: context.requestId,
      summary: result.added ? `Watchlist symbol added: ${symbol.ticker}` : `Watchlist symbol already present: ${symbol.ticker}`,
      metadata: {
        ticker: symbol.ticker,
        company: symbol.company,
        suggestedNewsQuery: symbol.newsQuery,
        suggestedCorpCode: symbol.dartCorpCode ?? "",
        timings: result.timings
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

export async function PUT(request: Request) {
  return withRouteTelemetry(request, { route: "/api/admin/watchlist" }, async (context) => {
    assertAdminRequest(request);
    const body = updatePayloadSchema.parse(await request.json());
    const suggestion = getSymbolSuggestionByTicker(body.ticker);
    const normalizedQuery = body.newsQuery.trim();
    const normalizedSector = body.sector.trim();

    const result = await updateWatchlistEntry(
      body.ticker,
      {
        sector: normalizedSector,
        newsQuery: normalizedQuery,
        dartCorpCode: body.dartCorpCode,
        requiredKeywords: body.requiredKeywords.filter(Boolean),
        contextKeywords: body.contextKeywords.filter(Boolean),
        blockedKeywords: body.blockedKeywords.filter(Boolean),
        blockedDomains: body.blockedDomains.filter(Boolean),
        preferredDomains: body.preferredDomains.filter(Boolean),
        minArticleScore: body.minArticleScore,
        newsQueries: suggestion?.newsQueries?.length ? suggestion.newsQueries : [normalizedQuery],
        newsQueriesKr: [
          `"${normalizedQuery}" 주식`,
          `"${normalizedQuery}" ${normalizedSector}`,
          `"${normalizedQuery}" 실적`
        ]
      },
      { rerunPipeline: body.rerunPipeline }
    );

    await recordAuditLog({
      eventType: "watchlist_update",
      actor: "admin-api",
      status: "success",
      requestId: context.requestId,
      summary: `Watchlist metadata updated: ${body.ticker}`,
      metadata: {
        ticker: body.ticker,
        sector: normalizedSector,
        newsQuery: normalizedQuery,
        dartCorpCode: body.dartCorpCode ?? "",
        minArticleScore: body.minArticleScore,
        suggestion,
        changes: result.changes,
        timings: result.timings
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
