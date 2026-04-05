import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { AutoHealReport, DailyCycleReport } from "@/lib/server/ops-reports";
import { loadRuntimeDocument, saveRuntimeDocument } from "@/lib/server/runtime-documents";
import { getRuntimePaths } from "@/lib/server/runtime-paths";

const DOCUMENT_NAME = "ops-verification";

type OpsVerificationStatus = "ready" | "monitor" | "blocked";
type OpsVerificationCheckStatus = "pass" | "warn" | "fail";

export type OpsVerificationKey = "scheduler" | "backup" | "restore" | "rollback" | "smoke";

export interface OpsVerificationCheckpoint {
  checkedAt: string | null;
  checkedBy: string | null;
  note: string;
}

export interface OpsVerificationDocument {
  scheduler: OpsVerificationCheckpoint;
  backup: OpsVerificationCheckpoint;
  restore: OpsVerificationCheckpoint;
  rollback: OpsVerificationCheckpoint;
  smoke: OpsVerificationCheckpoint;
  updatedAt: string;
  updatedBy: string | null;
}

export interface OpsVerificationCheck {
  key: OpsVerificationKey;
  label: string;
  status: OpsVerificationCheckStatus;
  note: string;
  checkedAt: string | null;
  checkedBy: string | null;
  operatorNote: string;
  cadenceLabel: string;
}

export interface OpsVerificationSummary {
  status: OpsVerificationStatus;
  label: string;
  summary: string;
  nextAction: string;
  passCount: number;
  warningCount: number;
  failureCount: number;
  blockers: string[];
  updatedAt: string;
  updatedBy: string | null;
  checks: OpsVerificationCheck[];
}

interface BuildOpsVerificationSummaryArgs {
  document: OpsVerificationDocument;
  dailyCycleReport: DailyCycleReport | null;
  autoHealReport: AutoHealReport | null;
  now?: Date;
}

interface SaveOpsVerificationCheckpointArgs {
  key: OpsVerificationKey;
  note?: string;
  checkedAt?: string;
  checkedBy?: string | null;
}

function resolveProjectRoot() {
  return process.cwd();
}

function getOpsVerificationPath() {
  return process.env.SWING_RADAR_OPS_VERIFICATION_PATH
    ? path.resolve(process.env.SWING_RADAR_OPS_VERIFICATION_PATH)
    : path.join(getRuntimePaths(resolveProjectRoot()).opsDir, "ops-verification.json");
}

function createEmptyCheckpoint(): OpsVerificationCheckpoint {
  return {
    checkedAt: null,
    checkedBy: null,
    note: ""
  };
}

function createDefaultDocument(): OpsVerificationDocument {
  return {
    scheduler: createEmptyCheckpoint(),
    backup: createEmptyCheckpoint(),
    restore: createEmptyCheckpoint(),
    rollback: createEmptyCheckpoint(),
    smoke: createEmptyCheckpoint(),
    updatedAt: "",
    updatedBy: null
  };
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}

function normalizeCheckpoint(value: unknown): OpsVerificationCheckpoint {
  if (!value || typeof value !== "object") {
    return createEmptyCheckpoint();
  }

  const raw = value as Partial<OpsVerificationCheckpoint>;
  return {
    checkedAt: normalizeOptionalString(raw.checkedAt),
    checkedBy: normalizeOptionalString(raw.checkedBy),
    note: typeof raw.note === "string" ? raw.note.trim() : ""
  };
}

function normalizeDocument(value: unknown): OpsVerificationDocument {
  const fallback = createDefaultDocument();
  if (!value || typeof value !== "object") {
    return fallback;
  }

  const raw = value as Partial<OpsVerificationDocument>;
  return {
    scheduler: normalizeCheckpoint(raw.scheduler),
    backup: normalizeCheckpoint(raw.backup),
    restore: normalizeCheckpoint(raw.restore),
    rollback: normalizeCheckpoint(raw.rollback),
    smoke: normalizeCheckpoint(raw.smoke),
    updatedAt: normalizeOptionalString(raw.updatedAt) ?? "",
    updatedBy: normalizeOptionalString(raw.updatedBy)
  };
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content.replace(/^\uFEFF/, "")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    if (error instanceof SyntaxError) {
      console.warn(`[ops-verification] Invalid JSON document ignored: ${filePath}`, error.message);
      return null;
    }

    throw error;
  }
}

