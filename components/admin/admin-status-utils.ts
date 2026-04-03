"use client";

export function formatDuration(durationMs: number | null) {
  if (durationMs === null) {
    return "-";
  }

  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }

  return `${(durationMs / 1000).toFixed(1)}s`;
}

export function formatBytes(value: number | null | undefined) {
  if (!value || value <= 0) {
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

export function formatProviderLabel(value: string | null | undefined) {
  if (!value) {
    return "unknown";
  }

  if (value === "postgresDataProvider") {
    return "postgres";
  }

  if (value === "fileDataProvider") {
    return "file";
  }

  if (value === "externalDataProvider") {
    return "external";
  }

  return value;
}

export function formatShortDate(value: string) {
  if (!value) {
    return "-";
  }

  const date = new Date(`${value}T00:00:00+09:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

export function formatPercent(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) {
    return "-";
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)}%`;
}
