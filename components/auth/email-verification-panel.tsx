"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function EmailVerificationPanel({ token }: { token?: string | null }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    if (!token) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/email-verification/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ token })
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        throw new Error(payload.message ?? `이메일 검증을 완료하지 못했습니다. (${response.status})`);
      }

      setMessage("이메일 검증이 완료되었습니다.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "이메일 검증을 완료하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="border-border/70 bg-card/92 shadow-sm">
      <CardHeader className="space-y-3">
        <CardTitle>이메일 검증</CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">
          {token
            ? "아래 버튼으로 계정 이메일 검증을 완료할 수 있습니다."
            : "유효한 검증 링크로 다시 접속해 주세요."}
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

        <Button type="button" className="w-full" disabled={submitting || !token} onClick={() => void handleConfirm()}>
          검증 완료
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/?auth=login" className="font-medium text-foreground underline underline-offset-4">
            로그인 화면으로 돌아가기
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
