import { readFile } from "node:fs/promises";
import path from "node:path";

export type MaintenanceMode = {
  enabled: boolean;
  message: string;
  updatedAt: string | null;
  etaMinutes: number | null;
};

const DEFAULT_MESSAGE = "데이터를 새로 정리하고 있습니다. 잠시 후 다시 접속해 주세요.";

function getMaintenanceFilePath() {
  return process.env.SWING_RADAR_MAINTENANCE_FILE
    ? path.resolve(process.env.SWING_RADAR_MAINTENANCE_FILE)
    : path.resolve(process.cwd(), "public", "maintenance-mode.json");
}

type MaintenanceFilePayload = {
  enabled?: boolean;
  message?: string;
  updatedAt?: string;
  etaMinutes?: number;
};

export async function getMaintenanceMode(): Promise<MaintenanceMode> {
  if (process.env.SWING_RADAR_MAINTENANCE_MODE === "true") {
    return {
      enabled: true,
      message: process.env.SWING_RADAR_MAINTENANCE_MESSAGE ?? DEFAULT_MESSAGE,
      updatedAt: new Date().toISOString(),
      etaMinutes: process.env.SWING_RADAR_MAINTENANCE_ETA_MINUTES
        ? Number(process.env.SWING_RADAR_MAINTENANCE_ETA_MINUTES)
        : null
    };
  }

  try {
    const payload = JSON.parse(await readFile(getMaintenanceFilePath(), "utf8")) as MaintenanceFilePayload;
    return {
      enabled: payload.enabled === true,
      message: typeof payload.message === "string" && payload.message.trim()
        ? payload.message.trim()
        : DEFAULT_MESSAGE,
      updatedAt: typeof payload.updatedAt === "string" ? payload.updatedAt : null,
      etaMinutes: Number.isFinite(payload.etaMinutes) ? Number(payload.etaMinutes) : null
    };
  } catch {
    return {
      enabled: false,
      message: DEFAULT_MESSAGE,
      updatedAt: null,
      etaMinutes: null
    };
  }
}

export function getDefaultMaintenanceMessage() {
  return DEFAULT_MESSAGE;
}
