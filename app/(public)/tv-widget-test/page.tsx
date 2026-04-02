import Link from "next/link";

import { TradingViewSymbolOverviewWidget } from "@/components/shared/tradingview-symbol-overview-widget";

const TEST_SYMBOLS = [
  {
    symbol: "KRX:005930",
    company: "삼성전자",
    tradingViewUrl: "https://www.tradingview.com/symbols/KRX-005930/"
  },
  {
    symbol: "KRX:066570",
    company: "LG전자",
    tradingViewUrl: "https://www.tradingview.com/symbols/KRX-066570/"
  },
  {
    symbol: "NASDAQ:AAPL",
    company: "Apple",
    tradingViewUrl: "https://www.tradingview.com/symbols/NASDAQ-AAPL/"
  }
];

export default function TradingViewWidgetTestPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-8 px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      <section className="surface-panel rounded-[32px] px-6 py-8 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand">TradingView Test</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          KRX 임베드 위젯 렌더링 확인
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
          우리 사이트 안에서 TradingView 공식 위젯이 KRX 개별 종목을 정상적으로 렌더링하는지 확인하기 위한 테스트
          화면입니다. 아래 두 종목이 정상적으로 차트/현재가 패널로 뜨면 임베드 자체는 가능한 것으로 볼 수 있습니다.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        {TEST_SYMBOLS.map((item) => (
          <section key={item.symbol} className="surface-panel rounded-[28px] px-5 py-5 sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand">{item.symbol}</p>
                <h2 className="mt-2 text-2xl font-semibold text-foreground">{item.company}</h2>
              </div>
              <Link
                href={item.tradingViewUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex shrink-0 items-center rounded-full border border-border/80 bg-white/85 px-4 py-2 text-sm font-medium text-foreground transition hover:border-brand/60 hover:text-brand"
              >
                심볼 페이지 열기
              </Link>
            </div>

            <div className="mt-5 rounded-[24px] border border-border/80 bg-white/80 p-3">
              <TradingViewSymbolOverviewWidget symbol={item.symbol} />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
