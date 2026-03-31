"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { AuthPanel } from "@/components/auth/auth-panel";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function buildHref(pathname: string, searchParams: URLSearchParams) {
  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function PublicAuthDialog() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const authMode = searchParams.get("auth");
  const nextCandidate = searchParams.get("next");

  const mode = authMode === "signup" ? "signup" : authMode === "login" ? "login" : null;
  const nextHref = nextCandidate && nextCandidate.startsWith("/") && !nextCandidate.startsWith("//")
    ? nextCandidate
    : "/recommendations";

  const open = Boolean(mode);

  const cleanHref = useMemo(() => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("auth");
    nextParams.delete("next");
    return buildHref(pathname, nextParams);
  }, [pathname, searchParams]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          router.replace(cleanHref, { scroll: false });
        }
      }}
    >
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{mode === "signup" ? "회원가입" : "로그인"}</DialogTitle>
          <DialogDescription>
            계정 정보를 입력하면 팝업 안에서 바로 {mode === "signup" ? "가입" : "로그인"}을 진행할 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        <AuthPanel nextHref={nextHref} initialMode={mode ?? "login"} />
      </DialogContent>
    </Dialog>
  );
}
