import { FavoriteTickerButton } from "@/components/shared/favorite-ticker-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSymbolByTicker } from "@/lib/symbols/master";
import { formatPercent } from "@/lib/utils";
import type { SignalHistoryEntry, TrackingDetail } from "@/types/tracking";

interface HistoryTableProps {
  items: SignalHistoryEntry[];
  details: Record<string, TrackingDetail>;
  activeId: string;
  favoriteTickers: string[];
  onSelect: (id: string) => void;
  onToggleFavorite: (ticker: string) => void;
}

function resolveCurrentReturn(item: SignalHistoryEntry, detail?: TrackingDetail) {
  if (typeof item.currentReturn === "number") {
    return item.currentReturn;
  }

  const firstPoint = detail?.chartSnapshot?.[0]?.price;
  const lastPoint = detail?.chartSnapshot?.at(-1)?.price;
  if (!firstPoint || !lastPoint) {
    return null;
  }

  return ((lastPoint - firstPoint) / firstPoint) * 100;
}

function getReturnTone(currentReturn: number | null) {
  if (currentReturn === null) {
    return "text-foreground/60";
  }
  if (currentReturn > 0) {
    return "text-positive";
  }
  if (currentReturn < 0) {
    return "text-caution";
  }
  return "text-foreground/80";
}

export function HistoryTable({
  items,
  details,
  activeId,
  favoriteTickers,
  onSelect,
  onToggleFavorite
}: HistoryTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>공용 추적 이력</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-x-auto overscroll-x-contain pb-2 [webkit-overflow-scrolling:touch]">
          <table className="min-w-[1020px] w-full table-fixed text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border">
                <th className="whitespace-nowrap pb-3 pr-5">즐겨찾기</th>
                <th className="whitespace-nowrap pb-3 pr-5">종목</th>
                <th className="whitespace-nowrap pb-3 pr-5">시작일</th>
                <th className="whitespace-nowrap pb-3 pr-5">톤</th>
                <th className="whitespace-nowrap pb-3 pr-5">상태</th>
                <th className="whitespace-nowrap pb-3 pr-5">최대 상승</th>
                <th className="whitespace-nowrap pb-3 pr-5">최대 하락</th>
                <th className="whitespace-nowrap pb-3 pr-5">보유일</th>
                <th className="whitespace-nowrap pb-3 pr-5">현재 수익률</th>
                <th className="whitespace-nowrap pb-3">상세</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const resolved = getSymbolByTicker(item.ticker);
                const company = resolved?.company ?? item.company;
                const currentReturn = resolveCurrentReturn(item, details[item.id]);

                return (
                  <tr
                    key={item.id}
                    className={`border-b border-border/60 last:border-0 ${item.id === activeId ? "bg-primary/8" : ""}`}
                  >
                    <td className="py-4 pr-5">
                      <FavoriteTickerButton
                        active={favoriteTickers.includes(item.ticker)}
                        label={`${company} 즐겨찾기`}
                        onClick={() => onToggleFavorite(item.ticker)}
                      />
                    </td>
                    <td className="py-4 pr-5">
                      <div className="font-medium text-foreground">{company}</div>
                      <div className="text-xs text-muted-foreground">{item.ticker}</div>
                    </td>
                    <td className="py-4 pr-5 text-foreground/80">{item.signalDate}</td>
                    <td className="py-4 pr-5">
                      <span className="inline-flex rounded-full border border-border/70 bg-secondary/40 px-2.5 py-1 text-xs font-medium text-foreground/75">
                        {item.signalTone}
                      </span>
                    </td>
                    <td className="py-4 pr-5 text-foreground/80">{item.result}</td>
                    <td className="py-4 pr-5 text-positive">{formatPercent(item.mfe)}</td>
                    <td className="py-4 pr-5 text-caution">{formatPercent(item.mae)}</td>
                    <td className="py-4 pr-5 text-foreground/80">{item.holdingDays}일</td>
                    <td className={`py-4 pr-5 ${getReturnTone(currentReturn)}`}>
                      {currentReturn === null ? "-" : formatPercent(currentReturn)}
                    </td>
                    <td className="py-4">
                      <button
                        className="rounded-lg border border-border px-3 py-1.5 text-sm text-primary transition hover:border-primary/30 hover:bg-accent"
                        onClick={() => onSelect(item.id)}
                        type="button"
                      >
                        상세 보기
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
