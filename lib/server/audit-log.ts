import { ApiError } from "@/lib/server/api-error";
import { getPostgresPool } from "@/lib/server/postgres";

export type AuditEventType =
  | "admin_ingest"
  | "admin_login_attempt"
  | "health_warning"
  | "admin_draft_saved"
  | "admin_news_curation_saved"
  | "admin_publish"
  | "watchlist_add"
  | "watchlist_update"
  | "universe_review_update"
  | "provider_fallback";

export interface AuditLogRecord {
  id: number;
  eventType: AuditEventType;
  actor: string;
  status: "success" | "failure" | "warning";
  requestId: string;
  summary: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface AuditLogInput {
  eventType: AuditEventType;
  actor: string;
  status: "success" | "failure" | "warning";
  requestId: string;
  summary: string;
  metadata?: Record<string, unknown>;
}

function canUseAuditStore() {
  return Boolean(process.env.SWING_RADAR_DATABASE_URL);
}

export async function recordAuditLog(input: AuditLogInput) {
  if (!canUseAuditStore()) {
    console.info(JSON.stringify({ scope: "audit", ...input, metadata: input.metadata ?? {}, createdAt: new Date().toISOString() }));
    return;
  }

  const pool = getPostgresPool();
  await pool.query(
    `
    insert into audit_logs (event_type, actor, status, request_id, summary, metadata)
    values ($1, $2, $3, $4, $5, $6::jsonb)
    `,
    [input.eventType, input.actor, input.status, input.requestId, input.summary, JSON.stringify(input.metadata ?? {})]
  );
}

export async function listAuditLogs(limit = 20): Promise<AuditLogRecord[]> {
  if (!canUseAuditStore()) {
    return [];
  }

  const pool = getPostgresPool();
  try {
    const result = await pool.query<{
      id: number;
      event_type: AuditEventType;
      actor: string;
      status: "success" | "failure" | "warning";
      request_id: string;
      summary: string;
      metadata: Record<string, unknown> | null;
      created_at: string;
    }>(
      `
      select id, event_type, actor, status, request_id, summary, metadata, created_at
      from audit_logs
      order by created_at desc
      limit $1
      `,
      [limit]
    );

    return result.rows.map((row) => ({
      id: row.id,
      eventType: row.event_type,
      actor: row.actor,
      status: row.status,
      requestId: row.request_id,
      summary: row.summary,
      metadata: row.metadata ?? {},
      createdAt: row.created_at
    }));
  } catch (error) {
    throw new ApiError(500, "AUDIT_QUERY_FAILED", "Failed to load audit logs", {
      cause: error instanceof Error ? error.message : String(error)
    });
  }
}
