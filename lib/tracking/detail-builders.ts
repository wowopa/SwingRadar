import { mockTrackingSource } from "@/lib/tracking/mock-source";
import type { SignalHistoryEntry, TrackingDetail, TrackingDetailSource } from "@/types/tracking";

let activeSource: TrackingDetailSource = mockTrackingSource;

export function registerTrackingDetailSource(source: TrackingDetailSource) {
  activeSource = source;
}

export function getSignalHistory(): SignalHistoryEntry[] {
  return activeSource.getHistory();
}

export function getTrackingDetail(historyId: string): TrackingDetail | undefined {
  return activeSource.getDetail(historyId);
}
