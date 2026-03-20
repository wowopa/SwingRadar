import { createHash, randomUUID } from "node:crypto";

import { getPostgresPool } from "@/lib/server/postgres";

const ACCESS_STATS_COOKIE_NAME = "swing_radar_vid";
const DEFAULT_RETENTION_DAYS = 3650;
const ACCESS_STATS_SCHEMA_SQL = `
create table if not exists site_visit_daily_visitors (
  visit_date date not null,
  visitor_hash text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  visits integer not null default 1,
  first_path text not null default '/',
  last_path text not null default '/',
  primary key (visit_date, visitor_hash)
);

create index if not exists site_visit_daily_visitors_visit_date_idx
  on site_visit_daily_visitors (visit_date desc);

create index if not exists site_visit_daily_visitors_last_seen_at_idx
  on site_visit_daily_visitors (last_seen_at desc);
`;

let ensureAccessStatsSchemaPromise: Promise<void> | null = null;

export type AccessStatsReportPayload = {
  generatedAt: string;
  totalUniqueVisitors: number;
  today: {
    date: string;
    uniqueVisitors: number;
  };
  last7Days: {
    startDate: string;
    endDate: string;
    uniqueVisitors: number;
  };
  last30Days: {
    startDate: string;
    endDate: string;
    uniqueVisitors: number;
  };
  trackedDays: number;
  recentDaily: Array<{
    date: string;
    uniqueVisitors: number;
  }>;
};

export type AccessStatsLookupPayload = {
  requestedDate: string;
  uniqueVisitors: number;
  tracked: boolean;
};

export function getAccessStatsCookieName() {
  return ACCESS_STATS_COOKIE_NAME;
}

export function createAccessStatsVisitorId() {
  return randomUUID();
}

function getAccessStatsSalt() {
  return process.env.SWING_RADAR_ACCESS_STATS_SALT ?? "swing-radar-access-stats";
}

function getAccessStatsRetentionDays() {
  const value = Number(process.env.SWING_RADAR_ACCESS_STATS_RETENTION_DAYS ?? DEFAULT_RETENTION_DAYS);
  return Number.isFinite(value) && value >= 30 ? Math.trunc(value) : DEFAULT_RETENTION_DAYS;
}

function buildVisitorHash(visitorId: string) {
  return createHash("sha256")
    .update(`${getAccessStatsSalt()}:${visitorId}`)
    .digest("hex");
}

function normalizePathname(pathname: string) {
  if (!pathname.startsWith("/")) {
    return "/";
  }

  return pathname.slice(0, 240) || "/";
}

