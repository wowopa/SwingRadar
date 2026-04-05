import { z } from "zod";

import { mergePortfolioProfileWithJournal } from "@/lib/portfolio/merge-profile-with-journal";
import { buildPortfolioStateConsistencyReport } from "@/lib/portfolio/portfolio-state-consistency";
import { buildPortfolioWritePathSnapshot } from "@/lib/portfolio/portfolio-write-path";
import { ApiError } from "@/lib/server/api-error";
import { jsonOk } from "@/lib/server/api-response";
import {
  appendPortfolioTradeEventForUser,
  loadPortfolioJournalForUser,
  savePortfolioJournalForUser
} from "@/lib/server/portfolio-journal";
import {
  loadPortfolioProfileForUser,
  savePortfolioProfileForUser,
  syncPortfolioProfileWithTradeEventForUser
} from "@/lib/server/portfolio-profile";
import { buildResponseMeta, withRouteTelemetry } from "@/lib/server/telemetry";
import { requireUserSession } from "@/lib/server/user-auth";

const tradeEventSchema = z.object({
  ticker: z.string().trim().min(1).max(16).regex(/^[A-Za-z0-9._-]+$/),
  type: z.enum(["buy", "add", "take_profit_partial", "exit_full", "stop_loss", "manual_exit"]),
  quantity: z.number().positive(),
  price: z.number().positive(),
  fees: z.number().min(0).optional().default(0),
  tradedAt: z.string().trim().min(1),
  note: z.string().trim().max(400).optional().or(z.literal("")).or(z.null()),
  syncProfilePosition: z.boolean().optional().default(false)
});

const undoTradeEventSchema = z.object({
  eventId: z.string().trim().min(1),
  journal: z.unknown(),
  profile: z.unknown().optional()
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
    const previousJournal = await loadPortfolioJournalForUser(session.user.id);
    const previousProfile = await loadPortfolioProfileForUser(session.user.id);

    const result = await appendPortfolioTradeEventForUser(session.user.id, {
      ...payload,
      note: payload.note ?? undefined,
      createdBy: session.user.email
    });

    const syncedProfile = payload.syncProfilePosition
      ? await syncPortfolioProfileWithTradeEventForUser(
          session.user.id,
          {
            ticker: payload.ticker,
            type: payload.type,
            quantity: payload.quantity,
            price: payload.price,
            fees: payload.fees,
            tradedAt: payload.tradedAt,
            note: payload.note ?? undefined
          },
          session.user.email
        )
      : undefined;

    const profile = syncedProfile
      ? await savePortfolioProfileForUser(
          session.user.id,
          mergePortfolioProfileWithJournal(syncedProfile, result.journal)
        )
      : undefined;

    const finalProfile = profile ?? previousProfile;
    const consistency = buildPortfolioStateConsistencyReport(finalProfile, result.journal);
    const writePath = buildPortfolioWritePathSnapshot({
      action: "append",
      previousJournal,
      nextJournal: result.journal,
      finalProfile,
      consistency,
      event: result.event,
      previousProfile,
      syncProfilePosition: payload.syncProfilePosition
    });

    return jsonOk(
      {
        ok: true,
        requestId: context.requestId,
        event: result.event,
        journal: result.journal,
        profile,
        consistency,
        writePath
      },
      buildResponseMeta(context, 0)
    );
  });
}

export async function PATCH(request: Request) {
  return withRouteTelemetry(request, { route: "/api/account/portfolio-journal" }, async (context) => {
    const session = await requireUserSession(request);
    const payload = undoTradeEventSchema.parse(await request.json());
    const currentJournal = await loadPortfolioJournalForUser(session.user.id);
    const currentProfile = await loadPortfolioProfileForUser(session.user.id);
    const latestEvent = currentJournal.events[0] ?? null;

    if (!latestEvent || latestEvent.id !== payload.eventId) {
      throw new ApiError(409, "LATEST_EVENT_ONLY", "Only the latest journal event can be undone.");
    }

    const journal = await savePortfolioJournalForUser(session.user.id, payload.journal);
    const savedProfile = payload.profile ? await savePortfolioProfileForUser(session.user.id, payload.profile) : undefined;
    const profile = savedProfile
      ? await savePortfolioProfileForUser(session.user.id, mergePortfolioProfileWithJournal(savedProfile, journal))
      : undefined;

    const finalProfile = profile ?? currentProfile;
    const consistency = buildPortfolioStateConsistencyReport(finalProfile, journal);
    const writePath = buildPortfolioWritePathSnapshot({
      action: "undo",
      previousJournal: currentJournal,
      nextJournal: journal,
      finalProfile,
      consistency,
      event: latestEvent,
      undoProfile: savedProfile ?? undefined
    });

    return jsonOk(
      {
        ok: true,
        requestId: context.requestId,
        journal,
        profile,
        consistency,
        writePath
      },
      buildResponseMeta(context, 0)
    );
  });
}
