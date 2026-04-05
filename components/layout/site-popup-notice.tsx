"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { BellRing, CalendarRange } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { publishPopupNoticeState } from "@/lib/popup-notice/popup-notice-events";

type PopupNoticePayload = {
  title: string;
  body: string;
  imageUrl: string | null;
  imageAlt: string | null;
  startAt: string | null;
  endAt: string | null;
  updatedAt: string;
  updatedBy: string;
  noticeKey: string;
};

const DISMISS_STORAGE_KEY = "swing-radar.popup-notice.dismiss";

function getSeoulDateKey() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function formatWindow(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function wasDismissedToday(noticeKey: string) {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const raw = window.localStorage.getItem(DISMISS_STORAGE_KEY);
    if (!raw) {
      return false;
    }

    const payload = JSON.parse(raw) as { noticeKey?: string; dismissedDate?: string };
    return payload.noticeKey === noticeKey && payload.dismissedDate === getSeoulDateKey();
  } catch {
    return false;
  }
}

function storeDismissal(noticeKey: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    DISMISS_STORAGE_KEY,
    JSON.stringify({
      noticeKey,
      dismissedDate: getSeoulDateKey()
    })
  );
}

export function SitePopupNotice() {
  const [notice, setNotice] = useState<PopupNoticePayload | null>(null);
  const [open, setOpen] = useState(false);
  const [hideForToday, setHideForToday] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    publishPopupNoticeState("loading");

    async function loadNotice() {
      try {
        const response = await fetch("/api/popup-notice", {
          cache: "no-store",
          signal: controller.signal
        });
        const json = (await response.json()) as { notice?: PopupNoticePayload | null };
        const nextNotice = json.notice ?? null;

        if (!nextNotice || wasDismissedToday(nextNotice.noticeKey)) {
          setNotice(null);
          setOpen(false);
          publishPopupNoticeState("closed");
          return;
        }

        setNotice(nextNotice);
        setOpen(true);
        setHideForToday(false);
        publishPopupNoticeState("open");
      } catch {
        // Ignore popup failures so site entry stays smooth.
        publishPopupNoticeState("closed");
      }
    }

    void loadNotice();

    return () => {
      controller.abort();
      publishPopupNoticeState("closed");
    };
  }, []);

  function closeNotice() {
    if (notice && hideForToday) {
      storeDismissal(notice.noticeKey);
    }

    setOpen(false);
    publishPopupNoticeState("closed");
  }

  if (!notice) {
    return null;
  }

  const startLabel = formatWindow(notice.startAt);
  const endLabel = formatWindow(notice.endAt);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          closeNotice();
          return;
        }

        setOpen(nextOpen);
        publishPopupNoticeState("open");
      }}
    >
      <DialogContent className="max-w-2xl overflow-hidden border-border/70 bg-white p-0 shadow-[0_28px_80px_hsl(28_32%_10%_/_0.24)]">
        <div className="relative overflow-hidden border-b border-border/70 bg-[radial-gradient(circle_at_top_left,hsl(43_56%_82%_/_0.45),transparent_34%),linear-gradient(180deg,hsl(41_55%_97%),hsl(37_35%_95%))] px-6 pb-6 pt-7 sm:px-8">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            <BellRing className="h-4 w-4 text-primary" />
            Popup Notice
          </div>
          <DialogHeader className="mt-4 space-y-3">
            <DialogTitle className="text-2xl leading-tight tracking-[-0.04em] text-foreground">
              {notice.title}
            </DialogTitle>
            <DialogDescription className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-white/80 px-3 py-1">
                <CalendarRange className="h-3.5 w-3.5" />
                {startLabel ?? "즉시"} ~ {endLabel ?? "직접 종료 전까지"}
              </span>
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-5 px-6 py-6 sm:px-8">
          {notice.imageUrl ? (
            <div className="overflow-hidden rounded-[30px] border border-border/70 bg-secondary/20">
              <img src={notice.imageUrl} alt={notice.imageAlt ?? notice.title} className="max-h-[320px] w-full object-cover" />
            </div>
          ) : null}

          <div className="space-y-3">
            {notice.body.split(/\n{2,}/).map((paragraph, index) => (
              <p key={`${index}-${paragraph}`} className="whitespace-pre-line text-sm leading-7 text-foreground/88 sm:text-[15px]">
                {paragraph}
              </p>
            ))}
          </div>

          <div className="flex flex-col gap-4 rounded-[28px] border border-border/70 bg-secondary/25 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-3 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={hideForToday}
                onChange={(event) => setHideForToday(event.target.checked)}
              />
              오늘 하루 이 공지 숨기기
            </label>
            <Button onClick={closeNotice}>닫기</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
