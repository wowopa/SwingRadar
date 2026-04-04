"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import type { PortfolioProfilePayload } from "@/components/admin/dashboard-types";
import { AccountPortfolioPanel } from "@/components/account/account-portfolio-panel";
import { PortfolioJournalBoard } from "@/components/portfolio/portfolio-journal-board";
import { PortfolioOverviewBoard } from "@/components/portfolio/portfolio-overview-board";
import { PortfolioPerformanceBoard } from "@/components/portfolio/portfolio-performance-board";
import { PortfolioReviewsBoard } from "@/components/portfolio/portfolio-reviews-board";
import {
  PortfolioTradeEventDialog,
  type PortfolioTradeEventDialogPreset
} from "@/components/portfolio/portfolio-trade-event-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { HoldingActionBoardDto } from "@/lib/api-contracts/swing-radar";
import type { UserOpeningRecheckScanSnapshot } from "@/lib/server/user-opening-recheck-board";
import type {
  PortfolioCloseReviewEntry,
  PortfolioJournal,
  PortfolioPersonalRuleEntry,
  PortfolioTradeEvent,
  PortfolioTradeEventType
} from "@/types/recommendation";

type PortfolioWorkspaceTab = "holdings" | "journal" | "reviews" | "performance";
const PORTFOLIO_WORKSPACE_TABS: PortfolioWorkspaceTab[] = ["holdings", "journal", "reviews", "performance"];

function isPortfolioWorkspaceTab(value: string | null | undefined): value is PortfolioWorkspaceTab {
  return Boolean(value && PORTFOLIO_WORKSPACE_TABS.includes(value as PortfolioWorkspaceTab));
}

type PortfolioTradeFollowUp = {
  ticker: string;
  company: string;
  headline: string;
  detail: string;
  highlightTab: PortfolioWorkspaceTab;
  highlightLabel: string;
  savedEventId?: string;
  editPreset?: PortfolioTradeEventDialogPreset | null;
  previousJournal?: PortfolioJournal;
  previousProfile?: PortfolioProfilePayload;
};

function buildTradeEditPreset({
  event,
  previousProfile
}: {
  event: PortfolioTradeEvent;
  previousProfile?: PortfolioProfilePayload;
}) {
  const previousPosition = previousProfile?.positions.find((item) => item.ticker === event.ticker);

  return {
    title: `${event.company} 기록 수정`,
    description: "방금 기록을 되돌린 뒤 같은 값으로 다시 열었습니다. 필요한 부분만 빠르게 고쳐 저장하세요.",
    saveButtonLabel: "수정 저장",
    ticker: event.ticker,
    company: event.company,
    sector: event.sector,
    type: event.type,
    quantity: event.quantity,
    price: event.price,
    fees: event.fees ?? 0,
    tradedAt: new Date(event.tradedAt).toISOString().slice(0, 16),
    note: event.note ?? "",
    syncProfilePosition: true,
    maxQuantity: previousPosition?.quantity,
    lockTicker: true,
    lockType: true
  } satisfies PortfolioTradeEventDialogPreset;
}

function buildTradeFollowUp({
  ticker,
  company,
  type
}: {
  ticker: string;
  company: string;
  type: PortfolioTradeEventType;
}): PortfolioTradeFollowUp {
  if (type === "take_profit_partial") {
    return {
      ticker,
      company,
      headline: `${company} 부분 익절을 기록했습니다.`,
      detail: "상세 차트에서 이벤트 마커를 확인하고 Journal에서 체결 흐름을 이어서 보세요.",
      highlightTab: "journal",
      highlightLabel: "Journal 보기"
    };
  }

  if (type === "stop_loss") {
    return {
      ticker,
      company,
      headline: `${company} 손절을 기록했습니다.`,
      detail: "종료 회고와 종료 패턴이 Reviews 탭에 바로 반영됐습니다. 상세 차트에서도 마지막 체결을 확인할 수 있습니다.",
      highlightTab: "reviews",
      highlightLabel: "Reviews 보기"
    };
  }

  if (type === "exit_full" || type === "manual_exit") {
    return {
      ticker,
      company,
      headline: `${company} 종료 기록을 저장했습니다.`,
      detail: "종료 회고와 성과 패턴을 Reviews에서 바로 확인하고, 상세 차트에서 마지막 체결 위치도 함께 볼 수 있습니다.",
      highlightTab: "reviews",
      highlightLabel: "Reviews 보기"
    };
  }

  return {
    ticker,
    company,
    headline: `${company} 체결을 기록했습니다.`,
    detail: "상세 차트와 Journal에서 방금 기록한 흐름을 이어서 확인해 보세요.",
    highlightTab: "journal",
    highlightLabel: "Journal 보기"
  };
}

