import { z } from "zod";

import { jsonOk } from "@/lib/server/api-response";
import {
  appendPortfolioTradeEventForUser,
  loadPortfolioJournalForUser
} from "@/lib/server/portfolio-journal";
import { buildResponseMeta, withRouteTelemetry } from "@/lib/server/telemetry";
import { requireUserSession } from "@/lib/server/user-auth";

const tradeEventSchema = z.object({
  ticker: z.string().trim().min(1).max(16).regex(/^[A-Za-z0-9._-]+$/),
  type: z.enum(["buy", "add", "take_profit_partial", "exit_full", "stop_loss", "manual_exit"]),
  quantity: z.number().positive(),
  price: z.number().positive(),
  fees: z.number().min(0).optional().default(0),
  tradedAt: z.string().trim().min(1),
  note: z.string().trim().max(400).optional().or(z.literal("")).or(z.null())
});

export async function GET(request: Request) {
  return withRouteTelemetry(request, { route: "/api/account/portfolio-journal" }, async (context) => {
    const session = await requireUserSession(request);

    return jsonOk(
      {
        ok: true,
        requestId: context.requestId,
        journal: await loadPortfolioJournalForUser(session.user.id)
      },
      buildResponseMeta(context, 0)
    );
  });
}

export async function POST(request: Request) {
  return withRouteTelemetry(request, { route: "/api/account/portfolio-journal" }, async (context) => {
    const session = await requireUserSession(request);
    const payload = tradeEventSchema.parse(await request.json());
    const result = await appendPortfolioTradeEventForUser(session.user.id, {
      ...payload,
      note: payload.note ?? undefined,
      createdBy: session.user.email
    });

    return jsonOk(
      {
        ok: true,
        requestId: context.requestId,
        event: result.event,
        journal: result.journal
      },
      buildResponseMeta(context, 0)
    );
  });
}
