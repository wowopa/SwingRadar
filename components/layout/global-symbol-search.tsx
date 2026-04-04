"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, History, Search, Sparkles } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SearchItem = {
  ticker: string;
  company: string;
  sector: string;
  market: "KOSPI" | "KOSDAQ" | "NYSE" | "NASDAQ" | "AMEX";
  status: "ready" | "pending";
};

type SearchResponse = {
  items: SearchItem[];
  query: string;
  mode: "search" | "featured";
  description: string;
  limit: number;
};

const RECENT_SEARCH_STORAGE_KEY = "swing-radar.recent-symbol-searches";
const MAX_RECENT_SEARCHES = 6;

function isSearchItem(value: unknown): value is SearchItem {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<SearchItem>;
  return (
    typeof candidate.ticker === "string" &&
    typeof candidate.company === "string" &&
    typeof candidate.sector === "string" &&
    typeof candidate.market === "string" &&
    typeof candidate.status === "string"
  );
}

function StatusBadge({ status }: { status: SearchItem["status"] }) {
  if (status === "ready") {
    return (
      <span className="rounded-full border border-primary/15 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
        분석 가능
      </span>
    );
  }

  return (
    <span className="rounded-full border border-border/80 bg-secondary/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
      준비 중
    </span>
  );
}

function readRecentSearches() {
  try {
    const raw = window.localStorage.getItem(RECENT_SEARCH_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isSearchItem) : [];
  } catch {
    return [];
  }
}

function writeRecentSearches(items: SearchItem[]) {
  window.localStorage.setItem(RECENT_SEARCH_STORAGE_KEY, JSON.stringify(items.slice(0, MAX_RECENT_SEARCHES)));
}

