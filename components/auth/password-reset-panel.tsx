"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function PasswordResetPanel({ token }: { token?: string | null }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleRequest() {
    setSubmitting(true);
    setError(null);
    setMessage(null);
    setPreviewUrl(null);

    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email })
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string; previewUrl?: string | null };

      if (!response.ok) {
        throw new Error(payload.message ?? `재설정 요청을 처리하지 못했습니다. (${response.status})`);
      }

      setMessage(payload.message ?? "재설정 링크를 준비했습니다.");
      setPreviewUrl(payload.previewUrl ?? null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "재설정 요청을 처리하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirm() {
    if (password !== passwordConfirm) {
      setError("새 비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          token,
          password
        })
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        throw new Error(payload.message ?? `비밀번호 재설정을 완료하지 못했습니다. (${response.status})`);
      }

      setMessage("비밀번호를 다시 설정했습니다. 이제 로그인 화면으로 돌아가실 수 있습니다.");
      setPassword("");
      setPasswordConfirm("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "비밀번호 재설정을 완료하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="border-border/70 bg-card/92 shadow-sm">
      <CardHeader className="space-y-3">
        <CardTitle>{token ? "새 비밀번호 설정" : "비밀번호 재설정 요청"}</CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">
          {token
            ? "링크가 유효한 동안 새 비밀번호를 설정할 수 있습니다."
            : "가입된 이메일을 입력하면 재설정 링크를 준비합니다."}
        </p>
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

        {token ? (
          <div className="space-y-3">
            <Input
              type="password"
              value={password}
              placeholder="새 비밀번호"
              onChange={(event) => setPassword(event.target.value)}
            />
            <Input
              type="password"
              value={passwordConfirm}
              placeholder="새 비밀번호 확인"
              onChange={(event) => setPasswordConfirm(event.target.value)}
            />
            <Button
              type="button"
              className="w-full"
              disabled={submitting || password.length < 8 || password !== passwordConfirm}
              onClick={() => void handleConfirm()}
            >
              비밀번호 재설정 완료
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Input
              type="email"
              value={email}
              placeholder="name@example.com"
              onChange={(event) => setEmail(event.target.value)}
            />
            <Button
              type="button"
              className="w-full"
              disabled={submitting || !email.trim()}
              onClick={() => void handleRequest()}
            >
              재설정 링크 요청
            </Button>
          </div>
        )}

        {previewUrl ? (
          <div className="rounded-[22px] border border-primary/16 bg-background/85 px-4 py-3 text-sm leading-6 text-muted-foreground">
            <p className="font-medium text-foreground">테스트/로컬용 재설정 링크</p>
            <a className="mt-2 block break-all text-primary underline underline-offset-4" href={previewUrl}>
              {previewUrl}
            </a>
          </div>
        ) : null}

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/?auth=login" className="font-medium text-foreground underline underline-offset-4">
            로그인 화면으로 돌아가기
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
