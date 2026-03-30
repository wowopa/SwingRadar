import type { SignalTone } from "@/types/recommendation";

export type TrackingResult = "감시중" | "진행중" | "성공" | "실패" | "무효화";

export interface SignalHistoryEntry {
  id: string;
  ticker: string;
  company: string;
  signalDate: string;
  startedAt?: string | null;
  closedAt?: string | null;
  closedReason?: string | null;
  signalTone: SignalTone;
  entryScore: number;
  result: TrackingResult;
  mfe: number;
  mae: number;
  currentReturn?: number;
  holdingDays: number;
  selectionStage?: string;
  selectionReason?: string;
}

export interface HistoricalSnapshotPoint {
  label: string;
  price: number;
}

export interface TrackingNewsCard {
  id: string;
  date: string;
  headline: string;
  impact: SignalTone;
  note: string;
  source: string;
  url: string;
  eventType: string;
}

export interface ScoreLogEntry {
  timestamp: string;
  factor: string;
  delta: number;
  reason: string;
  scoreAfter?: number;
}

export interface TrackingMetric {
  label: string;
  value: string;
  note: string;
}

export interface TrackingDetail {
  historyId: string;
  selectionStage?: string;
  selectionReason?: string;
  selectionHighlights?: string[];
  summary: string;
  invalidationReview: string;
  afterActionReview: string;
  reviewChecklist: string[];
  metrics: TrackingMetric[];
  chartSnapshot: HistoricalSnapshotPoint[];
  historicalNews: TrackingNewsCard[];
  scoreLog: ScoreLogEntry[];
}

export interface TrackingDetailSource {
  getHistory(): SignalHistoryEntry[];
  getDetail(historyId: string): TrackingDetail | undefined;
}