export function GlobalSymbolSearch({ compact = false }: { compact?: boolean }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SearchItem[]>([]);
  const [recentItems, setRecentItems] = useState<SearchItem[]>([]);
  const [description, setDescription] = useState("최근에 확인한 종목을 다시 이어볼 수 있습니다.");
  const [mode, setMode] = useState<"search" | "recent">("recent");
  const [focused, setFocused] = useState(false);
  const [isComposing, setIsComposing] = useState(false);

  useEffect(() => {
    setRecentItems(readRecentSearches());
  }, []);

  useEffect(() => {
    let ignore = false;
    const search = query.trim();

    if (!search) {
      setItems([]);
      setMode("recent");
      setDescription(
        recentItems.length
          ? "최근에 보던 종목입니다. 다시 이어보거나 검색어를 입력해 다른 종목을 찾을 수 있습니다."
          : "검색어를 입력해 종목을 찾을 수 있습니다."
      );
      return () => {
        ignore = true;
      };
    }

    setMode("search");
    setDescription("티커, 종목명, 섹터 기준으로 관련 종목을 보여드립니다.");

    async function load() {
      const response = await fetch(`/api/symbols?q=${encodeURIComponent(search)}&limit=12`, { cache: "no-store" });
      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as SearchResponse;
      if (!ignore) {
        setItems(payload.items);
        setDescription(payload.description);
      }
    }

    void load();

    return () => {
      ignore = true;
    };
  }, [query, recentItems.length]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setFocused(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setFocused(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const displayedItems = query.trim() ? items : recentItems;
  const showDropdown = focused && !isComposing && (Boolean(query.trim()) || recentItems.length > 0);

  function rememberItem(item: SearchItem) {
    const nextRecentItems = [item, ...recentItems.filter((recent) => recent.ticker !== item.ticker)].slice(0, MAX_RECENT_SEARCHES);
    setRecentItems(nextRecentItems);
    writeRecentSearches(nextRecentItems);
  }

  return (
    <div ref={containerRef} className="relative z-[220] w-full">
      <div
        className={cn(
          "flex items-center gap-3 border border-border/60 bg-background/85 backdrop-blur-xl",
          compact
            ? "rounded-[18px] px-3 py-2 shadow-[0_16px_36px_-28px_rgba(24,32,42,0.3)]"
            : "rounded-[22px] px-4 py-3 shadow-panel"
        )}
      >
        <div
          className={cn(
            "flex items-center justify-center rounded-full bg-accent/70 text-foreground",
            compact ? "h-8 w-8" : "h-10 w-10"
          )}
        >
          <Search className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        </div>
        <div className="min-w-0 flex-1">
          {!compact ? <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">종목 검색</p> : null}
          <Input
            value={inputValue}
            onChange={(event) => {
              const nextValue = event.target.value;
              setInputValue(nextValue);
              if (!isComposing) {
                setQuery(nextValue);
              }
              setFocused(true);
            }}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={(event) => {
              setIsComposing(false);
              const nextValue = event.currentTarget.value;
              setInputValue(nextValue);
              setQuery(nextValue);
              setFocused(true);
            }}
            onFocus={() => setFocused(true)}
            placeholder={compact ? "티커, 종목명 검색" : "티커, 종목명, 섹터로 검색"}
            className={cn(
              "h-auto border-0 bg-transparent px-0 shadow-none focus-visible:ring-0",
              compact ? "pb-0 pt-0 text-sm" : "pb-0 pt-1 text-base"
            )}
          />
        </div>
        <div
          className={cn(
            "hidden rounded-full border border-border/70 bg-white text-xs text-muted-foreground sm:block",
            compact ? "px-2.5 py-1" : "px-3 py-1.5"
          )}
        >
          KRX 우선
        </div>
      </div>

      {showDropdown ? (
        <>
          <button
            type="button"
            aria-label="검색 결과 닫기"
            className="fixed inset-0 z-[360] bg-[rgba(24,32,42,0.06)] sm:hidden"
            onClick={() => setFocused(false)}
          />
          <div
            className={cn(
              "z-[400] rounded-[28px] border border-border/80 bg-white p-2 shadow-[0_28px_60px_rgba(66,50,34,0.18)]",
              compact
                ? "fixed left-3 right-3 top-[5.35rem] max-h-[min(70vh,34rem)] overflow-y-auto sm:absolute sm:left-0 sm:right-0 sm:top-[calc(100%+0.75rem)] sm:max-h-[32rem]"
                : "absolute left-0 right-0 top-[calc(100%+0.75rem)]"
            )}
          >
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">
                {mode === "recent" ? <History className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                {mode === "recent" ? "최근 검색" : "검색 결과"}
              </div>
              <p className="text-xs text-muted-foreground">{displayedItems.length}개</p>
            </div>
            <p className="px-3 pb-2 text-xs leading-5 text-muted-foreground sm:hidden">
              {query.trim() ? "관련 종목을 선택해 바로 이동하세요." : "최근에 본 종목을 다시 열 수 있습니다."}
            </p>
            <p className="hidden px-3 pb-2 text-xs leading-5 text-muted-foreground sm:block">{description}</p>

            {displayedItems.length ? (
              displayedItems.map((item) =>
                item.status === "ready" ? (
                  <Link
                    key={item.ticker}
                    href={`/analysis/${item.ticker}`}
                    className="block rounded-[22px] px-4 py-3 transition hover:bg-secondary/72"
                    onClick={() => {
                      rememberItem(item);
                      setInputValue("");
                      setQuery("");
                      setFocused(false);
                    }}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{item.company}</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {item.ticker} / {item.market} / {item.sector}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
                        <StatusBadge status={item.status} />
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                          분석 보기
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>
                  </Link>
                ) : (
                  <Link
                    key={item.ticker}
                    href={`/admin?tab=watchlist&q=${encodeURIComponent(item.ticker)}&returnTo=${encodeURIComponent(`/analysis/${item.ticker}`)}`}
                    className="block rounded-[22px] px-4 py-3 transition hover:bg-secondary/72"
                    onClick={() => {
                      rememberItem(item);
                      setInputValue("");
                      setQuery("");
                      setFocused(false);
                    }}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{item.company}</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {item.ticker} / {item.market} / {item.sector}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
                        <StatusBadge status={item.status} />
                        <span className="text-xs font-medium text-primary">운영에 추가</span>
                      </div>
                    </div>
                  </Link>
                )
              )
            ) : (
              <div className="px-4 py-6 text-sm text-muted-foreground">일치하는 종목이 없습니다.</div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
