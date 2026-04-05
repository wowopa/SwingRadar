function normalizeOptionalString(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export interface ServiceContactInfo {
  supportEmail: string | null;
  responseWindow: string;
  supportHours: string;
  statusPageLabel: string;
  policyUpdatedAt: string;
}

export function getServiceContactInfo(): ServiceContactInfo {
  return {
    supportEmail:
      normalizeOptionalString(process.env.SWING_RADAR_SUPPORT_EMAIL) ??
      normalizeOptionalString(process.env.NEXT_PUBLIC_SWING_RADAR_SUPPORT_EMAIL),
    responseWindow: normalizeOptionalString(process.env.SWING_RADAR_SUPPORT_RESPONSE_WINDOW) ?? "영업일 기준 1~2일",
    supportHours: normalizeOptionalString(process.env.SWING_RADAR_SUPPORT_HOURS) ?? "평일 10:00~18:00 (KST)",
    statusPageLabel: normalizeOptionalString(process.env.SWING_RADAR_STATUS_LABEL) ?? "서비스 공지와 데이터 상태 배너",
    policyUpdatedAt: normalizeOptionalString(process.env.SWING_RADAR_POLICY_UPDATED_AT) ?? "2026-04-05"
  };
}
