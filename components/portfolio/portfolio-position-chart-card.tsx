"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  LineSeries,
  createChart,
  createSeriesMarkers,
  type BusinessDay,
  type IChartApi,
  type LineStyle
} from "lightweight-charts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPortfolioEntryEvent, getPortfolioEventLabel } from "@/lib/portfolio/position-detail";
import { formatPrice } from "@/lib/utils";
import type { AnalysisChartPointDto, RecommendationTradePlanDto } from "@/lib/api-contracts/swing-radar";
import type { PortfolioJournalGroup } from "@/lib/portfolio/journal-insights";

const MAX_POINTS = 60;
const EVENT_BADGE_HORIZONTAL_PADDING = 56;
const EVENT_BADGE_STACK_OFFSET = 30;

type EventBadgeTone = "positive" | "caution" | "negative";
type EventBadgePlacement = "above" | "below";

interface EventBadgeDefinition {
  id: string;
  date: string;
  time: BusinessDay;
  price: number;
  label: string;
  tone: EventBadgeTone;
  placement: EventBadgePlacement;
}

interface EventBadgePosition extends EventBadgeDefinition {
  x: number;
  y: number;
}

function toBusinessDay(value: string): BusinessDay | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3])
  };
}

function getCompletedTradingDayAnchor(anchor?: string | null) {
  const parsed = anchor ? new Date(anchor) : new Date();
  const base = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const date = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
  const weekday = date.getUTCDay();
  const offset = weekday === 1 ? 3 : weekday === 0 ? 2 : weekday === 6 ? 1 : 1;
  date.setUTCDate(date.getUTCDate() - offset);
  return date.toISOString().slice(0, 10);
}

function buildSyntheticDate(index: number, anchorDate?: string | null, generatedAt?: string | null) {
  const resolvedAnchor = anchorDate ?? getCompletedTradingDayAnchor(generatedAt);
  const anchor = new Date(`${resolvedAnchor}T00:00:00Z`);
  const date = new Date(anchor);
  date.setUTCDate(anchor.getUTCDate() - index);
  return date.toISOString().slice(0, 10);
}

function resolveChartDate(
  point: AnalysisChartPointDto,
  indexFromEnd: number,
  anchorDate?: string | null,
  generatedAt?: string | null
) {
  if (typeof point.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(point.date)) {
    return toBusinessDay(point.date) ?? toBusinessDay(buildSyntheticDate(indexFromEnd, anchorDate, generatedAt))!;
  }

  return toBusinessDay(buildSyntheticDate(indexFromEnd, anchorDate, generatedAt))!;
}