export function isTrackableSitePath(pathname: string) {
  if (!pathname.startsWith("/")) {
    return false;
  }

  const excludedPrefixes = ["/admin", "/api", "/maintenance", "/_next"];
  return !excludedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function isLikelyBotUserAgent(userAgent: string | null | undefined) {
  if (!userAgent) {
    return false;
  }

  return /bot|crawler|spider|slurp|bingpreview|duckduckbot|discordbot|facebookexternalhit|kakaotalk-scrap|whatsapp/i.test(
    userAgent
  );
}

async function ensureAccessStatsSchema() {
  if (!ensureAccessStatsSchemaPromise) {
    const pool = getPostgresPool();
    ensureAccessStatsSchemaPromise = pool
      .query(ACCESS_STATS_SCHEMA_SQL)
      .then(() => undefined)
      .catch((error) => {
        ensureAccessStatsSchemaPromise = null;
        throw error;
      });
  }

  return ensureAccessStatsSchemaPromise;
}

export async function recordSiteVisit(input: { visitorId: string; pathname: string; userAgent?: string | null }) {
  if (!input.visitorId || !isTrackableSitePath(input.pathname) || isLikelyBotUserAgent(input.userAgent)) {
    return { recorded: false };
  }

  await ensureAccessStatsSchema();

  const visitorHash = buildVisitorHash(input.visitorId);
  const pathname = normalizePathname(input.pathname);
  const retentionDays = getAccessStatsRetentionDays();
  const pool = getPostgresPool();
  const client = await pool.connect();

  try {
    await client.query("begin");
    await client.query(
      `
        insert into site_visit_daily_visitors (
          visit_date,
          visitor_hash,
          first_seen_at,
          last_seen_at,
          visits,
          first_path,
          last_path
        )
        values (
          timezone('Asia/Seoul', now())::date,
          $1,
          now(),
          now(),
          1,
          $2,
          $2
        )
        on conflict (visit_date, visitor_hash)
        do update set
          last_seen_at = now(),
          visits = site_visit_daily_visitors.visits + 1,
          last_path = excluded.last_path
      `,
      [visitorHash, pathname]
    );
    await client.query(
      `
        delete from site_visit_daily_visitors
        where visit_date < timezone('Asia/Seoul', now())::date - ($1::int - 1)
      `,
      [retentionDays]
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }

  return { recorded: true };
}

export async function loadAccessStatsReport(): Promise<AccessStatsReportPayload> {
  await ensureAccessStatsSchema();

  const pool = getPostgresPool();
  const [summaryResult, recentDailyResult] = await Promise.all([
    pool.query<{
      today: string;
      total_unique_visitors: string;
      today_unique_visitors: string;
      last7_start: string;
      last7_end: string;
      last7_unique_visitors: string;
      last30_start: string;
      last30_end: string;
      last30_unique_visitors: string;
      tracked_days: string;
    }>(`
      with bounds as (
        select timezone('Asia/Seoul', now())::date as today
      )
      select
        bounds.today::text as today,
        (
          select count(distinct visitor_hash)
          from site_visit_daily_visitors
        )::text as total_unique_visitors,
        (
          select count(*)
          from site_visit_daily_visitors
          where visit_date = bounds.today
        )::text as today_unique_visitors,
        (bounds.today - 6)::text as last7_start,
        bounds.today::text as last7_end,
        (
          select count(distinct visitor_hash)
          from site_visit_daily_visitors
          where visit_date between bounds.today - 6 and bounds.today
        )::text as last7_unique_visitors,
        (bounds.today - 29)::text as last30_start,
        bounds.today::text as last30_end,
        (
          select count(distinct visitor_hash)
          from site_visit_daily_visitors
          where visit_date between bounds.today - 29 and bounds.today
        )::text as last30_unique_visitors,
        (
          select count(distinct visit_date)
          from site_visit_daily_visitors
        )::text as tracked_days
      from bounds
    `),
    pool.query<{ date: string; unique_visitors: string }>(`
      with bounds as (
        select timezone('Asia/Seoul', now())::date as today
      )
      select
        visit_date::text as date,
        count(*)::text as unique_visitors
      from site_visit_daily_visitors
      where visit_date between (select today - 13 from bounds) and (select today from bounds)
      group by visit_date
      order by visit_date desc
    `)
  ]);

  const summary = summaryResult.rows[0];

  return {
    generatedAt: new Date().toISOString(),
    totalUniqueVisitors: Number(summary?.total_unique_visitors ?? 0),
    today: {
      date: summary?.today ?? "",
      uniqueVisitors: Number(summary?.today_unique_visitors ?? 0)
    },
    last7Days: {
      startDate: summary?.last7_start ?? "",
      endDate: summary?.last7_end ?? "",
      uniqueVisitors: Number(summary?.last7_unique_visitors ?? 0)
    },
    last30Days: {
      startDate: summary?.last30_start ?? "",
      endDate: summary?.last30_end ?? "",
      uniqueVisitors: Number(summary?.last30_unique_visitors ?? 0)
    },
    trackedDays: Number(summary?.tracked_days ?? 0),
    recentDaily: recentDailyResult.rows.map((row) => ({
      date: row.date,
      uniqueVisitors: Number(row.unique_visitors ?? 0)
    }))
  };
}

export async function lookupAccessStatsByDate(requestedDate: string): Promise<AccessStatsLookupPayload> {
  await ensureAccessStatsSchema();

  const normalizedDate = requestedDate.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
    throw new Error("Requested date must match YYYY-MM-DD.");
  }

  const pool = getPostgresPool();
  const result = await pool.query<{ unique_visitors: string }>(
    `
      select count(*)::text as unique_visitors
      from site_visit_daily_visitors
      where visit_date = $1::date
    `,
    [normalizedDate]
  );

  const uniqueVisitors = Number(result.rows[0]?.unique_visitors ?? 0);

  return {
    requestedDate: normalizedDate,
    uniqueVisitors,
    tracked: uniqueVisitors > 0
  };
}
