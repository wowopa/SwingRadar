import type { TrackingResponseDto } from "@/lib/api-contracts/swing-radar";
import { trackingResponse } from "@/lib/api-mock/tracking";
import { fetchJson } from "@/lib/repositories/api-client";
import { getTrackingSnapshot } from "@/lib/services/tracking-service";
import type { SignalHistoryEntry, TrackingDetail } from "@/types/tracking";

export interface TrackingPayload {
  generatedAt: string;
  history: SignalHistoryEntry[];
  details: Record<string, TrackingDetail>;
}

export async function getTrackingPayload(): Promise<TrackingPayload> {
  const response = await fetchJson<TrackingResponseDto>("/api/tracking", {
    fallback: async () => {
      if (typeof window === "undefined") {
        return getTrackingSnapshot({});
      }

      return trackingResponse;
    }
  });

  return {
    generatedAt: response.generatedAt,
    history: response.history,
    details: response.details
  };
}
