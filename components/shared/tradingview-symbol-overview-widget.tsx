"use client";

import { useEffect, useRef } from "react";

type TradingViewSymbolOverviewWidgetProps = {
  symbol: string;
  height?: number;
};

export function TradingViewSymbolOverviewWidget({
  symbol,
  height = 420
}: TradingViewSymbolOverviewWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = containerRef.current;
    if (!host) {
      return;
    }

    host.innerHTML = "";

    const root = document.createElement("div");
    root.className = "tradingview-widget-container";

    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    root.appendChild(widget);

    const copyright = document.createElement("div");
    copyright.className = "tradingview-widget-copyright mt-3 text-xs text-muted-foreground";
    copyright.innerHTML =
      '<a href="https://www.tradingview.com/" rel="noopener noreferrer" target="_blank" class="underline underline-offset-4">Data and chart by TradingView</a>';
    root.appendChild(copyright);

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js";
    script.innerHTML = JSON.stringify({
      symbols: [[`${symbol}|1D`]],
      chartOnly: false,
      width: "100%",
      height,
      locale: "kr",
      colorTheme: "light",
      autosize: true,
      showVolume: false,
      showMA: false,
      hideDateRanges: false,
      hideMarketStatus: false,
      hideSymbolLogo: false,
      scalePosition: "right",
      scaleMode: "Normal",
      fontFamily:
        "Pretendard, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      fontSize: "12",
      noTimeScale: false,
      valuesTracking: "1",
      changeMode: "price-and-percent"
    });
    root.appendChild(script);

    host.appendChild(root);

    return () => {
      host.innerHTML = "";
    };
  }, [height, symbol]);

  return <div ref={containerRef} className="min-h-[460px]" />;
}
