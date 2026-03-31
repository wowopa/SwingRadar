"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

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
  holdingActionBoard
}: {
  initialProfile: PortfolioProfilePayload;
  initialJournal: PortfolioJournal;
  holdingActionBoard?: HoldingActionBoardDto;
}) {
  const [profile, setProfile] = useState(initialProfile);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  function handleSaved(nextProfile: PortfolioProfilePayload) {
    setProfile(nextProfile);
    setIsSettingsOpen(false);
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <>
      <PortfolioOverviewBoard
        profile={profile}
        holdingActionBoard={holdingActionBoard}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <PortfolioJournalBoard initialJournal={initialJournal} positions={profile.positions} />

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>자산 설정</DialogTitle>
            <DialogDescription>
              총 자산, 가용 현금, 손실 한도, 보유 종목을 이 팝업 안에서 바로 수정할 수 있습니다.
            </DialogDescription>
          </DialogHeader>

          <AccountPortfolioPanel initialProfile={profile} onSaved={handleSaved} saveButtonLabel="자산 저장" />
        </DialogContent>
      </Dialog>
    </>
  );
}
