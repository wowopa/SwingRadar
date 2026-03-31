"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function AuthPanel({ nextHref = "/recommendations" }: { nextHref?: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupDisplayName, setSignupDisplayName] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState("");

  async function submit(path: string, body: Record<string, string>) {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
        code?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message ?? `요청에 실패했습니다. (${response.status})`);
      }

      setMessage(path.includes("signup") ? "계정을 만들고 바로 로그인했습니다." : "로그인했습니다.");
      router.push(nextHref);
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "인증 처리에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-border/70 bg-white/82 shadow-sm">
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-xl text-foreground">개인 계정 시작하기</CardTitle>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              로그인하면 내 자산, 내 보유, 내 포트폴리오 한도를 기준으로 행동 보드를 계산할 수 있습니다.
            </p>
          </div>
          <Badge variant="secondary">개인화 베타</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {message ? (
          <div className="rounded-2xl border border-primary/20 bg-primary/8 px-4 py-3 text-sm text-foreground/82">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <Tabs value={tab} onValueChange={(value) => setTab(value as "login" | "signup")}>
          <TabsList>
            <TabsTrigger value="login">로그인</TabsTrigger>
            <TabsTrigger value="signup">가입하기</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-4">
            <Field label="이메일">
              <Input
                type="email"
                value={loginEmail}
                placeholder="name@example.com"
                onChange={(event) => setLoginEmail(event.target.value)}
              />
            </Field>
            <Field label="비밀번호">
              <Input
                type="password"
                value={loginPassword}
                placeholder="8자 이상"
                onChange={(event) => setLoginPassword(event.target.value)}
              />
            </Field>
            <Button
              className="w-full"
              disabled={loading || !loginEmail.trim() || !loginPassword}
              onClick={() =>
                void submit("/api/auth/login", {
                  email: loginEmail,
                  password: loginPassword
                })
              }
            >
              로그인
            </Button>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4">
            <Field label="이름">
              <Input
                value={signupDisplayName}
                placeholder="홍길동"
                onChange={(event) => setSignupDisplayName(event.target.value)}
              />
            </Field>
            <Field label="이메일">
              <Input
                type="email"
                value={signupEmail}
                placeholder="name@example.com"
                onChange={(event) => setSignupEmail(event.target.value)}
              />
            </Field>
            <Field label="비밀번호">
              <Input
                type="password"
                value={signupPassword}
                placeholder="8자 이상"
                onChange={(event) => setSignupPassword(event.target.value)}
              />
            </Field>
            <Field label="비밀번호 확인">
              <Input
                type="password"
                value={signupPasswordConfirm}
                placeholder="같은 비밀번호를 한 번 더 입력"
                onChange={(event) => setSignupPasswordConfirm(event.target.value)}
              />
            </Field>
            <Button
              className="w-full"
              disabled={
                loading ||
                !signupEmail.trim() ||
                !signupDisplayName.trim() ||
                signupPassword.length < 8 ||
                signupPassword !== signupPasswordConfirm
              }
              onClick={() => {
                if (signupPassword !== signupPasswordConfirm) {
                  setError("비밀번호 확인이 맞지 않습니다.");
                  return;
                }

                void submit("/api/auth/signup", {
                  email: signupEmail,
                  displayName: signupDisplayName,
                  password: signupPassword
                });
              }}
            >
              계정 만들기
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}
