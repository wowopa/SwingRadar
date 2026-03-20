import { jsonOk } from "@/lib/server/api-response";
import { createSupportDonationOrder } from "@/lib/server/support-donations";
import { buildResponseMeta, withRouteTelemetry } from "@/lib/server/telemetry";

export async function POST(request: Request) {
  return withRouteTelemetry(request, { route: "/api/support/order" }, async (context) => {
    const body = (await request.json().catch(() => ({}))) as {
      amount?: unknown;
      donorName?: unknown;
      message?: unknown;
    };

    const payload = await createSupportDonationOrder({
      amount: body.amount,
      donorName: body.donorName,
      message: body.message
    });

    return jsonOk(
      {
        ok: true,
        requestId: context.requestId,
        order: payload
      },
      buildResponseMeta(context, 0)
    );
  });
}
