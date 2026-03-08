create table if not exists recommendation_snapshots (
  id bigserial primary key,
  generated_at timestamptz not null,
  ticker text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists recommendation_snapshots_generated_at_idx
  on recommendation_snapshots (generated_at desc);

create index if not exists recommendation_snapshots_ticker_idx
  on recommendation_snapshots (ticker);

create unique index if not exists recommendation_snapshots_generated_at_ticker_uidx
  on recommendation_snapshots (generated_at, ticker);

create table if not exists analysis_snapshots (
  id bigserial primary key,
  generated_at timestamptz not null,
  ticker text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create unique index if not exists analysis_snapshots_generated_at_ticker_uidx
  on analysis_snapshots (generated_at, ticker);

create table if not exists tracking_snapshots (
  id bigserial primary key,
  generated_at timestamptz not null,
  history jsonb not null,
  details jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists tracking_snapshots_generated_at_idx
  on tracking_snapshots (generated_at desc);

create unique index if not exists tracking_snapshots_generated_at_uidx
  on tracking_snapshots (generated_at);

create table if not exists audit_logs (
  id bigserial primary key,
  event_type text not null,
  actor text not null,
  status text not null,
  request_id text not null,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_at_idx
  on audit_logs (created_at desc);

create index if not exists audit_logs_event_type_idx
  on audit_logs (event_type);
