import { z } from "zod";

import { jsonOk } from "@/lib/server/api-response";
import { assertAdminRequest } from "@/lib/server/admin-auth";
import { ApiError } from "@/lib/server/api-error";
import { recordAuditLog } from "@/lib/server/audit-log";
import {
  loadPopupNoticeDocument,
  savePopupNoticeDocument
} from "@/lib/server/popup-notice";
import { buildResponseMeta, withRouteTelemetry } from "@/lib/server/telemetry";

const popupNoticePayloadSchema = z.object({
  enabled: z.boolean().default(false),
  title: z.string().trim().max(120).default(""),
  body: z.string().trim().max(5000).default(""),
  imageUrl: z.union([z.string().trim().url(), z.literal(""), z.null()]).optional(),
  imageAlt: z.string().trim().max(160).optional().or(z.literal("")).or(z.null()),
  startAt: z.string().trim().optional().or(z.literal("")).or(z.null()),
  endAt: z.string().trim().optional().or(z.literal("")).or(z.null())
});

function normalizeDateTimeInput(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const source = value.includes("Z") || /[+-]\d{2}:\d{2}$/.test(value) ? value : `${value}+09:00`;
  const date = new Date(source);

  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, "POPUP_NOTICE_INVALID_DATETIME", "Popup notice date range is invalid.");
  }

  return date.toISOString();
}

export async function GET(request: Request) {
  return withRouteTelemetry(request, { route: "/api/admin/popup-notice" }, async (context) => {
    assertAdminRequest(request);

    return jsonOk(
      {
        ok: true,
        requestId: context.requestId,
        document: await loadPopupNoticeDocument()
      },
      buildResponseMeta(context, 0)
    );
  });
}

export async function POST(request: Request) {
  return withRouteTelemetry(request, { route: "/api/admin/popup-notice" }, async (context) => {
    assertAdminRequest(request);

    const payload = popupNoticePayloadSchema.parse(await request.json());
    const startAt = normalizeDateTimeInput(payload.startAt ?? null);
    const endAt = normalizeDateTimeInput(payload.endAt ?? null);

    if (startAt && endAt && new Date(startAt).getTime() > new Date(endAt).getTime()) {
      throw new ApiError(400, "POPUP_NOTICE_INVALID_RANGE", "Popup notice end time must be after the start time.");
    }

    const document = await savePopupNoticeDocument({
      enabled: payload.enabled,
      title: payload.title,
      body: payload.body,
      imageUrl: payload.imageUrl?.trim() ? payload.imageUrl.trim() : null,
      imageAlt: payload.imageAlt?.trim() ? payload.imageAlt.trim() : null,
      startAt,
      endAt,
      updatedAt: new Date().toISOString(),
      updatedBy: "admin-dashboard"
    });

    await recordAuditLog({
      eventType: "popup_notice_saved",
      actor: "admin-api",
      status: "success",
      requestId: context.requestId,
      summary: `Popup notice updated: ${document.enabled ? "enabled" : "disabled"}`,
      metadata: {
        enabled: document.enabled,
        title: document.title,
        startAt: document.startAt,
        endAt: document.endAt,
        hasImage: Boolean(document.imageUrl)
      }
    });

    return jsonOk(
      {
        ok: true,
        requestId: context.requestId,
        document
      },
      buildResponseMeta(context, 0)
    );
  });
}
