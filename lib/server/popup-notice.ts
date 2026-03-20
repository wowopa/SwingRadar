import { ApiError } from "@/lib/server/api-error";
import { getPostgresPool } from "@/lib/server/postgres";

const POPUP_NOTICE_DOCUMENT_NAME = "popup-notice";

export interface PopupNoticeDocument {
  enabled: boolean;
  title: string;
  body: string;
  imageUrl: string | null;
  imageAlt: string | null;
  startAt: string | null;
  endAt: string | null;
  updatedAt: string;
  updatedBy: string;
}

export function createEmptyPopupNoticeDocument(): PopupNoticeDocument {
  return {
    enabled: false,
    title: "",
    body: "",
    imageUrl: null,
    imageAlt: null,
    startAt: null,
    endAt: null,
    updatedAt: new Date(0).toISOString(),
    updatedBy: "system"
  };
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}

function normalizePopupNoticeDocument(value: unknown): PopupNoticeDocument {
  if (!value || typeof value !== "object") {
    return createEmptyPopupNoticeDocument();
  }

  const payload = value as Record<string, unknown>;

  return {
    enabled: payload.enabled === true,
    title: typeof payload.title === "string" ? payload.title.trim() : "",
    body: typeof payload.body === "string" ? payload.body.trim() : "",
    imageUrl: normalizeOptionalString(payload.imageUrl),
    imageAlt: normalizeOptionalString(payload.imageAlt),
    startAt: normalizeOptionalString(payload.startAt),
    endAt: normalizeOptionalString(payload.endAt),
    updatedAt:
      typeof payload.updatedAt === "string" && payload.updatedAt.trim()
        ? payload.updatedAt
        : createEmptyPopupNoticeDocument().updatedAt,
    updatedBy:
      typeof payload.updatedBy === "string" && payload.updatedBy.trim()
        ? payload.updatedBy
        : createEmptyPopupNoticeDocument().updatedBy
  };
}

function ensureDatabaseConfigured() {
  if (!process.env.SWING_RADAR_DATABASE_URL) {
    throw new ApiError(500, "POPUP_NOTICE_STORE_UNAVAILABLE", "Popup notice storage is unavailable.");
  }
}

export async function loadPopupNoticeDocument(): Promise<PopupNoticeDocument> {
  if (!process.env.SWING_RADAR_DATABASE_URL) {
    return createEmptyPopupNoticeDocument();
  }

  const pool = getPostgresPool();
  const result = await pool.query<{ payload: unknown }>(
    "select payload from runtime_documents where name = $1",
    [POPUP_NOTICE_DOCUMENT_NAME]
  );

  return normalizePopupNoticeDocument(result.rows[0]?.payload);
}

export async function savePopupNoticeDocument(
  document: PopupNoticeDocument
): Promise<PopupNoticeDocument> {
  ensureDatabaseConfigured();

  const normalized = normalizePopupNoticeDocument(document);
  const pool = getPostgresPool();
  await pool.query(
    `
    insert into runtime_documents (name, payload, updated_at)
    values ($1, $2::jsonb, now())
    on conflict (name)
    do update set payload = excluded.payload, updated_at = now()
    `,
    [POPUP_NOTICE_DOCUMENT_NAME, JSON.stringify(normalized)]
  );

  return normalized;
}

export function isPopupNoticeActive(document: PopupNoticeDocument, now = new Date()) {
  if (!document.enabled || !document.title || !document.body) {
    return false;
  }

  const currentTime = now.getTime();
  const startTime = document.startAt ? new Date(document.startAt).getTime() : null;
  const endTime = document.endAt ? new Date(document.endAt).getTime() : null;

  if (startTime !== null && !Number.isNaN(startTime) && currentTime < startTime) {
    return false;
  }

  if (endTime !== null && !Number.isNaN(endTime) && currentTime > endTime) {
    return false;
  }

  return true;
}
