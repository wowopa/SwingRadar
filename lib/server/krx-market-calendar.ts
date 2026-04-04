import Holidays from "date-holidays";

import type { MarketSessionStatusDto } from "@/lib/api-contracts/swing-radar";

const KRX_TIME_ZONE = "Asia/Seoul";
const KOREAN_WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

const holidays = new Holidays("KR", {
  languages: ["ko", "en"],
  timezone: KRX_TIME_ZONE,
  types: ["public"]
});

function toDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: KRX_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function getSeoulWeekday(date: Date) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: KRX_TIME_ZONE,
    weekday: "short"
  }).format(date);

  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
}

function getHolidayName(date: Date) {
  const matched = holidays.isHoliday(date);
  if (!matched) {
    return undefined;
  }

  const holiday = Array.isArray(matched) ? matched[0] : matched;
  return holiday?.name || undefined;
}

export function getKrxMarketSessionStatus(now = new Date()): MarketSessionStatusDto {
  const dateKey = toDateKey(now);
  const weekdayIndex = getSeoulWeekday(now);
  const weekdayLabel = weekdayIndex >= 0 ? KOREAN_WEEKDAY_LABELS[weekdayIndex] : undefined;
  const holidayName = getHolidayName(now);
  const isWeekend = weekdayIndex === 0 || weekdayIndex === 6;
  const isHoliday = Boolean(holidayName);

  if (isWeekend) {
    return {
      marketDate: dateKey,
      isOpenDay: false,
      closureKind: "weekend",
      closureLabel: `${weekdayLabel}요일 휴장`,
      headline: "오늘은 지난 기록을 검토하고, 새로운 계획을 만들어보세요.",
      detail: "주말에는 장이 열리지 않으니 장초 확인과 신규 매수 판단보다 복기와 다음 계획 정리에 집중하는 날입니다."
    };
  }

  if (isHoliday) {
    return {
      marketDate: dateKey,
      isOpenDay: false,
      closureKind: "holiday",
      closureLabel: holidayName ?? "공휴일 휴장",
      holidayName,
      headline: "오늘은 지난 기록을 검토하고, 새로운 계획을 만들어보세요.",
      detail: "대한민국 증시 휴장일에는 장초 확인을 진행하지 않습니다. Signals와 Portfolio를 보면서 다음 거래 계획을 정리해보세요."
    };
  }

  return {
    marketDate: dateKey,
    isOpenDay: true,
    closureKind: "open",
    closureLabel: "개장일",
    headline: "오늘 장초 확인을 마친 뒤 실제 행동으로 이어가세요.",
    detail: "장초 5~10분 확인을 마친 종목만 Today 행동 보드로 옮겨 실제 매수 검토와 보유 관리로 이어집니다."
  };
}
