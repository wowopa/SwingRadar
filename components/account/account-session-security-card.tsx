"use client";

import { useEffect, useMemo, useState } from "react";
import { LaptopMinimal, LogOut, RefreshCcw, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTimeShort } from "@/lib/utils";
import type { AccountSessionItem } from "@/types/auth";

interface SessionsPayload {
  sessions?: AccountSessionItem[];
  message?: string;
}

export function AccountSessionSecurityCard({ sessionExpiresAt }: { sessionExpiresAt: string }) {
  const [sessions, setSessions] = useState<AccountSessionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadSessions(showSpinner = false) {
    if (showSpinner) {
      setIsLoading(true);
    }

    setError(null);

    try {
      const response = await fetch("/api/account/sessions", {
        cache: "no-store"
      });
      const payload = (await response.json().catch(() => ({}))) as SessionsPayload;

      if (!response.ok || !payload.sessions) {
        throw new Error(payload.message ?? `세션 목록을 불러오지 못했습니다. (${response.status})`);
      }

      setSessions(payload.sessions);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "세션 목록을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  async function submit(body: Record<string, string>) {
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/account/sessions", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      const payload = (await response.json().catch(() => ({}))) as SessionsPayload & { removedCount?: number };

      if (!response.ok || !payload.sessions) {
        throw new Error(payload.message ?? `세션 정리에 실패했습니다. (${response.status})`);
      }

      setSessions(payload.sessions);
      setMessage(
        body.scope === "others"
          ? payload.removedCount
            ? `다른 기기 세션 ${payload.removedCount}개를 해제했습니다.`
            : "정리할 다른 기기 세션이 없습니다."
          : "선택한 세션을 해제했습니다."
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "세션 정리에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    void loadSessions(true);
  }, []);

  const otherSessions = useMemo(() => sessions.filter((session) => !session.isCurrent), [sessions]);

  return (
    <Card data-tutorial="account-security" className="border-border/70 bg-card/92 shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>보안과 로그인 세션</CardTitle>
              <Badge variant="secondary">활성 {sessions.length}개</Badge>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              현재 브라우저와 다른 기기에서 살아 있는 세션을 확인하고, 필요하면 바로 해제할 수 있습니다.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void loadSessions(true)} disabled={isSubmitting}>
              <RefreshCcw className="h-3.5 w-3.5" />
              새로고침
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void submit({ scope: "others" })}
              disabled={isSubmitting || !otherSessions.length}
            >
              <LogOut className="h-3.5 w-3.5" />
              다른 기기 로그아웃
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {message ? (
          <div className="rounded-[22px] border border-primary/20 bg-primary/8 px-4 py-3 text-sm text-foreground/82">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-[22px] border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-[24px] border border-border/70 bg-secondary/24 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              로그인 보호
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              같은 브라우저·네트워크 조합에서 로그인 실패가 15분 동안 5회를 넘으면 잠시 보호 잠금이 걸립니다.
            </p>
          </div>

          <div className="rounded-[24px] border border-border/70 bg-secondary/24 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <LaptopMinimal className="h-4 w-4 text-primary" />
              현재 세션 만료
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{formatDateTimeShort(sessionExpiresAt)}까지 유지됩니다.</p>
          </div>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <div className="rounded-[24px] border border-border/70 bg-secondary/18 px-4 py-4 text-sm text-muted-foreground">
              세션 목록을 불러오는 중입니다.
            </div>
          ) : (
            sessions.map((session) => (
              <div key={session.sessionId} className="rounded-[24px] border border-border/70 bg-background/80 px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{session.clientLabel}</p>
                      {session.isCurrent ? <Badge variant="positive">현재 사용 중</Badge> : <Badge variant="secondary">다른 기기</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>시작 {formatDateTimeShort(session.createdAt)}</span>
                      <span>최근 갱신 {formatDateTimeShort(session.updatedAt)}</span>
                      <span>만료 {formatDateTimeShort(session.expiresAt)}</span>
                    </div>
                  </div>

                  {!session.isCurrent ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isSubmitting}
                      onClick={() => void submit({ scope: "session", sessionId: session.sessionId })}
                    >
                      세션 해제
                    </Button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
