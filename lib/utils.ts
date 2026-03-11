import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPercent(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function formatScore(value: number, digits = 1) {
  return value.toFixed(digits);
}

export function describeSignalScore(value: number) {
  if (value >= 24) {
    return "강한 신호";
  }
  if (value >= 18) {
    return "볼 만한 신호";
  }
  if (value >= 12) {
    return "확인 필요";
  }

  return "주의 구간";
}

export function formatPrice(value: number) {
  return `${new Intl.NumberFormat("ko-KR").format(Math.round(value))}원`;
}

export function formatDateTimeShort(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const formatter = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul"
  });
  const parts = formatter.formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}. ${values.month}. ${values.day}. ${values.hour}:${values.minute}`;
}
