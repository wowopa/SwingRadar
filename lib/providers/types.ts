import type {
  AnalysisResponseDto,
  RecommendationsResponseDto,
  TrackingResponseDto
} from "@/lib/api-contracts/swing-radar";

export interface ProviderMeta {
  provider: string;
  mode: "mock" | "file" | "external";
}

export interface ProviderExecutionMeta {
  configured: ProviderMeta;
  fallback?: ProviderMeta;
  lastUsed?: ProviderMeta;
  fallbackTriggered: boolean;
}

export interface SwingRadarDataProvider {
  getRecommendations(): Promise<RecommendationsResponseDto>;
  getAnalysis(): Promise<AnalysisResponseDto>;
  getTracking(): Promise<TrackingResponseDto>;
  getProviderMeta(): ProviderExecutionMeta;
}