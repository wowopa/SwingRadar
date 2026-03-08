"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useState } from "react";
import { ArrowUpRight, Search, Sparkles } from "lucide-react";

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
};

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

export function GlobalSymbolSearch() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SearchItem[]>([]);
  const [focused, setFocused] = useState(false);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    let ignore = false;

    async function load() {
      const search = deferredQuery.trim();
      const url = search ? `/api/symbols?q=${encodeURIComponent(search)}&limit=12` : "/api/symbols?limit=12";
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as SearchResponse;
      if (!ignore) {
        setItems(payload.items);
      }
    }

    void load();

    return () => {
      ignore = true;
    };
  }, [deferredQuery]);

  const showDropdown = focused && (query.trim().length > 0 || items.length > 0);

  return (
    <div className="relative z-[120] w-full">
      <div className="rounded-[28px] border border-border/70 bg-white/88 p-2 shadow-panel backdrop-blur-xl">
        <div className="flex items-center gap-3 rounded-[22px] border border-border/60 bg-background/85 px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/70 text-foreground">
            <Search className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">종목 검색</p>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 120)}
              placeholder="티커, 종목명, 별칭, 섹터로 검색"
              className="h-auto border-0 bg-transparent px-0 pb-0 pt-1 text-base shadow-none focus-visible:ring-0"
            />
          </div>
          <div className="hidden rounded-full border border-border/70 bg-white px-3 py-1.5 text-xs text-muted-foreground sm:block">
            KRX 우선
          </div>
        </div>
      </div>

      {showDropdown ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.75rem)] z-[140] rounded-[28px] border border-border/80 bg-white p-2 shadow-[0_28px_60px_rgba(66,50,34,0.18)]">
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              검색 결과
            </div>
            <p className="text-xs text-muted-foreground">{items.length}개</p>
          </div>

          {items.length ? (
            items.map((item) =>
              item.status === "ready" ? (
                <Link
                  key={item.ticker}
                  href={`/analysis/${item.ticker}`}
                  className="block rounded-[22px] px-4 py-3 transition hover:bg-secondary/72"
                  onClick={() => setQuery("")}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{item.company}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.ticker} · {item.market} · {item.sector}
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
                  onClick={() => setQuery("")}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{item.company}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.ticker} · {item.market} · {item.sector}
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
