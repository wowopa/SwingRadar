"use client";

import { useEffect, useState } from "react";
import { Clock3, LogOut, Search, ShieldAlert, Trash2, Users } from "lucide-react";

import { MetricCard, formatDateTime } from "@/components/admin/dashboard-shared";
import type { AdminUserItemPayload, AdminUsersPayload } from "@/components/admin/dashboard-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

function UserPill({
  label,
  value,
  tone = "neutral"
}: {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "caution" | "destructive";
}) {
  const toneClass =
    tone === "positive"
      ? "border-positive/25 bg-positive/8 text-positive"
      : tone === "caution"
        ? "border-caution/25 bg-caution/10 text-caution"
        : tone === "destructive"
          ? "border-destructive/25 bg-destructive/8 text-destructive"
          : "border-border/70 bg-white/70 text-foreground";

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${toneClass}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-2">{value}</span>
    </span>
  );
}

interface UserDraftState {
  email: string;
  displayName: string;
  adminNote: string;
  suspendDays: number;
}

function UserManagementCard({
  user,
  loading,
  onRevokeSessions,
  onUpdateUser,
  onSuspendUser,
  onClearSuspension,
  onDeleteUser
}: {
  user: AdminUserItemPayload;
  loading: boolean;
  onRevokeSessions: (userId: string) => void;
  onUpdateUser: (input: { userId: string; email: string; displayName: string; adminNote: string }) => void;
  onSuspendUser: (input: { userId: string; days: number; adminNote: string }) => void;
  onClearSuspension: (userId: string) => void;
  onDeleteUser: (userId: string) => void;
}) {
  const [draft, setDraft] = useState<UserDraftState>({
    email: user.email,
    displayName: user.displayName,
    adminNote: user.adminNote ?? "",
    suspendDays: 7
  });

  useEffect(() => {
    setDraft({
      email: user.email,
      displayName: user.displayName,
      adminNote: user.adminNote ?? "",
      suspendDays: 7
    });
  }, [user.email, user.displayName, user.adminNote]);

  return (
    <div className="rounded-[24px] border border-border/70 bg-secondary/45 p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-foreground">{user.displayName}</p>
            <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <UserPill
              label="계정 상태"
              value={user.status === "suspended" ? "정지" : "정상"}
              tone={user.status === "suspended" ? "destructive" : "positive"}
            />
            <UserPill
              label="활성 세션"
              value={`${user.activeSessionCount}개`}
              tone={user.activeSessionCount > 0 ? "positive" : "neutral"}
            />
            <UserPill
              label="포트폴리오"
              value={user.portfolioConfigured ? `${user.portfolioPositionCount}종목` : "미설정"}
              tone={user.portfolioConfigured ? "positive" : "caution"}
            />
            <UserPill label="저널" value={`${user.journalEventCount}건`} />
            <UserPill label="회고" value={`${user.closeReviewCount}건`} />
          </div>

          <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
            <p>가입: {formatDateTime(user.createdAt)}</p>
            <p>계정 수정: {formatDateTime(user.updatedAt)}</p>
            <p>최근 활동: {user.lastActivityAt ? formatDateTime(user.lastActivityAt) : "세션 없음"}</p>
            <p>포트폴리오 수정: {user.portfolioUpdatedAt ? formatDateTime(user.portfolioUpdatedAt) : "미설정"}</p>
          </div>

          {user.status === "suspended" && user.suspendedUntil ? (
            <div className="rounded-[20px] border border-destructive/25 bg-destructive/8 p-3 text-xs text-destructive">
              {user.suspendedUntil.slice(0, 10)}까지 계정 정지 상태입니다.
            </div>
          ) : null}

          {user.adminNote ? (
            <div className="rounded-[20px] border border-border/70 bg-white/70 p-3 text-xs text-muted-foreground">
              운영 메모: {user.adminNote}
            </div>
          ) : null}

          <p className="text-[11px] text-muted-foreground">{user.id}</p>
        </div>

        <div className="flex flex-wrap gap-2 xl:justify-end">
          <Button
            variant="outline"
            size="sm"
            disabled={loading || user.activeSessionCount === 0}
            onClick={() => onRevokeSessions(user.id)}
          >
            <LogOut className="h-4 w-4" />
            세션 초기화
          </Button>
        </div>
      </div>

      <details className="mt-4 rounded-[22px] border border-border/60 bg-white/80">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-foreground">계정 관리 펼치기</summary>
        <div className="space-y-4 border-t border-border/60 px-4 py-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">이메일</p>
              <Input value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">이름</p>
              <Input
                value={draft.displayName}
                onChange={(event) => setDraft((current) => ({ ...current, displayName: event.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">운영 메모</p>
            <Textarea
              value={draft.adminNote}
              onChange={(event) => setDraft((current) => ({ ...current, adminNote: event.target.value }))}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={loading}
              onClick={() =>
                onUpdateUser({
                  userId: user.id,
                  email: draft.email,
                  displayName: draft.displayName,
                  adminNote: draft.adminNote
                })
              }
            >
              계정 수정 저장
            </Button>
          </div>

          <div className="rounded-[20px] border border-border/70 bg-secondary/35 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <ShieldAlert className="h-4 w-4" />
              계정 정지
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-[160px_1fr]">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">정지 기간 (일)</p>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={draft.suspendDays}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      suspendDays: Number(event.target.value) > 0 ? Number(event.target.value) : 1
                    }))
                  }
                />
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={loading}
                  onClick={() =>
                    onSuspendUser({
                      userId: user.id,
                      days: draft.suspendDays,
                      adminNote: draft.adminNote
                    })
                  }
                >
                  {draft.suspendDays}일 정지
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={loading || user.status !== "suspended"}
                  onClick={() => onClearSuspension(user.id)}
                >
                  정지 해제
                </Button>
              </div>
            </div>
          </div>

          {user.recentSessions.length ? (
            <div className="rounded-[20px] border border-border/70 bg-secondary/35 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Clock3 className="h-4 w-4" />
                최근 세션
              </div>
              <div className="mt-3 space-y-2">
                {user.recentSessions.map((session) => (
                  <div key={session.id} className="rounded-[16px] border border-border/60 bg-white/70 p-3 text-xs text-muted-foreground">
                    <p>{session.id}</p>
                    <p className="mt-1">활동: {formatDateTime(session.updatedAt)}</p>
                    <p className="mt-1">만료: {formatDateTime(session.expiresAt)}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="rounded-[20px] border border-destructive/20 bg-destructive/5 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Trash2 className="h-4 w-4 text-destructive" />
              계정 삭제
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              계정을 삭제하면 세션, 포트폴리오, 저널, 회고, 개인 규칙, 장초 기록이 함께 제거됩니다.
            </p>
            <div className="mt-3">
              <Button
                size="sm"
                variant="outline"
                className="border-destructive/25 text-destructive hover:bg-destructive/8"
                disabled={loading}
                onClick={() => {
                  if (window.confirm(`${user.email} 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
                    onDeleteUser(user.id);
                  }
                }}
              >
                계정 삭제
              </Button>
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}

export function UsersTab({
  usersPayload,
  loading,
  onSearch,
  onResetSearch,
  onRevokeSessions,
  onUpdateUser,
  onSuspendUser,
  onClearSuspension,
  onDeleteUser
}: {
  usersPayload: AdminUsersPayload | null;
  loading: boolean;
  onSearch: (query: string) => void;
  onResetSearch: () => void;
  onRevokeSessions: (userId: string) => void;
  onUpdateUser: (input: { userId: string; email: string; displayName: string; adminNote: string }) => void;
  onSuspendUser: (input: { userId: string; days: number; adminNote: string }) => void;
  onClearSuspension: (userId: string) => void;
  onDeleteUser: (userId: string) => void;
}) {
  const [query, setQuery] = useState(usersPayload?.query ?? "");

  useEffect(() => {
    setQuery(usersPayload?.query ?? "");
  }, [usersPayload?.query]);

  const items = usersPayload?.items ?? [];
  const summary = usersPayload?.summary;

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>가입자 관리</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-6 text-muted-foreground">
            가입자 목록, 최근 활동, 활성 세션, 포트폴리오 설정 여부를 한 곳에서 보고 필요하면 세션 초기화, 계정 수정, 정지, 삭제까지 처리합니다.
          </p>

          <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
            <Input
              value={query}
              placeholder="이메일, 이름, 사용자 ID 검색"
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  onSearch(query);
                }
              }}
            />
            <Button variant="secondary" onClick={() => onSearch(query)} disabled={loading}>
              <Search className="h-4 w-4" />
              검색
            </Button>
            <Button variant="outline" onClick={onResetSearch} disabled={loading || !usersPayload?.query}>
              전체 보기
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard label="가입자" value={String(summary?.totalUsers ?? 0)} note="현재 등록된 전체 계정 수" />
        <MetricCard label="최근 7일" value={String(summary?.recentSignups7d ?? 0)} note="최근 일주일 신규 가입" />
        <MetricCard label="활성 사용자" value={String(summary?.activeUsers ?? 0)} note="현재 세션이 살아 있는 계정" />
        <MetricCard label="활성 세션" value={String(summary?.activeSessions ?? 0)} note="가입자 전체 기준 활성 세션 수" />
        <MetricCard label="포트폴리오 설정" value={String(summary?.configuredPortfolios ?? 0)} note="자산/보유 설정이 존재하는 계정" />
        <MetricCard label="정지 계정" value={String(summary?.suspendedUsers ?? 0)} note="현재 정지 중인 계정 수" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>가입자 목록</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length ? (
            items.map((user) => (
              <UserManagementCard
                key={user.id}
                user={user}
                loading={loading}
                onRevokeSessions={onRevokeSessions}
                onUpdateUser={onUpdateUser}
                onSuspendUser={onSuspendUser}
                onClearSuspension={onClearSuspension}
                onDeleteUser={onDeleteUser}
              />
            ))
          ) : (
            <div className="rounded-[24px] border border-border/70 bg-secondary/35 p-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <Users className="h-4 w-4" />
                검색 결과가 없습니다
              </div>
              <p className="mt-2 leading-6">검색어를 지우고 전체 가입자 목록을 다시 보거나 다른 이메일/이름으로 검색해 보세요.</p>
            </div>
          )}

          {items.length > 0 ? (
            <div className="rounded-[24px] border border-border/70 bg-secondary/35 p-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <Clock3 className="h-4 w-4" />
                운영 참고
              </div>
              <p className="mt-2 leading-6">
                세션 초기화는 현재 로그인만 해제합니다. 계정 삭제만 사용자 포트폴리오/저널/회고/장초 기록까지 함께 정리합니다.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