export function PortfolioWorkspace({
  initialProfile,
  initialJournal,
  openingCheckScans,
  closeReviews,
  personalRules,
  holdingActionBoard,
  initialSettingsOpen = false
}: {
  initialProfile: PortfolioProfilePayload;
  initialJournal: PortfolioJournal;
  openingCheckScans: UserOpeningRecheckScanSnapshot[];
  closeReviews: Record<string, PortfolioCloseReviewEntry>;
  personalRules: PortfolioPersonalRuleEntry[];
  holdingActionBoard?: HoldingActionBoardDto;
  initialSettingsOpen?: boolean;
}) {
  const [profile, setProfile] = useState(initialProfile);
  const [journal, setJournal] = useState(initialJournal);
  const [isSettingsOpen, setIsSettingsOpen] = useState(initialSettingsOpen);
  const [quickTradePreset, setQuickTradePreset] = useState<PortfolioTradeEventDialogPreset | null>(null);
  const [activeTab, setActiveTab] = useState<PortfolioWorkspaceTab>("holdings");
  const [tradeFollowUp, setTradeFollowUp] = useState<PortfolioTradeFollowUp | null>(null);
  const [, startTransition] = useTransition();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");

  useEffect(() => {
    setProfile(initialProfile);
  }, [initialProfile]);

  useEffect(() => {
    setJournal(initialJournal);
  }, [initialJournal]);

  function clearSettingsQuery() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("asset-settings");
    const nextHref = params.size ? `${pathname}?${params.toString()}` : pathname;
    router.replace(nextHref, { scroll: false });
  }

  function updateWorkspaceQuery(nextTab: PortfolioWorkspaceTab) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextTab === "holdings") {
      params.delete("tab");
    } else {
      params.set("tab", nextTab);
    }

    const nextHref = params.size ? `${pathname}?${params.toString()}` : pathname;
    router.replace(nextHref, { scroll: false });
  }

  useEffect(() => {
    if (!isPortfolioWorkspaceTab(requestedTab)) {
      return;
    }

    setActiveTab(requestedTab);
  }, [requestedTab]);

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

  async function revertLatestTrade(followUp: PortfolioTradeFollowUp) {
    if (!followUp.savedEventId || !followUp.previousJournal) {
      return false;
    }

    const response = await fetch("/api/account/portfolio-journal", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId: followUp.savedEventId,
        journal: followUp.previousJournal,
        profile: followUp.previousProfile
      })
    });

    const payload = (await response.json().catch(() => ({}))) as {
      message?: string;
      journal?: PortfolioJournal;
      profile?: PortfolioProfilePayload;
    };

    if (!response.ok || !payload.journal) {
      throw new Error(payload.message ?? "방금 기록을 되돌리지 못했습니다.");
    }

    setJournal(payload.journal);
    if (payload.profile) {
      setProfile(payload.profile);
    } else if (followUp.previousProfile) {
      setProfile(followUp.previousProfile);
    }

    startTransition(() => {
      router.refresh();
    });

    return true;
  }

  async function handleReopenRecentTrade() {
    if (!tradeFollowUp?.editPreset) {
      return;
    }

    const nextPreset = tradeFollowUp.editPreset;
    const reverted = await revertLatestTrade(tradeFollowUp);
    if (!reverted) {
      return;
    }

    setTradeFollowUp(null);
    setQuickTradePreset(nextPreset);
  }

  async function handleUndoRecentTrade() {
    if (!tradeFollowUp) {
      return;
    }

    const reverted = await revertLatestTrade(tradeFollowUp);
    if (!reverted) {
      return;
    }

    setTradeFollowUp({
      ticker: tradeFollowUp.ticker,
      company: tradeFollowUp.company,
      headline: `${tradeFollowUp.company} 마지막 체결을 되돌렸습니다.`,
      detail: "방금 기록은 저널과 포트폴리오에서 제거되었습니다. 필요하면 다시 기록해 주세요.",
      highlightTab: "holdings",
      highlightLabel: "Holdings 보기"
    });
  }

  function handleTradeSaved(payload: {
    event: PortfolioTradeEvent;
    journal: PortfolioJournal;
    profile?: PortfolioProfilePayload;
    previousJournal?: PortfolioJournal;
    previousProfile?: PortfolioProfilePayload;
  }) {
    const savedEvent = payload.event;
    setJournal(payload.journal);
    if (payload.profile) {
      setProfile(payload.profile);
    }

    if (savedEvent) {
      const fallbackCompany =
        profile.positions.find((item) => item.ticker === savedEvent.ticker)?.company ?? savedEvent.company;
      const followUp = buildTradeFollowUp({
        ticker: savedEvent.ticker,
        company: quickTradePreset?.company ?? fallbackCompany,
        type: savedEvent.type
      });
      setTradeFollowUp({
        ...followUp,
        savedEventId: savedEvent.id,
        previousJournal: payload.previousJournal,
        previousProfile: payload.previousProfile,
        editPreset: buildTradeEditPreset({
          event: savedEvent,
          previousProfile: payload.previousProfile
        })
      });
      setActiveTab(followUp.highlightTab);
      updateWorkspaceQuery(followUp.highlightTab);
    }

    setQuickTradePreset(null);
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
      <div className="space-y-5">
        {tradeFollowUp ? (
          <div className="rounded-[28px] border border-primary/24 bg-[linear-gradient(180deg,rgba(139,107,46,0.08),rgba(255,255,255,0.94))] px-5 py-4 shadow-[0_18px_44px_-34px_rgba(24,32,42,0.18)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="neutral">방금 기록</Badge>
                  <Badge variant="secondary">{tradeFollowUp.ticker}</Badge>
                </div>
                <p className="text-sm font-semibold text-foreground">{tradeFollowUp.headline}</p>
                <p className="text-sm leading-6 text-muted-foreground">{tradeFollowUp.detail}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button asChild size="sm">
                  <Link href={`/portfolio/${tradeFollowUp.ticker}`}>상세 차트 보기</Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActiveTab(tradeFollowUp.highlightTab);
                    updateWorkspaceQuery(tradeFollowUp.highlightTab);
                  }}
                >
                  {tradeFollowUp.highlightLabel}
                </Button>
                {tradeFollowUp.editPreset ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => void handleReopenRecentTrade()}>
                    방금 기록 수정
                  </Button>
                ) : null}
                {tradeFollowUp.savedEventId ? (
                  <Button type="button" variant="ghost" size="sm" onClick={() => void handleUndoRecentTrade()}>
                    되돌리기
                  </Button>
                ) : null}
                <Button type="button" variant="ghost" size="sm" onClick={() => setTradeFollowUp(null)}>
                  닫기
                </Button>
              </div>
            </div>
          </div>
        ) : null}

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          const nextTab = value as PortfolioWorkspaceTab;
          setActiveTab(nextTab);
          updateWorkspaceQuery(nextTab);
        }}
        className="space-y-5"
      >
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
          <TabsTrigger value="performance" className="min-w-[120px]">
            Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="holdings" className="mt-0">
          <PortfolioOverviewBoard
            profile={profile}
            holdingActionBoard={holdingActionBoard}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onQuickTradeAction={setQuickTradePreset}
          />
        </TabsContent>

        <TabsContent value="journal" className="mt-0">
          <PortfolioJournalBoard
            journal={journal}
            positions={profile.positions}
            currentProfile={profile}
            view="journal"
            focusTicker={tradeFollowUp?.highlightTab === "journal" ? tradeFollowUp.ticker : null}
            onJournalUpdated={handleTradeSaved}
          />
        </TabsContent>

        <TabsContent value="reviews" className="mt-0">
          <PortfolioReviewsBoard
            journal={journal}
            openingCheckScans={openingCheckScans}
            closeReviews={closeReviews}
            personalRules={personalRules}
            focusTicker={tradeFollowUp?.highlightTab === "reviews" ? tradeFollowUp.ticker : null}
          />
        </TabsContent>

        <TabsContent value="performance" className="mt-0">
          <PortfolioPerformanceBoard
            journal={journal}
            openingCheckScans={openingCheckScans}
            closeReviews={closeReviews}
            personalRules={personalRules}
          />
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

      <PortfolioTradeEventDialog
        open={Boolean(quickTradePreset)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setQuickTradePreset(null);
          }
        }}
        positions={profile.positions}
        recentEvents={journal.events}
        currentJournal={journal}
        currentProfile={profile}
        preset={quickTradePreset}
        onSaved={handleTradeSaved}
      />
      </div>
    </>
  );
}
