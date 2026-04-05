"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Flag, Plus, ShieldX, Target, type LucideIcon } from "lucide-react";
import {
  CandlestickSeries,
  ColorType,
  LineSeries,
  createChart,
  type BusinessDay,
  type IChartApi,
  type LineStyle
} from "lightweight-charts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalysisChartPointDto, RecommendationTradePlanDto } from "@/lib/api-contracts/swing-radar";
import type { PortfolioJournalGroup } from "@/lib/portfolio/journal-insights";
import {
  buildPositionChartEventDisplays,
  type PositionChartEventDisplay,
  type PositionChartEventTone
} from "@/lib/portfolio/position-chart-events";
import { getPortfolioEntryEvent } from "@/lib/portfolio/position-detail";
import { cn, formatPrice } from "@/lib/utils";

const MAX_POINTS = 60;
const CHART_HEIGHT = 360;
const EVENT_MARKER_HORIZONTAL_PADDING = 18;
const EVENT_MARKER_STACK_OFFSET = 24;
const EVENT_MARKER_VERTICAL_OFFSET = 18;
const EVENT_MARKER_VERTICAL_PADDING = 20;

interface EventMarkerPosition extends PositionChartEventDisplay {
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

function buildReferenceLines(tradePlan?: RecommendationTradePlanDto | null, averagePrice?: number | null) {
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

function clampMarkerX(x: number, width: number) {
  const horizontalPadding = Math.min(EVENT_MARKER_HORIZONTAL_PADDING, Math.max(14, width / 8));
  return Math.max(horizontalPadding, Math.min(width - horizontalPadding, x));
}

function clampMarkerY(y: number) {
  return Math.max(EVENT_MARKER_VERTICAL_PADDING, Math.min(CHART_HEIGHT - EVENT_MARKER_VERTICAL_PADDING, y));
}

function getEventToneStyles(tone: PositionChartEventTone) {
  switch (tone) {
    case "buy":
      return {
        marker:
          "border-emerald-400/45 bg-emerald-500 text-white shadow-[0_0_0_3px_rgba(255,255,255,0.96),0_0_0_4px_rgba(15,23,42,0.14),0_14px_22px_-18px_rgba(16,185,129,0.95)]"
      };
    case "add":
      return {
        marker:
          "border-sky-400/45 bg-sky-500 text-white shadow-[0_0_0_3px_rgba(255,255,255,0.96),0_0_0_4px_rgba(15,23,42,0.14),0_14px_22px_-18px_rgba(14,165,233,0.95)]"
      };
    case "take":
      return {
        marker:
          "border-amber-300/45 bg-amber-500 text-white shadow-[0_0_0_3px_rgba(255,255,255,0.96),0_0_0_4px_rgba(15,23,42,0.14),0_14px_22px_-18px_rgba(245,158,11,0.95)]"
      };
    case "exit":
      return {
        marker:
          "border-rose-300/45 bg-rose-500 text-white shadow-[0_0_0_3px_rgba(255,255,255,0.96),0_0_0_4px_rgba(15,23,42,0.14),0_14px_22px_-18px_rgba(244,63,94,0.95)]"
      };
    case "stop":
      return {
        marker:
          "border-red-300/46 bg-red-500 text-white shadow-[0_0_0_3px_rgba(255,255,255,0.96),0_0_0_4px_rgba(15,23,42,0.14),0_14px_22px_-18px_rgba(239,68,68,0.95)]"
      };
    case "manual":
      return {
        marker:
          "border-slate-300/40 bg-slate-600 text-white shadow-[0_0_0_3px_rgba(255,255,255,0.96),0_0_0_4px_rgba(15,23,42,0.14),0_14px_22px_-18px_rgba(71,85,105,0.95)]"
      };
  }
}

function getEventIcon(type: PositionChartEventDisplay["type"]): LucideIcon {
  switch (type) {
    case "buy":
      return ArrowUp;
    case "add":
      return Plus;
    case "take_profit_partial":
      return Target;
    case "exit_full":
      return ArrowDown;
    case "stop_loss":
      return ShieldX;
    case "manual_exit":
      return Flag;
  }
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
  const [eventMarkers, setEventMarkers] = useState<EventMarkerPosition[]>([]);

  const visiblePoints = useMemo(() => chartPoints.slice(-MAX_POINTS), [chartPoints]);
  const latestPoint = visiblePoints.at(-1);
  const firstEntryEvent = getPortfolioEntryEvent(journalGroup);

  const availableDates = useMemo(
    () =>
      new Set(
        visiblePoints
          .map((point, index) => {
            const businessDay = resolveChartDate(point, visiblePoints.length - index - 1, latestPoint?.date ?? null, generatedAt);
            return `${businessDay.year}-${String(businessDay.month).padStart(2, "0")}-${String(businessDay.day).padStart(2, "0")}`;
          })
          .filter(Boolean)
      ),
    [generatedAt, latestPoint?.date, visiblePoints]
  );

  const eventDisplayDefinitions = useMemo(
    () => buildPositionChartEventDisplays(journalGroup, availableDates),
    [availableDates, journalGroup]
  );

  useEffect(() => {
    if (!containerRef.current || !visiblePoints.length) {
      setEventMarkers([]);
      return;
    }

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: CHART_HEIGHT,
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

    const syncEventMarkers = () => {
      if (!containerRef.current) {
        return;
      }

      const width = containerRef.current.clientWidth;
      const stackCounts = new Map<string, number>();
      const nextMarkers = eventDisplayDefinitions
        .map((event) => {
          const x = chart.timeScale().timeToCoordinate(toBusinessDay(event.date)!);
          const y = priceSeries.priceToCoordinate(event.price);

          if (x === null || y === null) {
            return null;
          }

          const stackKey = `${event.date}:${event.placement}`;
          const stackIndex = stackCounts.get(stackKey) ?? 0;
          stackCounts.set(stackKey, stackIndex + 1);

          const stackedY =
            event.placement === "above"
              ? y - EVENT_MARKER_VERTICAL_OFFSET - stackIndex * EVENT_MARKER_STACK_OFFSET
              : y + EVENT_MARKER_VERTICAL_OFFSET + stackIndex * EVENT_MARKER_STACK_OFFSET;

          return {
            ...event,
            x: clampMarkerX(x, width),
            y: clampMarkerY(stackedY)
          };
        })
        .filter((item): item is EventMarkerPosition => item !== null);

      setEventMarkers(nextMarkers);
    };

    chart.timeScale().fitContent();
    requestAnimationFrame(syncEventMarkers);
    chartRef.current = chart;

    const resizeObserver = new ResizeObserver(() => {
      if (!containerRef.current || !chartRef.current) {
        return;
      }

      chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      chartRef.current.timeScale().fitContent();
      requestAnimationFrame(syncEventMarkers);
    });

    const handleVisibleRangeChange = () => {
      requestAnimationFrame(syncEventMarkers);
    };

    chart.timeScale().subscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
    resizeObserver.observe(containerRef.current);

    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      setEventMarkers([]);
    };
  }, [averagePrice, eventDisplayDefinitions, generatedAt, latestPoint?.date, tradePlan, visiblePoints]);

  if (!visiblePoints.length) {
    return (
      <Card className="border-border/80 bg-white/90 shadow-[0_22px_56px_-36px_rgba(24,32,42,0.24)]">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">가격 흐름과 체결 위치</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-[24px] border border-border/80 bg-[hsl(42_40%_97%)] px-5 py-10 text-sm leading-6 text-muted-foreground">
            {company} 가격 이력이 아직 충분하지 않아 상세 차트를 준비하고 있습니다.
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
            <div className="pointer-events-none absolute inset-0 z-30">
              {eventMarkers.map((marker) => (
                <ChartEventMarker key={marker.id} marker={marker} />
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

function ChartEventMarker({ marker }: { marker: EventMarkerPosition }) {
  const styles = getEventToneStyles(marker.tone);
  const Icon = getEventIcon(marker.type);

  return (
    <div
      className={cn(
        "absolute z-30 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border",
        styles.marker
      )}
      style={{
        left: marker.x,
        top: marker.y
      }}
      aria-label={`${marker.label} ${formatPrice(marker.price)}`}
    >
      <Icon className="h-4 w-4" strokeWidth={2.4} />
    </div>
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
