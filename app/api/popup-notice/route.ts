import { jsonOk } from "@/lib/server/api-response";
import {
  isPopupNoticeActive,
  loadPopupNoticeDocument
} from "@/lib/server/popup-notice";
import { buildResponseMeta, withRouteTelemetry } from "@/lib/server/telemetry";

export async function GET(request: Request) {
  return withRouteTelemetry(request, { route: "/api/popup-notice" }, async (context) => {
    const document = await loadPopupNoticeDocument();
    const active = isPopupNoticeActive(document)
      ? {
          ...document,
          noticeKey: `${document.updatedAt}:${document.startAt ?? "always"}:${document.endAt ?? "open"}`
        }
      : null;

    return jsonOk(
      {
        ok: true,
        requestId: context.requestId,
        notice: active
      },
      buildResponseMeta(context, 0)
    );
  });
}
