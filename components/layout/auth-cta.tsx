"use client";

import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";
import { Button } from "@/components/ui/button";
import type { AuthSession } from "@/types/auth";

export function AuthCta({
  session,
  compact = false,
  tone = "default"
}: {
  session: AuthSession | null;
  compact?: boolean;
  tone?: "default" | "light";
}) {
  const isLight = tone === "light";

  if (!session) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button
          asChild
          variant="secondary"
          size="sm"
          className={isLight ? "border-white/12 bg-white/8 text-white hover:bg-white/12" : undefined}
        >
          <Link href="/?auth=login">로그인 / 가입</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        className={
          isLight
            ? "rounded-full border border-white/12 bg-white/8 px-3 py-2 text-xs text-white/78 sm:text-sm"
            : "rounded-full border border-border/80 bg-white px-3 py-2 text-xs text-foreground/78 sm:text-sm"
        }
      >
        {compact ? session.user.displayName : `${session.user.displayName} · ${session.user.email}`}
      </div>
      <Button
        asChild
        variant="secondary"
        size="sm"
        className={isLight ? "border-white/12 bg-white/8 text-white hover:bg-white/12" : undefined}
      >
        <Link href="/account">내 계정</Link>
      </Button>
      <LogoutButton
        variant="ghost"
        size="sm"
        className={isLight ? "text-white/72 hover:bg-white/10 hover:text-white" : undefined}
      />
    </div>
  );
}
