"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, KeyRound, MailCheck, ShieldAlert, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDateTimeShort } from "@/lib/utils";
import type { AuthUser } from "@/types/auth";

interface ActionPayload {
  message?: string;
  previewUrl?: string | null;
  alreadyVerified?: boolean;
  revokedOtherSessions?: number;
}

export function AccountLifecycleCard({
  user,
  supportEmail
}: {
  user: Pick<AuthUser, "email" | "emailVerifiedAt" | "passwordUpdatedAt">;
  supportEmail?: string | null;
}) {
  const [verificationLink, setVerificationLink] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [accountMessage, setAccountMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<"verify" | "password" | "delete" | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [nextPasswordConfirm, setNextPasswordConfirm] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  async function submit<T extends ActionPayload>(path: string, init: RequestInit) {
    const response = await fetch(path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {})
      }
    });
    const payload = (await response.json().catch(() => ({}))) as T;

    if (!response.ok) {
      throw new Error(payload.message ?? `요청을 처리하지 못했습니다. (${response.status})`);
    }

    return payload;
  }

  async function handleVerificationRequest() {
    setSubmitting("verify");
    setError(null);
    setAccountMessage(null);

    try {
      const payload = await submit<ActionPayload>("/api/account/email-verification", {
        method: "POST",
        body: JSON.stringify({})
      });

      setVerificationLink(payload.previewUrl ?? null);
      setAccountMessage(
        payload.alreadyVerified
          ? "이미 이메일 검증이 완료된 계정입니다."
          : payload.previewUrl
            ? "검증 링크를 생성했습니다."
            : "검증 링크를 준비했습니다. 실제 메일 발송 연동 전에는 운영 지원 채널을 함께 확인해 주세요."
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "이메일 검증 링크를 만들지 못했습니다.");
    } finally {
      setSubmitting(null);
    }
  }

  async function handlePasswordChange() {
    if (nextPassword !== nextPasswordConfirm) {
      setError("새 비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setSubmitting("password");
    setError(null);
    setPasswordMessage(null);

    try {
      const payload = await submit<ActionPayload>("/api/account/password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword,
          nextPassword
        })
      });

      setPasswordMessage(
        payload.revokedOtherSessions
          ? `비밀번호를 변경했고 다른 기기 세션 ${payload.revokedOtherSessions}개를 정리했습니다.`
          : "비밀번호를 변경했습니다."
      );
      setCurrentPassword("");
      setNextPassword("");
      setNextPasswordConfirm("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "비밀번호를 변경하지 못했습니다.");
    } finally {
      setSubmitting(null);
    }
  }

  async function handleDeleteAccount() {
    setSubmitting("delete");
    setError(null);
    setAccountMessage(null);

    try {
      await submit("/api/account/account", {
        method: "DELETE",
        body: JSON.stringify({
          password: deletePassword,
          confirmation: deleteConfirmation
        })
      });
      window.location.assign("/");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "계정을 삭제하지 못했습니다.");
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <Card className="border-border/70 bg-card/92 shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>계정 라이프사이클</CardTitle>
          <Badge variant={user.emailVerifiedAt ? "positive" : "caution"}>
            {user.emailVerifiedAt ? "이메일 검증 완료" : "이메일 검증 필요"}
          </Badge>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          이메일 검증, 비밀번호 관리, 데이터 내보내기, 계정 삭제까지 사용자가 직접 처리할 수 있게 정리했습니다.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {accountMessage ? (
          <div className="rounded-[22px] border border-primary/20 bg-primary/8 px-4 py-3 text-sm text-foreground/82">
            {accountMessage}
          </div>
        ) : null}
        {passwordMessage ? (
          <div className="rounded-[22px] border border-primary/20 bg-primary/8 px-4 py-3 text-sm text-foreground/82">
            {passwordMessage}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-[22px] border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <section className="rounded-[24px] border border-border/70 bg-secondary/18 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <MailCheck className="h-4 w-4 text-primary" />
                이메일 검증
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                {user.emailVerifiedAt
                  ? `${user.email} 계정은 ${formatDateTimeShort(user.emailVerifiedAt)} 기준으로 검증되어 있습니다.`
                  : `${user.email} 계정의 검증 링크를 다시 준비할 수 있습니다.`}
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={submitting !== null || Boolean(user.emailVerifiedAt)}
              onClick={() => void handleVerificationRequest()}
            >
              검증 링크 준비
            </Button>
          </div>

          {verificationLink ? (
            <div className="mt-3 rounded-[20px] border border-primary/18 bg-background/85 px-4 py-3 text-sm leading-6 text-muted-foreground">
              <p className="font-medium text-foreground">테스트/로컬용 검증 링크</p>
              <a className="mt-2 block break-all text-primary underline underline-offset-4" href={verificationLink}>
                {verificationLink}
              </a>
            </div>
          ) : null}

          {!verificationLink && !user.emailVerifiedAt && supportEmail ? (
            <p className="mt-3 text-xs leading-6 text-muted-foreground">
              메일 발송 연동 전에는 <span className="font-medium text-foreground">{supportEmail}</span> 운영 채널도 함께 안내하세요.
            </p>
          ) : null}
        </section>

        <section className="rounded-[24px] border border-border/70 bg-secondary/18 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <KeyRound className="h-4 w-4 text-primary" />
            비밀번호 변경
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            최근 변경 시각: {user.passwordUpdatedAt ? formatDateTimeShort(user.passwordUpdatedAt) : "기록 없음"}
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Input
              type="password"
              value={currentPassword}
              placeholder="현재 비밀번호"
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
            <Input
              type="password"
              value={nextPassword}
              placeholder="새 비밀번호"
              onChange={(event) => setNextPassword(event.target.value)}
            />
            <Input
              type="password"
              value={nextPasswordConfirm}
              placeholder="새 비밀번호 확인"
              onChange={(event) => setNextPasswordConfirm(event.target.value)}
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs leading-6 text-muted-foreground">
              비밀번호를 잊었을 때는 <Link href="/reset-password" className="text-primary underline underline-offset-4">재설정 페이지</Link>에서도 다시 받을 수 있습니다.
            </p>
            <Button
              type="button"
              disabled={
                submitting !== null ||
                !currentPassword ||
                nextPassword.length < 8 ||
                nextPassword !== nextPasswordConfirm
              }
              onClick={() => void handlePasswordChange()}
            >
              비밀번호 변경
            </Button>
          </div>
        </section>

        <section className="grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="rounded-[24px] border border-border/70 bg-secondary/18 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Download className="h-4 w-4 text-primary" />
              데이터 내보내기
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              계정, 포트폴리오, 저널, 리뷰, 개인 규칙 데이터를 JSON으로 내려받을 수 있습니다.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() => {
                window.location.assign("/api/account/export");
              }}
            >
              내보내기 다운로드
            </Button>
          </div>

          <div className="rounded-[24px] border border-destructive/20 bg-destructive/5 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <ShieldAlert className="h-4 w-4 text-destructive" />
              계정 삭제
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              계정과 연결된 세션, 포트폴리오 기록, 개인 규칙, 리뷰를 함께 지웁니다.
            </p>

            <div className="mt-4 grid gap-3">
              <Input
                type="password"
                value={deletePassword}
                placeholder="현재 비밀번호"
                onChange={(event) => setDeletePassword(event.target.value)}
              />
              <Input
                value={deleteConfirmation}
                placeholder='삭제 확인 문구 "DELETE" 입력'
                onChange={(event) => setDeleteConfirmation(event.target.value)}
              />
            </div>

            <Button
              type="button"
              variant="ghost"
              className="mt-4 text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={submitting !== null || !deletePassword || deleteConfirmation !== "DELETE"}
              onClick={() => void handleDeleteAccount()}
            >
              <Trash2 className="h-4 w-4" />
              계정 삭제
            </Button>
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
