"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  HistogramSeries,
  LineSeries,
  type IChartApi,
  type LineStyle
} from "lightweight-charts";
import { ExternalLink } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalysisChartPoint } from "@/types/analysis";

type RangeKey = "1M" | "3M" | "6M";

const RANGE_POINTS: Record<RangeKey, number> = {
  "1M": 20,
  "3M": 60,
  "6M": 120
};

function formatPrice(value: number) {
  return `${Math.round(value).toLocaleString()}원`;
}

function buildSyntheticDate(index: number) {
  const date = new Date(Date.UTC(2026, 0, 1 + index));
  return date.toISOString().slice(0, 10);
}

function toChartValue(value: number | null) {
  return value === null ? undefined : value;
}

export function TradingViewChartCard({
  symbol,
  company,
  points
}: {
  symbol: string | null;
  company: string;
  points: AnalysisChartPoint[];
}) {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [range, setRange] = useState<RangeKey>("3M");
  const tradingViewUrl = symbol ? `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}` : null;
  const availableRanges = useMemo(() => {
    const items: RangeKey[] = [];
    if (points.length >= 20) items.push("1M");
    if (points.length >= 40) items.push("3M");
    if (points.length >= 80) items.push("6M");
    return items.length ? items : (["1M"] as RangeKey[]);
  }, [points.length]);

  const chartPoints = useMemo(() => {
    const count = RANGE_POINTS[range];
    return points.slice(-count);
  }, [points, range]);

  useEffect(() => {
    if (!availableRanges.includes(range)) {
      setRange(availableRanges[availableRanges.length - 1] ?? "1M");
    }
  }, [availableRanges, range]);

  useEffect(() => {
    if (!chartContainerRef.current || !chartPoints.length) {
      return;
    }

    chartRef.current?.remove();

    const container = chartContainerRef.current;
    const chart = createChart(container, {
      width: container.clientWidth,
      height: 420,
      layout: {
        background: { type: ColorType.Solid, color: "#ffffff" },
        textColor: "#475569",
        attributionLogo: false
      },
      grid: {
        vertLines: { color: "rgba(148, 163, 184, 0.14)" },
        horzLines: { color: "rgba(148, 163, 184, 0.14)" }
      },
      rightPriceScale: {
        borderColor: "rgba(148, 163, 184, 0.22)"
      },
      leftPriceScale: {
        visible: true,
        scaleMargins: {
          top: 0.78,
          bottom: 0
        },
        borderColor: "rgba(148, 163, 184, 0.12)"
      },
      timeScale: {
        borderColor: "rgba(148, 163, 184, 0.22)",
        timeVisible: true,
        secondsVisible: false
      },
      crosshair: {
        vertLine: { color: "rgba(33, 128, 105, 0.25)" },
        horzLine: { color: "rgba(33, 128, 105, 0.25)" }
      }
    });

    const closeSeries = chart.addSeries(LineSeries, {
      color: "#218069",
      lineWidth: 3,
      priceLineVisible: true,
      lastValueVisible: true
    });
    const sma20Series = chart.addSeries(LineSeries, {
      color: "#f59e0b",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false
    });
    const sma60Series = chart.addSeries(LineSeries, {
      color: "#6366f1",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false
    });
    const upperBandSeries = chart.addSeries(LineSeries, {
      color: "rgba(251, 113, 133, 0.82)",
      lineWidth: 1,
      lineStyle: 2 as LineStyle,
      priceLineVisible: false,
      lastValueVisible: false
    });
    const lowerBandSeries = chart.addSeries(LineSeries, {
      color: "rgba(251, 113, 133, 0.82)",
      lineWidth: 1,
      lineStyle: 2 as LineStyle,
      priceLineVisible: false,
      lastValueVisible: false
    });
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceScaleId: "left",
      color: "rgba(33, 128, 105, 0.35)",
      priceFormat: { type: "volume" }
    });

    const seriesData = chartPoints.map((point, index) => ({
      time: buildSyntheticDate(index),
      close: point.close,
      volume: point.volume ?? 0,
      sma20: toChartValue(point.sma20),
      sma60: toChartValue(point.sma60),
      bollingerUpper: toChartValue(point.bollingerUpper),
      bollingerLower: toChartValue(point.bollingerLower)
    }));

    closeSeries.setData(seriesData.map((point) => ({ time: point.time, value: point.close })));
    sma20Series.setData(seriesData.filter((point) => point.sma20 !== undefined).map((point) => ({ time: point.time, value: point.sma20! })));
    sma60Series.setData(seriesData.filter((point) => point.sma60 !== undefined).map((point) => ({ time: point.time, value: point.sma60! })));
    upperBandSeries.setData(
      seriesData.filter((point) => point.bollingerUpper !== undefined).map((point) => ({ time: point.time, value: point.bollingerUpper! }))
    );
    lowerBandSeries.setData(
      seriesData.filter((point) => point.bollingerLower !== undefined).map((point) => ({ time: point.time, value: point.bollingerLower! }))
    );
    volumeSeries.setData(seriesData.map((point, index) => ({
      time: point.time,
      value: point.volume,
      color:
        index > 0 && point.close < (seriesData[index - 1]?.close ?? point.close)
          ? "rgba(251, 113, 133, 0.45)"
          : "rgba(33, 128, 105, 0.35)"
    })));

    chart.timeScale().fitContent();
    chartRef.current = chart;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      chart.applyOptions({
        width: Math.floor(entry.contentRect.width)
      });
      chart.timeScale().fitContent();
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [chartPoints]);

  const lastPoint = chartPoints.at(-1);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>가격 차트</CardTitle>
          <p className="mt-2 text-sm text-muted-foreground">가격, 이동평균선, 볼린저 밴드, 거래량을 한 화면에서 확인합니다.</p>
        </div>
        {tradingViewUrl ? (
          <Link
            href={tradingViewUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary transition hover:text-primary/80"
          >
            TradingView에서 열기
            <ExternalLink className="h-4 w-4" />
          </Link>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {chartPoints.length ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {availableRanges.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setRange(item)}
                    className={
                      item === range
                        ? "rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary"
                        : "rounded-full border border-border/70 bg-background/70 px-3 py-1.5 text-xs text-muted-foreground"
                    }
                  >
                    {item}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <LegendDot color="#218069" label="종가" />
                <LegendDot color="#f59e0b" label="20일선" />
                <LegendDot color="#6366f1" label="60일선" />
                <LegendDot color="#fb7185" label="볼린저 밴드" />
                <LegendDot color="rgba(33, 128, 105, 0.5)" label="거래량" />
              </div>
            </div>
            <div className="overflow-hidden rounded-[28px] border border-border/70 bg-white p-3">
              <div ref={chartContainerRef} className="h-[420px] w-full" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MiniMetric label="최근 종가" value={lastPoint ? formatPrice(lastPoint.close) : "계산 중"} />
              <MiniMetric label="20일선" value={lastPoint?.sma20 ? formatPrice(lastPoint.sma20) : "계산 중"} />
              <MiniMetric label="60일선" value={lastPoint?.sma60 ? formatPrice(lastPoint.sma60) : "계산 중"} />
              <MiniMetric
                label="최근 거래량"
                value={lastPoint?.volume ? `${lastPoint.volume.toLocaleString()}주` : "계산 중"}
              />
            </div>
            <p className="text-sm leading-7 text-muted-foreground">
              {company} 최근 가격 흐름과 20일선, 60일선, 볼린저 밴드, 거래량을 직접 그려 보여줍니다. 이제 페이지 안에서 꼭 봐야 하는 보조지표를 한 번에 확인할 수 있습니다.
            </p>
          </>
        ) : (
          <div className="rounded-[28px] border border-border/70 bg-secondary/35 p-6 text-sm leading-7 text-muted-foreground">
            {company} 가격 이력이 아직 충분하지 않아 차트를 준비하는 중입니다.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-border/70 bg-secondary/35 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-foreground">{value}</p>
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
