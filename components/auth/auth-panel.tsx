"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AuthPanel({
  nextHref = "/recommendations",
  initialMode = "login"
}: {
  nextHref?: string;
  initialMode?: "login" | "signup";
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupDisplayName, setSignupDisplayName] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState("");

  useEffect(() => {
    setMode(initialMode);
    setMessage(null);
    setError(null);
  }, [initialMode]);

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

      setMessage(path.includes("signup") ? "회원가입 후 바로 로그인했습니다." : "로그인했습니다.");
      router.push(nextHref);
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "인증 처리에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-4">
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

      {mode === "login" ? (
        <div className="space-y-4">
          <Field label="ID">
            <Input
              type="email"
              value={loginEmail}
              placeholder="name@example.com"
              onChange={(event) => setLoginEmail(event.target.value)}
            />
          </Field>
          <Field label="PW">
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
          <p className="text-center text-sm text-muted-foreground">
            계정이 없으신가요?{" "}
            <button
              type="button"
              className="font-medium text-foreground underline underline-offset-4"
              onClick={() => {
                setMode("signup");
                setError(null);
                setMessage(null);
              }}
            >
              회원가입하기
            </button>
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <Field label="이름">
            <Input
              value={signupDisplayName}
              placeholder="홍길동"
              onChange={(event) => setSignupDisplayName(event.target.value)}
            />
          </Field>
          <Field label="ID">
            <Input
              type="email"
              value={signupEmail}
              placeholder="name@example.com"
              onChange={(event) => setSignupEmail(event.target.value)}
            />
          </Field>
          <Field label="PW">
            <Input
              type="password"
              value={signupPassword}
              placeholder="8자 이상"
              onChange={(event) => setSignupPassword(event.target.value)}
            />
          </Field>
          <Field label="PW 확인">
            <Input
              type="password"
              value={signupPasswordConfirm}
              placeholder="비밀번호를 한 번 더 입력해 주세요"
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
            회원가입
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            이미 계정이 있으신가요?{" "}
            <button
              type="button"
              className="font-medium text-foreground underline underline-offset-4"
              onClick={() => {
                setMode("login");
                setError(null);
                setMessage(null);
              }}
            >
              로그인하기
            </button>
          </p>
        </div>
      )}
    </section>
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
