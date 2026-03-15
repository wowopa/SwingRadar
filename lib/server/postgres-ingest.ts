import { readFile } from "fs/promises";
import path from "path";

import type {
  AnalysisResponseDto,
  RecommendationsResponseDto,
  TrackingResponseDto
} from "@/lib/api-contracts/swing-radar";
import { ApiError } from "@/lib/server/api-error";
import { getPostgresPool } from "@/lib/server/postgres";
import { getRuntimePaths } from "@/lib/server/runtime-paths";

export interface SnapshotBundle {
  recommendations: RecommendationsResponseDto;
  analysis: AnalysisResponseDto;
  tracking: TrackingResponseDto;
}

function getDataDir() {
  return process.env.SWING_RADAR_DATA_DIR
    ? path.resolve(process.env.SWING_RADAR_DATA_DIR)
    : getRuntimePaths().liveDir;
}

export async function loadSnapshotBundleFromDisk(dataDir = getDataDir()): Promise<SnapshotBundle> {
  async function readJson<T>(filename: string) {
    const fullPath = path.join(dataDir, filename);
    const content = await readFile(fullPath, "utf8");
    return JSON.parse(content) as T;
  }

  return {
    recommendations: await readJson<RecommendationsResponseDto>("recommendations.json"),
    analysis: await readJson<AnalysisResponseDto>("analysis.json"),
    tracking: await readJson<TrackingResponseDto>("tracking.json")
  };
}

export async function applyPostgresSchema() {
  const sql = await readFile(path.resolve(process.cwd(), "db/postgres-schema.sql"), "utf8");
  const pool = getPostgresPool();
  await pool.query(sql);
}

function getRetentionDays(name: string, fallback: number) {
  const parsed = Number(process.env[name] ?? fallback);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

async function pruneExpiredSnapshots(client: { query: (sql: string, values?: unknown[]) => Promise<unknown> }) {
  const retentionPolicies = [
    {
      table: "recommendation_snapshots",
      column: "generated_at",
      days: getRetentionDays("SWING_RADAR_RECOMMENDATION_RETENTION_DAYS", 60)
    },
    {
      table: "analysis_snapshots",
      column: "generated_at",
      days: getRetentionDays("SWING_RADAR_ANALYSIS_RETENTION_DAYS", 30)
    },
    {
      table: "tracking_snapshots",
      column: "generated_at",
      days: getRetentionDays("SWING_RADAR_TRACKING_RETENTION_DAYS", 60)
    },
    {
      table: "audit_logs",
      column: "created_at",
      days: getRetentionDays("SWING_RADAR_AUDIT_LOG_RETENTION_DAYS", 90)
    }
  ];

  for (const policy of retentionPolicies) {
    await client.query(
      `delete from ${policy.table} where ${policy.column} < now() - make_interval(days => $1::int)`,
      [policy.days]
    );
  }
}

export async function ingestSnapshotBundle(
  bundle: SnapshotBundle,
  options?: { applySchema?: boolean; requestId?: string; actor?: string }
) {
  const pool = getPostgresPool();
  const client = await pool.connect();

  try {
    await client.query("begin");

    if (options?.applySchema) {
      const sql = await readFile(path.resolve(process.cwd(), "db/postgres-schema.sql"), "utf8");
      await client.query(sql);
    }

    let recommendationCount = 0;
    for (const item of bundle.recommendations.items) {
      await client.query(
        `
        insert into recommendation_snapshots (generated_at, ticker, payload)
        values ($1, $2, $3::jsonb)
        on conflict (generated_at, ticker)
        do update set payload = excluded.payload
        `,
        [bundle.recommendations.generatedAt, item.ticker, JSON.stringify(item)]
      );
      recommendationCount += 1;
    }

    let analysisCount = 0;
    for (const item of bundle.analysis.items) {
      await client.query(
        `
        insert into analysis_snapshots (generated_at, ticker, payload)
        values ($1, $2, $3::jsonb)
        on conflict (generated_at, ticker)
        do update set payload = excluded.payload
        `,
        [bundle.analysis.generatedAt, item.ticker, JSON.stringify(item)]
      );
      analysisCount += 1;
    }

    await client.query(
      `
      insert into tracking_snapshots (generated_at, history, details)
      values ($1, $2::jsonb, $3::jsonb)
      on conflict (generated_at)
      do update set history = excluded.history, details = excluded.details
      `,
      [bundle.tracking.generatedAt, JSON.stringify(bundle.tracking.history), JSON.stringify(bundle.tracking.details)]
    );

    const result = {
      recommendations: recommendationCount,
      analysis: analysisCount,
      trackingHistoryRows: bundle.tracking.history.length,
      generatedAt: bundle.tracking.generatedAt,
      actor: options?.actor ?? "system",
      requestId: options?.requestId ?? null
    };

    if (options?.requestId) {
      await client.query(
        `
        insert into audit_logs (event_type, actor, status, request_id, summary, metadata)
        values ($1, $2, $3, $4, $5, $6::jsonb)
        `,
        [
          "admin_ingest",
          options.actor ?? "system",
          "success",
          options.requestId,
          "Snapshot bundle ingested into PostgreSQL",
          JSON.stringify(result)
        ]
      );
    }

    await pruneExpiredSnapshots(client);

    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw new ApiError(500, "INGEST_FAILED", "Failed to ingest snapshot bundle into PostgreSQL", {
      cause: error instanceof Error ? error.message : String(error)
    });
  } finally {
    client.release();
  }
}
