import { trackingResponse } from "@/lib/api-mock/tracking";
import type { TrackingDetailSource } from "@/types/tracking";

export const mockTrackingSource: TrackingDetailSource = {
  getHistory() {
    return trackingResponse.history;
  },
  getDetail(historyId) {
    return trackingResponse.details[historyId];
  }
};