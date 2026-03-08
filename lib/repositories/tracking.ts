import type { TrackingResponseDto } from "@/lib/api-contracts/swing-radar";
import { trackingResponse } from "@/lib/api-mock/tracking";
import { fetchJson } from "@/lib/repositories/api-client";
import type { SignalHistoryEntry, TrackingDetail } from "@/types/tracking";

export interface TrackingPayload {
  history: SignalHistoryEntry[];
  details: Record<string, TrackingDetail>;
}

export async function getTrackingPayload(): Promise<TrackingPayload> {
  const response = await fetchJson<TrackingResponseDto>("/api/tracking", {
    fallback: () => trackingResponse
  });

  return {
    history: response.history,
    details: response.details
  };
}