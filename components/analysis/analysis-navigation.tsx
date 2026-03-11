"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, ChevronDown, History, Search } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ReadySymbol = {
  ticker: string;
  company: string;
  sector: string;
};

type AnalysisNavigationProps = {
  currentTicker: string;
  previous?: ReadySymbol;
  next?: ReadySymbol;
  readyItems: ReadySymbol[];
};

const STORAGE_KEY = "swing-radar.recent-analysis";
const MAX_RECENT_ITEMS = 5;

export function AnalysisNavigation({ currentTicker, previous, next, readyItems }: AnalysisNavigationProps) {
  const [recentTickers, setRecentTickers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [pickerFocused, setPickerFocused] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const parsed = readRecentTickers();
    const nextTickers = [currentTicker, ...parsed.filter((item) => item !== currentTicker)].slice(0, MAX_RECENT_ITEMS);

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextTickers));
    setRecentTickers(nextTickers);
  }, [currentTicker]);

  const recentItems = useMemo(() => {
    return recentTickers
      .filter((ticker) => ticker !== currentTicker)
      .map((ticker) => readyItems.find((item) => item.ticker === ticker))
      .filter((item): item is ReadySymbol => Boolean(item));
  }, [currentTicker, readyItems, recentTickers]);

  const filteredItems = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();

    return readyItems
      .filter((item) => {
        if (!normalized) {
          return true;
        }

        return (
          item.company.toLowerCase().includes(normalized) ||
          item.ticker.toLowerCase().includes(normalized) ||
          item.sector.toLowerCase().includes(normalized)
        );
      })
      .slice(0, 12);
  }, [readyItems, searchQuery]);

  return (
    <section className="relative z-20 mb-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Card className="relative z-20">
        <CardHeader>
          <CardTitle className="text-base text-foreground">분석 이동</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <NavigationLink
              href={previous ? `/analysis/${previous.ticker}` : undefined}
              title="이전 종목"
              label={previous ? `${previous.company} · ${previous.ticker}` : "이전 분석 종목이 없습니다."}
              note={previous?.sector ?? "현재 감시 종목 중 첫 번째 분석입니다."}
              icon={<ArrowLeft className="h-4 w-4" />}
              disabled={!previous}
            />
            <NavigationLink
              href={next ? `/analysis/${next.ticker}` : undefined}
              title="다음 종목"
              label={next ? `${next.company} · ${next.ticker}` : "다음 분석 종목이 없습니다."}
              note={next?.sector ?? "현재 감시 종목 중 마지막 분석입니다."}
              icon={<ArrowRight className="h-4 w-4" />}
              align="right"
              disabled={!next}
            />
          </div>

          <div className="rounded-2xl border border-border/70 bg-secondary/20 px-4 py-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <ChevronDown className="h-4 w-4" />
              종목 선택
            </div>
            <div className="relative mt-3">
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setPickerFocused(true);
                  }}
                  onInput={(event) => {
                    setSearchQuery((event.target as HTMLInputElement).value);
                    setPickerFocused(true);
                  }}
                  onCompositionStart={() => setIsComposing(true)}
                  onCompositionEnd={(event) => {
                    setIsComposing(false);
                    setSearchQuery(event.currentTarget.value);
                    setPickerFocused(true);
                  }}
                  onFocus={() => setPickerFocused(true)}
                  onBlur={() => setTimeout(() => setPickerFocused(false), 120)}
                  placeholder={`${readyItems.find((item) => item.ticker === currentTicker)?.company ?? ""} (${currentTicker}) 검색`}
                  className="h-12 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
                />
              </div>

              {(pickerFocused || searchQuery.trim().length > 0) && !isComposing && (
                <div className="absolute left-0 right-0 top-[calc(100%+0.75rem)] z-[280] rounded-2xl border border-border/80 bg-white p-2 shadow-[0_24px_48px_rgba(66,50,34,0.14)]">
                  <div className="flex items-center justify-between px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">검색 결과</p>
                    <p className="text-xs text-muted-foreground">{filteredItems.length}개</p>
                  </div>
                  {filteredItems.length ? (
                    <div className="space-y-1">
                      {filteredItems.map((item) => (
                        <button
                          key={item.ticker}
                          type="button"
                          onClick={() => {
                            setSearchQuery("");
                            setPickerFocused(false);
                            if (item.ticker !== currentTicker) {
                              router.push(`/analysis/${item.ticker}`);
                            }
                          }}
                          className={`flex w-full items-center justify-between rounded-[18px] px-4 py-3 text-left transition ${
                            item.ticker === currentTicker ? "bg-primary/8 text-primary" : "hover:bg-secondary/60"
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{item.company}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {item.ticker} · {item.sector}
                            </p>
                          </div>
                          <span className="ml-4 shrink-0 text-xs text-muted-foreground">
                            {item.ticker === currentTicker ? "현재" : "이동"}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-5 text-sm text-muted-foreground">일치하는 분석 종목이 없습니다.</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-foreground">
            <History className="h-4 w-4" />
            최근 본 종목
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentItems.length ? (
            recentItems.map((item) => (
              <Link
                key={item.ticker}
                href={`/analysis/${item.ticker}`}
                className="flex items-center justify-between rounded-2xl border border-border/70 bg-secondary/40 px-4 py-3 transition hover:border-primary/30 hover:bg-accent/50"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{item.company}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.ticker} · {item.sector}
                  </p>
                </div>
                <span className="text-xs text-primary">다시 보기</span>
              </Link>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/20 px-4 py-5 text-sm text-muted-foreground">
              최근에 열어본 다른 분석 종목이 아직 없습니다.
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function NavigationLink({
  href,
  title,
  label,
  note,
  icon,
  align = "left",
  disabled = false
}: {
  href?: string;
  title: string;
  label: string;
  note: string;
  icon: ReactNode;
  align?: "left" | "right";
  disabled?: boolean;
}) {
  const content = (
    <div
      className={[
        "rounded-2xl border px-4 py-4 transition",
        disabled
          ? "border-dashed border-border/70 bg-secondary/20 text-muted-foreground"
          : "border-border/70 bg-secondary/40 hover:border-primary/30 hover:bg-accent/50",
        align === "right" ? "text-right" : "text-left"
      ].join(" ")}
    >
      <div className={`mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.2em] ${align === "right" ? "justify-end" : ""}`}>
        {align === "left" ? icon : null}
        <span>{title}</span>
        {align === "right" ? icon : null}
      </div>
      <p className={`text-sm font-medium ${disabled ? "text-muted-foreground" : "text-foreground"}`}>{label}</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{note}</p>
    </div>
  );

  if (disabled || !href) {
    return content;
  }

  return <Link href={href}>{content}</Link>;
}

function readRecentTickers() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}
