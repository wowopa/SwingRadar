"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { PortfolioProfilePayload } from "@/components/admin/dashboard-types";
import { AccountPortfolioPanel } from "@/components/account/account-portfolio-panel";
import { PortfolioJournalBoard } from "@/components/portfolio/portfolio-journal-board";
import { PortfolioOverviewBoard } from "@/components/portfolio/portfolio-overview-board";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { HoldingActionBoardDto } from "@/lib/api-contracts/swing-radar";
import type { PortfolioJournal } from "@/types/recommendation";

export function PortfolioWorkspace({
  initialProfile,
  initialJournal,
  holdingActionBoard,
  initialSettingsOpen = false
}: {
  initialProfile: PortfolioProfilePayload;
  initialJournal: PortfolioJournal;
  holdingActionBoard?: HoldingActionBoardDto;
  initialSettingsOpen?: boolean;
}) {
  const [profile, setProfile] = useState(initialProfile);
  const [isSettingsOpen, setIsSettingsOpen] = useState(initialSettingsOpen);
  const [, startTransition] = useTransition();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function clearSettingsQuery() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("asset-settings");
    const nextHref = params.size ? `${pathname}?${params.toString()}` : pathname;
    router.replace(nextHref, { scroll: false });
  }

  function handleSaved(nextProfile: PortfolioProfilePayload) {
    setProfile(nextProfile);
    setIsSettingsOpen(false);
    if (searchParams.get("asset-settings") === "1") {
      clearSettingsQuery();
    }
    startTransition(() => {
      router.refresh();
    });
  }

  function handleSettingsOpenChange(nextOpen: boolean) {
    setIsSettingsOpen(nextOpen);
    if (!nextOpen && searchParams.get("asset-settings") === "1") {
      clearSettingsQuery();
    }
  }

  return (
    <>
      <PortfolioOverviewBoard
        profile={profile}
        holdingActionBoard={holdingActionBoard}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <PortfolioJournalBoard initialJournal={initialJournal} positions={profile.positions} />

      <Dialog open={isSettingsOpen} onOpenChange={handleSettingsOpenChange}>
        <DialogContent className="max-h-[88vh] overflow-y-auto border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(246,241,232,0.92))] shadow-[0_38px_110px_-44px_rgba(24,32,42,0.34)]">
          <DialogHeader>
            <DialogTitle>자산 설정</DialogTitle>
            <DialogDescription>
              총 자산, 가용 현금, 리스크 한도, 보유 종목을 이 팝업 안에서 바로 수정할 수 있습니다.
            </DialogDescription>
          </DialogHeader>

          <AccountPortfolioPanel initialProfile={profile} onSaved={handleSaved} saveButtonLabel="자산 저장" />
        </DialogContent>
      </Dialog>
    </>
  );
}
