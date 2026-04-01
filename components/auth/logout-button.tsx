"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

import { Button, type ButtonProps } from "@/components/ui/button";

export function LogoutButton({
  children = "로그아웃",
  onLoggedOut,
  ...props
}: ButtonProps & { onLoggedOut?: () => void; children?: ReactNode }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", {
      method: "POST"
    });
    onLoggedOut?.();
    router.push("/");
    router.refresh();
  }

  return (
    <Button {...props} onClick={() => void logout()}>
      {children}
    </Button>
  );
}
