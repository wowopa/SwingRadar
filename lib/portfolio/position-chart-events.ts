import type { PortfolioJournalGroup } from "@/lib/portfolio/journal-insights";
import { getPortfolioEventLabel } from "@/lib/portfolio/position-detail";
import type { PortfolioTradeEventType } from "@/types/recommendation";

export type PositionChartEventTone = "buy" | "add" | "take" | "exit" | "stop" | "manual";
export type PositionChartEventPlacement = "above" | "below";

export interface PositionChartEventDisplay {
  id: string;
  type: PortfolioTradeEventType;
  date: string;
  dateLabel: string;
  price: number;
  quantity: number;
  label: string;
  shortLabel: string;
  tone: PositionChartEventTone;
  placement: PositionChartEventPlacement;
  sequence: number;
}

const POSITION_CHART_EVENT_META = {
  buy: {
    shortLabel: "IN",
    tone: "buy",
    placement: "below"
  },
  add: {
    shortLabel: "ADD",
    tone: "add",
    placement: "below"
  },
  take_profit_partial: {
    shortLabel: "TP",
    tone: "take",
    placement: "above"
  },
  exit_full: {
    shortLabel: "OUT",
    tone: "exit",
    placement: "above"
  },
  stop_loss: {
    shortLabel: "SL",
    tone: "stop",
    placement: "above"
  },
  manual_exit: {
    shortLabel: "MAN",
    tone: "manual",
    placement: "above"
  }
} satisfies Record<
  PortfolioTradeEventType,
  {
    shortLabel: string;
    tone: PositionChartEventTone;
    placement: PositionChartEventPlacement;
  }
>;

function formatEventDateLabel(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.slice(5).replace("-", ".") : date;
}

export function getPositionChartEventMeta(type: PortfolioTradeEventType) {
  return POSITION_CHART_EVENT_META[type];
}

export function buildPositionChartEventDisplays(
  group: PortfolioJournalGroup | null | undefined,
  availableDates: Set<string>
): PositionChartEventDisplay[] {
  if (!group) {
    return [];
  }

  return [...group.events]
    .sort((left, right) => new Date(left.tradedAt).getTime() - new Date(right.tradedAt).getTime())
    .flatMap((event) => {
      const date = event.tradedAt.slice(0, 10);
      if (!availableDates.has(date)) {
        return [];
      }

      const meta = getPositionChartEventMeta(event.type);

      return [
        {
          id: event.id,
          type: event.type,
          date,
          dateLabel: formatEventDateLabel(date),
          price: event.price,
          quantity: event.quantity,
          label: getPortfolioEventLabel(event.type),
          shortLabel: meta.shortLabel,
          tone: meta.tone,
          placement: meta.placement,
          sequence: 0
        }
      ];
    })
    .map((event, index) => ({
      ...event,
      sequence: index + 1
    }));
}
