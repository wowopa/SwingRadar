"use client";

import Link from "next/link";
import { LogIn, UserRound } from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { Button } from "@/components/ui/button";
import type { AuthSession } from "@/types/auth";

export function AuthCta({
  session,
  compact = false,
  tone = "default",
  iconOnly = false,
  hideLogout = false
}: {
  session: AuthSession | null;
  compact?: boolean;
  tone?: "default" | "light";
  iconOnly?: boolean;
  hideLogout?: boolean;
}) {
  const isLight = tone === "light";

  if (iconOnly) {
    const label = session ? "내 계정" : "로그인 / 가입";
    const href = session ? "/account" : "/?auth=login";
    const Icon = session ? UserRound : LogIn;

    return (
      <Button
        asChild
        variant="secondary"
        size="sm"
        className={
          isLight
            ? "h-9 w-9 rounded-full border-white/14 bg-white/10 p-0 text-white hover:bg-white/14 sm:h-10 sm:w-10"
            : "h-9 w-9 rounded-full p-0 sm:h-10 sm:w-10"
        }
      >
        <Link href={href} aria-label={label} title={label}>
          <Icon className="h-4 w-4" />
        </Link>
      </Button>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center gap-2">
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
    <div className={compact ? "flex items-center gap-1.5" : "flex items-center gap-2"}>
      <Button
        asChild
        variant="secondary"
        size="sm"
        className={isLight ? "border-white/14 bg-white/10 text-white hover:bg-white/14" : undefined}
      >
        <Link href="/account">내 계정</Link>
      </Button>
      {hideLogout ? null : (
        <LogoutButton
          variant="ghost"
          size="sm"
          className={isLight ? "text-white/88 hover:bg-white/10 hover:text-white" : undefined}
        />
      )}
    </div>
  );
}
