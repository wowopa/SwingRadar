import type {
  AnalysisResponseDto,
  RecommendationsResponseDto,
  TickerAnalysisDto,
  TrackingResponseDto
} from "@/lib/api-contracts/swing-radar";
import type { SwingRadarDataProvider } from "@/lib/providers/types";
import { ApiError } from "@/lib/server/api-error";
import { getPostgresPool } from "@/lib/server/postgres";

interface RecommendationRow {
  generated_at: string;
  payload: RecommendationsResponseDto["items"][number];
}

interface AnalysisRow {
  generated_at: string;
  ticker: string;
  payload: TickerAnalysisDto;
}

interface TrackingPayloadRow {
  generated_at: string;
  history: TrackingResponseDto["history"];
  details: TrackingResponseDto["details"];
}

export const postgresDataProvider: SwingRadarDataProvider = {
  async getRecommendations() {
    const pool = getPostgresPool();
    const result = await pool.query<RecommendationRow>(
      `
      with latest_snapshot as (
        select max(generated_at) as generated_at
        from recommendation_snapshots
      )
      select recommendation_snapshots.generated_at, recommendation_snapshots.payload
      from recommendation_snapshots
      inner join latest_snapshot
        on recommendation_snapshots.generated_at = latest_snapshot.generated_at
      order by (recommendation_snapshots.payload->>'score')::numeric desc nulls last
      `
    );

    if (!result.rows.length) {
      throw new ApiError(404, "RECOMMENDATIONS_EMPTY", "No recommendation snapshot rows found");
    }

    return {
      generatedAt: result.rows[0].generated_at,
      items: result.rows.map((row: RecommendationRow) => row.payload),
      dailyScan: null
    } satisfies RecommendationsResponseDto;
  },

  async getAnalysis() {
    const pool = getPostgresPool();
    const result = await pool.query<AnalysisRow>(
      `
      with latest_snapshot as (
        select max(generated_at) as generated_at
        from analysis_snapshots
      )
      select analysis_snapshots.generated_at, analysis_snapshots.ticker, analysis_snapshots.payload
      from analysis_snapshots
      inner join latest_snapshot
        on analysis_snapshots.generated_at = latest_snapshot.generated_at
      order by analysis_snapshots.ticker asc
      `
    );

    if (!result.rows.length) {
      throw new ApiError(404, "ANALYSIS_EMPTY", "No analysis snapshot rows found");
    }

    return {
      generatedAt: result.rows[0].generated_at,
      items: result.rows.map((row: AnalysisRow) => row.payload)
    } satisfies AnalysisResponseDto;
  },

  async getTracking() {
    const pool = getPostgresPool();
    const result = await pool.query<TrackingPayloadRow>(
      `
      select generated_at, history, details
      from tracking_snapshots
      order by generated_at desc
      limit 1
      `
    );

    const row = result.rows[0];
    if (!row) {
      throw new ApiError(404, "TRACKING_EMPTY", "No tracking snapshot rows found");
    }

    return {
      generatedAt: row.generated_at,
      history: row.history,
      details: row.details
    } satisfies TrackingResponseDto;
  },

  getProviderMeta() {
    return {
      configured: {
        provider: "postgresDataProvider",
        mode: "external"
      },
      lastUsed: {
        provider: "postgresDataProvider",
        mode: "external"
      },
      fallbackTriggered: false
    };
  }
};
