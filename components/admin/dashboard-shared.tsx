"use client";

import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Eye, RotateCcw, Save, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

import type {
  CuratedNewsImpact,
  EditorialDiffItem,
  PublishHistoryItem,
  UniverseReviewStatus,
  WatchlistChange,
  WatchlistEntry
} from "@/components/admin/dashboard-types";

export const IMPACT_OPTIONS: CuratedNewsImpact[] = ["긍정", "중립", "주의"];

export const APPROVAL_STAGE_OPTIONS = [
  { value: "editorial_review", label: "에디토리얼 검토" },
  { value: "risk_review", label: "리스크 검토" },
  { value: "final_publish", label: "최종 발행" }
] as const;

export const UNIVERSE_REVIEW_STATUS_OPTIONS: Array<{ value: UniverseReviewStatus; label: string }> = [
  { value: "new", label: "미검토" },
  { value: "reviewing", label: "검토 중" },
  { value: "hold", label: "보류" },
  { value: "promoted", label: "편입 완료" },
  { value: "rejected", label: "제외" }
];

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{label}</p>
      {children}
    </div>
  );
}

export function MetricCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-[24px] border border-border/70 bg-secondary/55 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{note}</p>
    </div>
  );
}

export function Banner({ tone, message }: { tone: "success" | "error"; message: string }) {
  const Icon = tone === "success" ? CheckCircle2 : AlertTriangle;
  const className =
    tone === "success"
      ? "border-positive/30 bg-positive/10 text-foreground"
      : "border-destructive/30 bg-destructive/10 text-foreground";

  return (
    <div className={`flex items-center gap-3 rounded-[24px] border p-4 text-sm ${className}`}>
      <Icon className="h-4 w-4" />
      <span>{message}</span>
    </div>
  );
}

export function buildWatchlistChanges(previous: WatchlistEntry, next: WatchlistEntry): WatchlistChange[] {
  const fields: Array<keyof WatchlistEntry> = [
    "sector",
    "newsQuery",
    "requiredKeywords",
    "contextKeywords",
    "blockedKeywords",
    "blockedDomains",
    "preferredDomains",
    "minArticleScore",
    "dartCorpCode"
  ];

  return fields.flatMap((field) => {
    const before = Array.isArray(previous[field]) ? previous[field].join(", ") : String(previous[field] ?? "");
    const after = Array.isArray(next[field]) ? next[field].join(", ") : String(next[field] ?? "");

    if (before === after) {
      return [];
    }

    return [{ field: String(field), before, after }];
  });
}

export function formatWatchlistField(field: string) {
  const labels: Record<string, string> = {
    sector: "섹터",
    newsQuery: "기본 뉴스 쿼리",
    requiredKeywords: "필수 키워드",
    contextKeywords: "문맥 키워드",
    blockedKeywords: "차단 키워드",
    blockedDomains: "차단 도메인",
    preferredDomains: "선호 도메인",
    minArticleScore: "최소 기사 점수",
    dartCorpCode: "DART 회사코드"
  };

  return labels[field] ?? field;
}

export function formatAuditEventType(eventType: string) {
  const labels: Record<string, string> = {
    admin_ingest: "관리자 적재",
    admin_login_attempt: "관리자 로그인 시도",
    health_warning: "상태 경고",
    admin_draft_saved: "초안 저장",
    admin_news_curation_saved: "뉴스 큐레이션 저장",
    popup_notice_saved: "팝업 공지 저장",
    admin_publish: "발행",
    watchlist_add: "watchlist 추가",
    watchlist_update: "watchlist 수정",
    universe_review_update: "유니버스 후보 검토",
    provider_fallback: "데이터 provider fallback"
  };

  return labels[eventType] ?? eventType;
}

export function formatApprovalStage(stage: string) {
  return APPROVAL_STAGE_OPTIONS.find((option) => option.value === stage)?.label ?? stage;
}

export function formatUniverseReviewStatus(status: UniverseReviewStatus) {
  return UNIVERSE_REVIEW_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

export function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function splitLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function createClientId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `news-${Date.now()}`;
}