async function persistDocument(document: OpsVerificationDocument) {
  const storedInDatabase = await saveRuntimeDocument(DOCUMENT_NAME, document);
  if (storedInDatabase) {
    return document;
  }

  const filePath = getOpsVerificationPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(document, null, 2)}\n`, "utf8");
  return document;
}

function getAgeInDays(value: string | null, now: Date) {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }

  const checkedAt = new Date(value);
  if (Number.isNaN(checkedAt.getTime())) {
    return Number.POSITIVE_INFINITY;
  }

  return (now.getTime() - checkedAt.getTime()) / (1000 * 60 * 60 * 24);
}

function buildCheckpointCheck(args: {
  key: OpsVerificationKey;
  label: string;
  checkpoint: OpsVerificationCheckpoint;
  requiredWithinDays: number;
  warnAfterDays: number;
  missingNote: string;
  warningPrefix: string;
  successNote: string;
}) {
  const ageInDays = getAgeInDays(args.checkpoint.checkedAt, new Date());
  if (!args.checkpoint.checkedAt) {
    return {
      key: args.key,
      label: args.label,
      status: "fail" as const,
      note: args.missingNote,
      checkedAt: null,
      checkedBy: args.checkpoint.checkedBy,
      operatorNote: args.checkpoint.note,
      cadenceLabel: `${args.requiredWithinDays}일 이내`
    };
  }

  if (ageInDays > args.warnAfterDays) {
    return {
      key: args.key,
      label: args.label,
      status: "warn" as const,
      note: `${args.warningPrefix} 마지막 확인이 ${Math.floor(ageInDays)}일 전입니다.`,
      checkedAt: args.checkpoint.checkedAt,
      checkedBy: args.checkpoint.checkedBy,
      operatorNote: args.checkpoint.note,
      cadenceLabel: `${args.requiredWithinDays}일 이내`
    };
  }

  return {
    key: args.key,
    label: args.label,
    status: "pass" as const,
    note: args.successNote,
    checkedAt: args.checkpoint.checkedAt,
    checkedBy: args.checkpoint.checkedBy,
    operatorNote: args.checkpoint.note,
    cadenceLabel: `${args.requiredWithinDays}일 이내`
  };
}

function buildSchedulerCheck(args: BuildOpsVerificationSummaryArgs): OpsVerificationCheck {
  const checkpoint = args.document.scheduler;
  if (!args.dailyCycleReport || !args.autoHealReport) {
    return {
      key: "scheduler",
      label: "스케줄러 증빙",
      status: "fail",
      note: "daily cycle 또는 auto-heal 리포트가 없어 실제 스케줄러 등록 여부를 확인할 수 없습니다.",
      checkedAt: checkpoint.checkedAt,
      checkedBy: checkpoint.checkedBy,
      operatorNote: checkpoint.note,
      cadenceLabel: "7일 이내"
    };
  }

  if (!checkpoint.checkedAt) {
    return {
      key: "scheduler",
      label: "스케줄러 증빙",
      status: "fail",
      note: "실제 운영 머신의 스케줄러 등록과 최근 실행 결과를 확인한 기록이 없습니다.",
      checkedAt: checkpoint.checkedAt,
      checkedBy: checkpoint.checkedBy,
      operatorNote: checkpoint.note,
      cadenceLabel: "7일 이내"
    };
  }

  const ageInDays = getAgeInDays(checkpoint.checkedAt, args.now ?? new Date());
  if (ageInDays > 7) {
    return {
      key: "scheduler",
      label: "스케줄러 증빙",
      status: "warn",
      note: `최근 스케줄러 확인 기록이 ${Math.floor(ageInDays)}일 전입니다. 운영 머신 등록 상태를 다시 점검하세요.`,
      checkedAt: checkpoint.checkedAt,
      checkedBy: checkpoint.checkedBy,
      operatorNote: checkpoint.note,
      cadenceLabel: "7일 이내"
    };
  }

  return {
    key: "scheduler",
    label: "스케줄러 증빙",
    status: "pass",
    note: "daily cycle, auto-heal 리포트와 운영 머신 확인 기록이 함께 남아 있습니다.",
    checkedAt: checkpoint.checkedAt,
    checkedBy: checkpoint.checkedBy,
    operatorNote: checkpoint.note,
    cadenceLabel: "7일 이내"
  };
}

function getStatusLabel(status: OpsVerificationStatus) {
  if (status === "blocked") {
    return "운영 증빙 필요";
  }

  if (status === "monitor") {
    return "재점검 권장";
  }

  return "운영 검증 준비";
}

function getNextAction(check: OpsVerificationCheck | undefined) {
  switch (check?.key) {
    case "scheduler":
      return "실제 운영 머신의 스케줄러 등록 화면과 최근 실행 로그를 확인한 뒤 증빙 메모를 남기세요.";
    case "backup":
      return "런타임/DB 백업 위치와 최근 백업 생성 시간을 확인한 뒤 기록을 남기세요.";
    case "restore":
      return "백업 파일을 이용한 복구 리허설을 1회 수행하고 복구 범위와 결과를 기록하세요.";
    case "rollback":
      return "스냅샷 롤백 드릴을 한 번 수행하고 사용한 히스토리 ID와 결과를 메모하세요.";
    case "smoke":
      return "배포 후 핵심 경로(Today, Signals, Portfolio, 로그인/튜토리얼)를 점검한 뒤 스모크 결과를 남기세요.";
    default:
      return "운영 체크포인트 5개가 모두 최신 상태인지 확인하세요.";
  }
}

export async function loadOpsVerificationDocument() {
  const runtimePayload = await loadRuntimeDocument<OpsVerificationDocument>(DOCUMENT_NAME);
  if (runtimePayload) {
    return normalizeDocument(runtimePayload);
  }

  const filePayload = await readJsonFile<OpsVerificationDocument>(getOpsVerificationPath());
  return normalizeDocument(filePayload);
}

export async function saveOpsVerificationCheckpoint(args: SaveOpsVerificationCheckpointArgs) {
  const document = await loadOpsVerificationDocument();
  const checkedAt = args.checkedAt ? new Date(args.checkedAt) : new Date();
  const nextDocument: OpsVerificationDocument = {
    ...document,
    [args.key]: {
      checkedAt: checkedAt.toISOString(),
      checkedBy: normalizeOptionalString(args.checkedBy) ?? "admin-dashboard",
      note: typeof args.note === "string" ? args.note.trim() : ""
    },
    updatedAt: new Date().toISOString(),
    updatedBy: normalizeOptionalString(args.checkedBy) ?? "admin-dashboard"
  };

  return persistDocument(nextDocument);
}

export function buildOpsVerificationSummary(args: BuildOpsVerificationSummaryArgs): OpsVerificationSummary {
  const checks: OpsVerificationCheck[] = [
    buildSchedulerCheck(args),
    buildCheckpointCheck({
      key: "backup",
      label: "백업 확인",
      checkpoint: args.document.backup,
      requiredWithinDays: 7,
      warnAfterDays: 7,
      missingNote: "최근 백업 위치와 생성 여부를 확인한 기록이 없습니다.",
      warningPrefix: "백업 확인 주기가 지났습니다.",
      successNote: "최근 백업 생성 여부와 저장 위치 확인 기록이 남아 있습니다."
    }),
    buildCheckpointCheck({
      key: "restore",
      label: "복구 리허설",
      checkpoint: args.document.restore,
      requiredWithinDays: 30,
      warnAfterDays: 30,
      missingNote: "복구 리허설 기록이 없습니다. 최소 1회는 실제 복구 과정을 리허설해야 합니다.",
      warningPrefix: "복구 리허설이 오래되었습니다.",
      successNote: "최근 복구 리허설 기록이 남아 있어 백업 복원 절차를 추적할 수 있습니다."
    }),
    buildCheckpointCheck({
      key: "rollback",
      label: "롤백 드릴",
      checkpoint: args.document.rollback,
      requiredWithinDays: 30,
      warnAfterDays: 30,
      missingNote: "스냅샷 롤백 드릴 기록이 없습니다. 배포 이상 시 되돌리기 절차를 먼저 검증하세요.",
      warningPrefix: "롤백 드릴이 오래되었습니다.",
      successNote: "최근 롤백 드릴 기록이 남아 있어 배포 사고 시 되돌리기 경로가 확인되었습니다."
    }),
    buildCheckpointCheck({
      key: "smoke",
      label: "배포 스모크",
      checkpoint: args.document.smoke,
      requiredWithinDays: 14,
      warnAfterDays: 14,
      missingNote: "배포 후 핵심 경로 스모크 체크 기록이 없습니다.",
      warningPrefix: "배포 스모크 체크 기록이 오래되었습니다.",
      successNote: "최근 배포 스모크 체크 기록이 남아 있어 핵심 사용자 경로가 검증되었습니다."
    })
  ];

  const failureCount = checks.filter((check) => check.status === "fail").length;
  const warningCount = checks.filter((check) => check.status === "warn").length;
  const passCount = checks.filter((check) => check.status === "pass").length;
  const status: OpsVerificationStatus = failureCount > 0 ? "blocked" : warningCount > 0 ? "monitor" : "ready";
  const blockers = checks.filter((check) => check.status !== "pass").map((check) => `${check.label}: ${check.note}`);
  const primaryActionCheck = checks.find((check) => check.status === "fail") ?? checks.find((check) => check.status === "warn");
  const summary =
    status === "blocked"
      ? "실운영 증빙이 비어 있어 공개 전 마지막 안전장치를 아직 통과하지 못했습니다."
      : status === "monitor"
        ? "운영 증빙은 있지만 오래된 항목이 있어 공개 전에 다시 점검하는 편이 안전합니다."
        : "스케줄러, 백업/복구, 롤백, 스모크 체크 증빙이 모두 최신 상태입니다.";

  return {
    status,
    label: getStatusLabel(status),
    summary,
    nextAction: getNextAction(primaryActionCheck),
    passCount,
    warningCount,
    failureCount,
    blockers,
    updatedAt: args.document.updatedAt,
    updatedBy: args.document.updatedBy,
    checks
  };
}
