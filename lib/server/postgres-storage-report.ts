import { getPostgresPool } from "@/lib/server/postgres";

export type DatabaseStorageTableStat = {
  tableName: string;
  totalBytes: number;
  totalSizeLabel: string;
  liveRows: number;
  deadRows: number;
  lastVacuum: string | null;
  lastAutovacuum: string | null;
};

export type DatabaseStorageReport = {
  checkedAt: string;
  databaseSizeBytes: number;
  databaseSizeLabel: string;
  tables: DatabaseStorageTableStat[];
  runtimeDocuments: {
    documentCount: number;
    totalPayloadBytes: number;
    totalPayloadLabel: string;
    largestDocuments: Array<{
      name: string;
      payloadBytes: number;
      payloadLabel: string;
    }>;
  };
};

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let current = value;
  let index = 0;

  while (current >= 1024 && index < units.length - 1) {
    current /= 1024;
    index += 1;
  }

  return `${current.toFixed(current >= 100 || index === 0 ? 0 : 1)} ${units[index]}`;
}

export async function loadDatabaseStorageReport(): Promise<DatabaseStorageReport> {
  const pool = getPostgresPool();
  const [databaseSizeResult, tableStatsResult, runtimeSummaryResult, runtimeLargestResult] = await Promise.all([
    pool.query<{ database_size_bytes: string }>("select pg_database_size(current_database())::bigint as database_size_bytes"),
    pool.query<{
      table_name: string;
      total_bytes: string;
      total_size_label: string;
      live_rows: string;
      dead_rows: string;
      last_vacuum: string | null;
      last_autovacuum: string | null;
    }>(`
      select
        relname as table_name,
        pg_total_relation_size(relid)::bigint as total_bytes,
        pg_size_pretty(pg_total_relation_size(relid)) as total_size_label,
        coalesce(n_live_tup, 0)::bigint as live_rows,
        coalesce(n_dead_tup, 0)::bigint as dead_rows,
        to_char(last_vacuum, 'YYYY-MM-DD"T"HH24:MI:SS') as last_vacuum,
        to_char(last_autovacuum, 'YYYY-MM-DD"T"HH24:MI:SS') as last_autovacuum
      from pg_stat_user_tables
      order by pg_total_relation_size(relid) desc
      limit 8
    `),
    pool.query<{ document_count: string; total_payload_bytes: string }>(`
      select
        count(*)::bigint as document_count,
        coalesce(sum(octet_length(payload::text)), 0)::bigint as total_payload_bytes
      from runtime_documents
    `),
    pool.query<{ name: string; payload_bytes: string }>(`
      select
        name,
        octet_length(payload::text)::bigint as payload_bytes
      from runtime_documents
      order by payload_bytes desc
      limit 5
    `)
  ]);

  const databaseSizeBytes = Number(databaseSizeResult.rows[0]?.database_size_bytes ?? 0);
  const runtimeSummary = runtimeSummaryResult.rows[0];

  return {
    checkedAt: new Date().toISOString(),
    databaseSizeBytes,
    databaseSizeLabel: formatBytes(databaseSizeBytes),
    tables: tableStatsResult.rows.map((row) => ({
      tableName: row.table_name,
      totalBytes: Number(row.total_bytes),
      totalSizeLabel: row.total_size_label,
      liveRows: Number(row.live_rows),
      deadRows: Number(row.dead_rows),
      lastVacuum: row.last_vacuum,
      lastAutovacuum: row.last_autovacuum
    })),
    runtimeDocuments: {
      documentCount: Number(runtimeSummary?.document_count ?? 0),
      totalPayloadBytes: Number(runtimeSummary?.total_payload_bytes ?? 0),
      totalPayloadLabel: formatBytes(Number(runtimeSummary?.total_payload_bytes ?? 0)),
      largestDocuments: runtimeLargestResult.rows.map((row) => ({
        name: row.name,
        payloadBytes: Number(row.payload_bytes),
        payloadLabel: formatBytes(Number(row.payload_bytes))
      }))
    }
  };
}
