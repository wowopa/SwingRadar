"use client";

import { useEffect, useState } from "react";
import { Clock3, LogOut, Search, Users } from "lucide-react";

import { MetricCard, formatDateTime } from "@/components/admin/dashboard-shared";
import type { AdminUsersPayload } from "@/components/admin/dashboard-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function UserPill({
  label,
  value,
  tone = "neutral"
}: {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "caution";
}) {
  const toneClass =
    tone === "positive"
      ? "border-positive/25 bg-positive/8 text-positive"
      : tone === "caution"
        ? "border-caution/25 bg-caution/10 text-caution"
        : "border-border/70 bg-white/70 text-foreground";

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${toneClass}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-2">{value}</span>
    </span>
  );
}

export function UsersTab({
  usersPayload,
  loading,
  onSearch,
  onResetSearch,
  onRevokeSessions
}: {
  usersPayload: AdminUsersPayload | null;
  loading: boolean;
  onSearch: (query: string) => void;
  onResetSearch: () => void;
  onRevokeSessions: (userId: string) => void;
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
            가입자 목록, 최근 활동, 활성 세션, 포트폴리오 설정 여부를 한 곳에서 보고 필요하면 세션을 초기화합니다.
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

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="가입자" value={String(summary?.totalUsers ?? 0)} note="현재 등록된 전체 계정 수" />
        <MetricCard label="최근 7일" value={String(summary?.recentSignups7d ?? 0)} note="최근 일주일 신규 가입" />
        <MetricCard label="활성 사용자" value={String(summary?.activeUsers ?? 0)} note="현재 세션이 살아 있는 계정" />
        <MetricCard
          label="활성 세션"
          value={String(summary?.activeSessions ?? 0)}
          note="가입자 전체 기준 활성 세션 수"
        />
        <MetricCard
          label="포트폴리오 설정"
          value={String(summary?.configuredPortfolios ?? 0)}
          note="자산/보유 설정이 존재하는 계정"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>가입자 목록</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length ? (
            items.map((user) => (
              <div key={user.id} className="rounded-[24px] border border-border/70 bg-secondary/45 p-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{user.displayName}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
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
                    </div>

                    <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                      <p>가입: {formatDateTime(user.createdAt)}</p>
                      <p>계정 수정: {formatDateTime(user.updatedAt)}</p>
                      <p>최근 활동: {user.lastActivityAt ? formatDateTime(user.lastActivityAt) : "세션 없음"}</p>
                      <p>포트폴리오 수정: {user.portfolioUpdatedAt ? formatDateTime(user.portfolioUpdatedAt) : "미설정"}</p>
                    </div>

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
              </div>
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
                세션 초기화는 해당 사용자의 현재 로그인만 해제합니다. 계정과 포트폴리오 데이터는 삭제되지 않습니다.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
