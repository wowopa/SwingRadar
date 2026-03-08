import type { SignalHistoryEntry } from "@/types/tracking";
import { FavoriteTickerButton } from "@/components/shared/favorite-ticker-button";
import { SignalToneBadge } from "@/components/shared/signal-tone-badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPercent } from "@/lib/utils";

interface HistoryTableProps {
  items: SignalHistoryEntry[];
  activeId: string;
  favoriteTickers: string[];
  onSelect: (id: string) => void;
  onToggleFavorite: (ticker: string) => void;
}

export function HistoryTable({ items, activeId, favoriteTickers, onSelect, onToggleFavorite }: HistoryTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>신호 이력</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
              <tr className="border-b border-border">
                <th className="pb-3 pr-5">즐겨찾기</th>
                <th className="pb-3 pr-5">티커</th>
                <th className="pb-3 pr-5">신호일</th>
                <th className="pb-3 pr-5">톤</th>
                <th className="pb-3 pr-5">결과</th>
                <th className="pb-3 pr-5">MFE</th>
                <th className="pb-3 pr-5">MAE</th>
                <th className="pb-3 pr-5">보유일</th>
                <th className="pb-3">드릴다운</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className={`border-b border-border/60 last:border-0 ${item.id === activeId ? "bg-primary/8" : ""}`}
                >
                  <td className="py-4 pr-5">
                    <FavoriteTickerButton
                      active={favoriteTickers.includes(item.ticker)}
                      label={`${item.company} 즐겨찾기`}
                      onClick={() => onToggleFavorite(item.ticker)}
                    />
                  </td>
                  <td className="py-4 pr-5">
                    <div className="font-medium text-white">{item.company}</div>
                    <div className="text-xs text-muted-foreground">{item.ticker}</div>
                  </td>
                  <td className="py-4 pr-5 text-slate-200">{item.signalDate}</td>
                  <td className="py-4 pr-5">
                    <SignalToneBadge tone={item.signalTone} />
                  </td>
                  <td className="py-4 pr-5 text-slate-200">{item.result}</td>
                  <td className="py-4 pr-5 text-positive">{formatPercent(item.mfe)}</td>
                  <td className="py-4 pr-5 text-caution">{formatPercent(item.mae)}</td>
                  <td className="py-4 pr-5 text-slate-200">{item.holdingDays}일</td>
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
              ))}
            </tbody>
          </table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