function toChartValue(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function buildReferenceLines(
  tradePlan?: RecommendationTradePlanDto | null,
  averagePrice?: number | null
) {
  return [
    {
      label: "평균 단가",
      value: typeof averagePrice === "number" && averagePrice > 0 ? averagePrice : undefined,
      color: "#8B6B2E",
      lineStyle: 0 as LineStyle
    },
    {
      label: "손절 기준",
      value: typeof tradePlan?.stopPrice === "number" ? tradePlan.stopPrice : undefined,
      color: "#C74A47",
      lineStyle: 2 as LineStyle
    },
    {
      label: "1차 목표",
      value: typeof tradePlan?.targetPrice === "number" ? tradePlan.targetPrice : undefined,
      color: "#C58A1B",
      lineStyle: 1 as LineStyle
    },
    {
      label: "진입 하단",
      value: typeof tradePlan?.entryPriceLow === "number" ? tradePlan.entryPriceLow : undefined,
      color: "#1F8A63",
      lineStyle: 3 as LineStyle
    },
    {
      label: "진입 상단",
      value: typeof tradePlan?.entryPriceHigh === "number" ? tradePlan.entryPriceHigh : undefined,
      color: "#1F8A63",
      lineStyle: 3 as LineStyle
    }
  ].filter((item): item is { label: string; value: number; color: string; lineStyle: LineStyle } => {
    return typeof item.value === "number" && Number.isFinite(item.value);
  });
}

function buildEventMarkers(
  group: PortfolioJournalGroup | null | undefined,
  availableDates: Set<string>
) {
  if (!group) {
    return [];
  }

  return [...group.events]
    .sort((left, right) => new Date(left.tradedAt).getTime() - new Date(right.tradedAt).getTime())
    .map((event) => {
      const date = event.tradedAt.slice(0, 10);
      if (!availableDates.has(date)) {
        return null;
      }

      const isBuy = event.type === "buy" || event.type === "add";
      const isTakeProfit = event.type === "take_profit_partial";
      const position: "belowBar" | "aboveBar" = isBuy ? "belowBar" : "aboveBar";
      const shape: "arrowUp" | "circle" | "arrowDown" = isBuy
        ? "arrowUp"
        : isTakeProfit
          ? "circle"
          : "arrowDown";

      return {
        time: toBusinessDay(date)!,
        position,
        color: isBuy ? "#1F8A63" : isTakeProfit ? "#C58A1B" : "#C74A47",
        shape
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

function buildEventBadgeDefinitions(
  group: PortfolioJournalGroup | null | undefined,
  availableDates: Set<string>
): EventBadgeDefinition[] {
  if (!group) {
    return [];
  }

  return [...group.events]
    .sort((left, right) => new Date(left.tradedAt).getTime() - new Date(right.tradedAt).getTime())
    .map((event) => {
      const date = event.tradedAt.slice(0, 10);
      if (!availableDates.has(date)) {
        return null;
      }

      const isBuy = event.type === "buy" || event.type === "add";
      const isTakeProfit = event.type === "take_profit_partial";

      return {
        id: `${event.type}-${event.tradedAt}-${event.price}-${event.quantity}`,
        date,
        time: toBusinessDay(date)!,
        price: event.price,
        label: getPortfolioEventLabel(event.type),
        tone: isBuy ? "positive" : isTakeProfit ? "caution" : "negative",
        placement: isBuy ? "below" : "above"
      };
    })
    .filter((item): item is EventBadgeDefinition => item !== null);
}

function clampBadgeX(x: number, width: number) {
  const horizontalPadding = Math.min(EVENT_BADGE_HORIZONTAL_PADDING, Math.max(24, width / 4));
  return Math.max(horizontalPadding, Math.min(width - horizontalPadding, x));
}

export function PortfolioPositionChartCard({
  company,
  chartPoints,
  journalGroup,
  tradePlan,
  averagePrice,
  generatedAt
}: {
  company: string;
  chartPoints: AnalysisChartPointDto[];
  journalGroup?: PortfolioJournalGroup | null;
  tradePlan?: RecommendationTradePlanDto | null;
  averagePrice?: number | null;
  generatedAt?: string | null;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [eventBadges, setEventBadges] = useState<EventBadgePosition[]>([]);

  const visiblePoints = useMemo(() => chartPoints.slice(-MAX_POINTS), [chartPoints]);
  const latestPoint = visiblePoints.at(-1);
  const firstEntryEvent = getPortfolioEntryEvent(journalGroup);

  useEffect(() => {
    if (!containerRef.current || !visiblePoints.length) {
      setEventBadges([]);
      return;
    }

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 360,
      layout: {
        background: { type: ColorType.Solid, color: "#fffdf8" },
        textColor: "#48505C",
        attributionLogo: false
      },
      grid: {
        vertLines: { color: "rgba(139, 107, 46, 0.08)" },
        horzLines: { color: "rgba(139, 107, 46, 0.08)" }
      },
      rightPriceScale: {
        borderColor: "rgba(139, 107, 46, 0.16)"
      },
      timeScale: {
        borderColor: "rgba(139, 107, 46, 0.16)",
        timeVisible: true,
        secondsVisible: false
      },
      crosshair: {
        vertLine: { color: "rgba(139, 107, 46, 0.18)" },
        horzLine: { color: "rgba(139, 107, 46, 0.18)" }
      }
    });

    const hasCandles = visiblePoints.some((point) => {
      return (
        point.open !== null &&
        point.high !== null &&
        point.low !== null &&
        Number.isFinite(point.open) &&
        Number.isFinite(point.high) &&
        Number.isFinite(point.low)
      );
    });

    const priceSeries = hasCandles
      ? chart.addSeries(CandlestickSeries, {
          upColor: "#1F8A63",
          downColor: "#C74A47",
          borderVisible: true,
          borderUpColor: "#1F8A63",
          borderDownColor: "#C74A47",
          wickUpColor: "#1F8A63",
          wickDownColor: "#C74A47"
        })
      : chart.addSeries(LineSeries, {
          color: "#243246",
          lineWidth: 3
        });

    const sma20Series = chart.addSeries(LineSeries, {
      color: "#C58A1B",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false
    });

    const ema20Series = chart.addSeries(LineSeries, {
      color: "#2C5B99",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false
    });

    const seriesData = visiblePoints.map((point, index) => {
      const time = resolveChartDate(point, visiblePoints.length - index - 1, latestPoint?.date ?? null, generatedAt);
      const previousClose = index > 0 ? visiblePoints[index - 1]?.close ?? point.close : point.close;
      const open = point.open ?? previousClose;
      const high = point.high ?? Math.max(open, point.close);
      const low = point.low ?? Math.min(open, point.close);

      return {
        time,
        open,
        high,
        low,
        close: point.close,
        sma20: toChartValue(point.sma20),
        ema20: toChartValue(point.ema20)
      };
    });

    if (hasCandles) {
      priceSeries.setData(
        seriesData.map((point) => ({
          time: point.time,
          open: point.open,
          high: point.high,
          low: point.low,
          close: point.close
        }))
      );
    } else {
      priceSeries.setData(seriesData.map((point) => ({ time: point.time, value: point.close })));
    }

    sma20Series.setData(
      seriesData.filter((point) => point.sma20 !== undefined).map((point) => ({ time: point.time, value: point.sma20! }))
    );
    ema20Series.setData(
      seriesData.filter((point) => point.ema20 !== undefined).map((point) => ({ time: point.time, value: point.ema20! }))
    );

    const referenceLines = buildReferenceLines(tradePlan, averagePrice);
    for (const line of referenceLines) {
      const series = chart.addSeries(LineSeries, {
        color: line.color,
        lineWidth: 2,
        lineStyle: line.lineStyle,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false
      });

      series.setData(seriesData.map((point) => ({ time: point.time, value: line.value })));
    }

    const availableDates = new Set(
      visiblePoints
        .map((point, index) => {
          const businessDay = resolveChartDate(point, visiblePoints.length - index - 1, latestPoint?.date ?? null, generatedAt);
          return `${businessDay.year}-${String(businessDay.month).padStart(2, "0")}-${String(businessDay.day).padStart(2, "0")}`;
        })
        .filter(Boolean)
    );

    const markers = buildEventMarkers(journalGroup, availableDates);
    if (markers.length) {
      createSeriesMarkers(priceSeries, markers);
    }

    const eventBadgeDefinitions = buildEventBadgeDefinitions(journalGroup, availableDates);

    const syncEventBadges = () => {
      if (!containerRef.current) {
        return;
      }

      const width = containerRef.current.clientWidth;
      const stackCounts = new Map<string, number>();
      const nextBadges = eventBadgeDefinitions
        .map((badge) => {
          const x = chart.timeScale().timeToCoordinate(badge.time);
          const y = priceSeries.priceToCoordinate(badge.price);

          if (x === null || y === null) {
            return null;
          }

          const stackKey = `${badge.date}:${badge.placement}`;
          const stackIndex = stackCounts.get(stackKey) ?? 0;
          stackCounts.set(stackKey, stackIndex + 1);

          return {
            ...badge,
            x: clampBadgeX(x, width),
            y:
              badge.placement === "above"
                ? y - stackIndex * EVENT_BADGE_STACK_OFFSET
                : y + stackIndex * EVENT_BADGE_STACK_OFFSET
          };
        })
        .filter((item): item is EventBadgePosition => item !== null);

      setEventBadges(nextBadges);
    };

    chart.timeScale().fitContent();
    requestAnimationFrame(syncEventBadges);
    chartRef.current = chart;

    const resizeObserver = new ResizeObserver(() => {
      if (!containerRef.current || !chartRef.current) {
        return;
      }

      chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      chartRef.current.timeScale().fitContent();
      requestAnimationFrame(syncEventBadges);
    });

    const handleVisibleRangeChange = () => {
      requestAnimationFrame(syncEventBadges);
    };

    chart.timeScale().subscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
    resizeObserver.observe(containerRef.current);

    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      setEventBadges([]);
    };
  }, [averagePrice, generatedAt, journalGroup, latestPoint?.date, tradePlan, visiblePoints]);

  if (!visiblePoints.length) {
    return (
      <Card className="border-border/80 bg-white/90 shadow-[0_22px_56px_-36px_rgba(24,32,42,0.24)]">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">가격 흐름과 체결 위치</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-[24px] border border-border/80 bg-[hsl(42_40%_97%)] px-5 py-10 text-sm leading-6 text-muted-foreground">
            {company} 가격 이력이 아직 충분하지 않아 포지션 차트를 준비하는 중입니다.
          </div>
        </CardContent>
      </Card>
    );
  }

  const metricItems = [
    { label: "최근 종가", value: latestPoint ? formatPrice(latestPoint.close) : "계산 중" },
    { label: "평균 단가", value: typeof averagePrice === "number" && averagePrice > 0 ? formatPrice(averagePrice) : "미기록" },
    { label: "첫 진입", value: firstEntryEvent ? formatPrice(firstEntryEvent.price) : "미기록" },
    {
      label: "현재 계획",
      value:
        typeof tradePlan?.stopPrice === "number" && typeof tradePlan?.targetPrice === "number"
          ? `${formatPrice(tradePlan.stopPrice)} / ${formatPrice(tradePlan.targetPrice)}`
          : "손절·목표 대기"
    }
  ];

  return (
    <Card className="border-border/80 bg-white/90 shadow-[0_22px_56px_-36px_rgba(24,32,42,0.24)]">
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg text-foreground">가격 흐름과 체결 위치</CardTitle>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              가격 흐름 위에 실제 체결 이벤트를 올려 놓고, 평균 단가와 손절·목표 기준을 함께 봅니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <LegendDot color="#243246" label="종가" />
            <LegendDot color="#C58A1B" label="20일선" />
            <LegendDot color="#2C5B99" label="20EMA" />
            <LegendDot color="#1F8A63" label="진입" />
            <LegendDot color="#C58A1B" label="익절" />
            <LegendDot color="#C74A47" label="종료" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-hidden rounded-[28px] border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,241,232,0.92))] p-3">
          <div className="relative h-[360px] w-full">
            <div ref={containerRef} className="h-full w-full" />
            <div className="pointer-events-none absolute inset-0">
              {eventBadges.map((badge) => (
                <div
                  key={badge.id}
                  className="absolute"
                  style={{
                    left: badge.x,
                    top: badge.y,
                    transform:
                      badge.placement === "above"
                        ? "translate(-50%, calc(-100% - 10px))"
                        : "translate(-50%, 10px)"
                  }}
                >
                  <div
                    className={[
                      "max-w-[128px] whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold shadow-[0_12px_24px_-18px_rgba(24,32,42,0.65)] backdrop-blur-sm",
                      badge.tone === "positive"
                        ? "border-positive/45 bg-[rgba(31,138,99,0.92)] text-white"
                        : badge.tone === "caution"
                          ? "border-caution/45 bg-[rgba(197,138,27,0.92)] text-white"
                          : "border-destructive/45 bg-[rgba(199,74,71,0.94)] text-white"
                    ].join(" ")}
                  >
                    {badge.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metricItems.map((item) => (
            <div
              key={item.label}
              className="rounded-[20px] border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(246,241,232,0.9))] px-4 py-4"
            >
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
              <p className="mt-2 text-sm font-semibold text-foreground">{item.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
