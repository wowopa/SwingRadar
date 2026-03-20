"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, History, Search, Sparkles } from "lucide-react";

import { Input } from "@/components/ui/input";

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

export function GlobalSymbolSearch() {
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
          ? "최근에 봤던 종목입니다. 다시 이어보거나 검색어를 입력해 다른 종목을 찾을 수 있습니다."
          : "검색어를 입력해 종목을 찾을 수 있습니다."
      );
      return () => {
        ignore = true;
      };
    }

    setMode("search");
    setDescription("티커, 종목명, 섹터 기준으로 최대 12개까지 보여드립니다.");

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
      <div className="rounded-[28px] border border-border/70 bg-white/88 p-2 shadow-panel backdrop-blur-xl">
        <div className="flex items-center gap-3 rounded-[22px] border border-border/60 bg-background/85 px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/70 text-foreground">
            <Search className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">종목 검색</p>
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
              placeholder="티커, 종목명, 섹터로 검색"
              className="h-auto border-0 bg-transparent px-0 pb-0 pt-1 text-base shadow-none focus-visible:ring-0"
            />
          </div>
          <div className="hidden rounded-full border border-border/70 bg-white px-3 py-1.5 text-xs text-muted-foreground sm:block">
            KRX 우선
          </div>
        </div>
      </div>

      {showDropdown ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.75rem)] z-[400] rounded-[28px] border border-border/80 bg-white p-2 shadow-[0_28px_60px_rgba(66,50,34,0.18)]">
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">
              {mode === "recent" ? <History className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
              {mode === "recent" ? "최근 검색" : "검색 결과"}
            </div>
            <p className="text-xs text-muted-foreground">{displayedItems.length}개</p>
          </div>
          <p className="px-3 pb-2 text-xs leading-5 text-muted-foreground">{description}</p>

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
                  }}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{item.company}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.ticker} / {item.market} / {item.sector}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
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
                  }}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{item.company}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.ticker} / {item.market} / {item.sector}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
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
      ) : null}
    </div>
  );
}
