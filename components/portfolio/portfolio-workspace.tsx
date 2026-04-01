"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { PortfolioProfilePayload } from "@/components/admin/dashboard-types";
import { AccountPortfolioPanel } from "@/components/account/account-portfolio-panel";
import { PortfolioJournalBoard } from "@/components/portfolio/portfolio-journal-board";
import { PortfolioOverviewBoard } from "@/components/portfolio/portfolio-overview-board";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
      <Tabs defaultValue="holdings" className="space-y-5">
        <TabsList className="w-full justify-start gap-1 overflow-x-auto rounded-[24px] border border-border/80 bg-white/90 p-1.5 shadow-[0_18px_44px_-34px_rgba(24,32,42,0.22)] sm:w-auto">
          <TabsTrigger value="holdings" className="min-w-[120px]">
            Holdings
          </TabsTrigger>
          <TabsTrigger value="journal" className="min-w-[120px]">
            Journal
          </TabsTrigger>
          <TabsTrigger value="reviews" className="min-w-[120px]">
            Reviews
          </TabsTrigger>
        </TabsList>

        <TabsContent value="holdings" className="mt-0">
          <PortfolioOverviewBoard
            profile={profile}
            holdingActionBoard={holdingActionBoard}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        </TabsContent>

        <TabsContent value="journal" className="mt-0">
          <PortfolioJournalBoard initialJournal={initialJournal} positions={profile.positions} view="journal" />
        </TabsContent>

        <TabsContent value="reviews" className="mt-0">
          <PortfolioJournalBoard initialJournal={initialJournal} positions={profile.positions} view="reviews" />
        </TabsContent>
      </Tabs>

      <Dialog open={isSettingsOpen} onOpenChange={handleSettingsOpenChange}>
        <DialogContent className="max-h-[88vh] overflow-y-auto border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(246,241,232,0.92))] shadow-[0_38px_110px_-44px_rgba(24,32,42,0.34)]">
          <DialogHeader>
            <DialogTitle>자산 설정</DialogTitle>
            <DialogDescription>총 자산, 가용 현금, 리스크 한도, 보유 종목을 한 번에 수정합니다.</DialogDescription>
          </DialogHeader>

          <AccountPortfolioPanel initialProfile={profile} onSaved={handleSaved} saveButtonLabel="자산 저장" />
        </DialogContent>
      </Dialog>
    </>
  );
}
