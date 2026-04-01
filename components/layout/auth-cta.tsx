"use client";

import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";
import { Button } from "@/components/ui/button";
import type { AuthSession } from "@/types/auth";

export function AuthCta({ session }: { session: AuthSession | null }) {
  if (!session) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="secondary" size="sm">
          <Link href="/?auth=login">로그인 / 가입</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="rounded-full border border-border/80 bg-white px-3 py-2 text-xs text-foreground/78 sm:text-sm">
        {session.user.displayName} · {session.user.email}
      </div>
      <Button asChild variant="secondary" size="sm">
        <Link href="/account">내 계정</Link>
      </Button>
      <LogoutButton variant="ghost" size="sm" />
    </div>
  );
}