export function PublishDialog({
  approvalStage,
  onApprovalStageChange,
  onConfirm,
  disabled
}: {
  approvalStage: (typeof APPROVAL_STAGE_OPTIONS)[number]["value"];
  onApprovalStageChange: (value: (typeof APPROVAL_STAGE_OPTIONS)[number]["value"]) => void;
  onConfirm: () => void;
  disabled: boolean;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button disabled={disabled}>
          <Send className="h-4 w-4" />
          발행 실행
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>발행 전 최종 확인</DialogTitle>
          <DialogDescription>선택한 승인 단계로 라이브 스냅샷과 Postgres를 함께 갱신합니다.</DialogDescription>
        </DialogHeader>
        <Field label="승인 단계">
          <select
            className="h-10 rounded-xl border border-border/70 bg-background px-3 text-sm text-foreground"
            value={approvalStage}
            onChange={(event) =>
              onApprovalStageChange(event.target.value as (typeof APPROVAL_STAGE_OPTIONS)[number]["value"])
            }
          >
            {APPROVAL_STAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex justify-end gap-3">
          <DialogClose asChild>
            <Button variant="outline">닫기</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button onClick={onConfirm}>발행 실행</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function DiffDialog({ item }: { item: EditorialDiffItem }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="h-4 w-4" />
          상세 보기
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {item.company} {item.ticker}
          </DialogTitle>
          <DialogDescription>발행 전 변경 상세입니다.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {item.details.map((detail) => (
            <div key={detail.field} className="rounded-[22px] border border-border/70 bg-secondary/45 p-4">
              <p className="text-sm font-semibold text-foreground">{detail.label}</p>
              <p className="mt-2 text-xs text-muted-foreground">이전값: {detail.before || "(empty)"}</p>
              <p className="mt-1 text-xs text-primary">현재값: {detail.after || "(empty)"}</p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function HistoryDialog({ item }: { item: PublishHistoryItem }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="h-4 w-4" />
          이력 상세
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>발행 이력 상세</DialogTitle>
          <DialogDescription>
            {formatDateTime(item.publishedAt)} | {formatApprovalStage(item.approvalStage)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {item.changes.length ? (
            item.changes.map((change) => (
              <div key={change.ticker} className="rounded-[22px] border border-border/70 bg-secondary/45 p-4">
                <p className="text-sm font-semibold text-foreground">
                  {change.company} {change.ticker}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{change.changes.join(", ")}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">기록된 변경 종목이 없습니다.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function RollbackDialog({
  item,
  reason,
  onReasonChange,
  onConfirm,
  disabled
}: {
  item: PublishHistoryItem;
  reason: string;
  onReasonChange: (value: string) => void;
  onConfirm: () => void;
  disabled: boolean;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <RotateCcw className="h-4 w-4" />
          롤백
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>롤백 확인</DialogTitle>
          <DialogDescription>{formatDateTime(item.publishedAt)} 발행 시점으로 라이브 스냅샷을 되돌립니다.</DialogDescription>
        </DialogHeader>
        <Field label="롤백 사유">
          <Textarea value={reason} onChange={(event) => onReasonChange(event.target.value)} />
        </Field>
        <div className="flex justify-end gap-3">
          <DialogClose asChild>
            <Button variant="outline">닫기</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button onClick={onConfirm} disabled={disabled || reason.trim().length < 3}>
              롤백 실행
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function WatchlistPreviewDialog({
  changes,
  disabled,
  onConfirm
}: {
  changes: WatchlistChange[];
  disabled: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button disabled={disabled}>
          <Save className="h-4 w-4" />
          변경 미리보기
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>watchlist 변경 검토</DialogTitle>
          <DialogDescription>현재 입력 내용과 마지막 저장 상태를 비교합니다.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {changes.length ? (
            changes.map((change) => (
              <div key={change.field} className="rounded-[22px] border border-border/70 bg-secondary/45 p-4">
                <p className="text-sm font-semibold text-foreground">{formatWatchlistField(change.field)}</p>
                <p className="mt-2 text-xs text-muted-foreground">이전값: {change.before || "(empty)"}</p>
                <p className="mt-1 text-xs text-primary">현재값: {change.after || "(empty)"}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">저장할 변경점이 없습니다.</p>
          )}
        </div>
        <div className="flex justify-end gap-3">
          <DialogClose asChild>
            <Button variant="outline">닫기</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button disabled={disabled || !changes.length} onClick={onConfirm}>
              저장 실행
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
