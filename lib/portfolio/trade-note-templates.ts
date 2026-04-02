import type { PortfolioTradeEvent, PortfolioTradeEventType } from "@/types/recommendation";

type NoteTemplateScope = {
  ticker?: string | null;
  type?: PortfolioTradeEventType | null;
  limit?: number;
};

function normalizeTemplate(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function extractTemplatesFromNote(note?: string | null) {
  if (!note) {
    return [];
  }

  const normalized = normalizeTemplate(note);
  if (!normalized) {
    return [];
  }

  const chunks = normalized
    .split(/[\n,|/]+/g)
    .map((item) => normalizeTemplate(item))
    .filter((item) => item.length >= 3);

  const templates = normalized.length <= 42 ? [normalized, ...chunks] : chunks;
  return templates.filter((item, index) => templates.indexOf(item) === index);
}

function appendTemplates(
  target: string[],
  events: PortfolioTradeEvent[],
  limit: number
) {
  for (const event of events) {
    const candidates = extractTemplatesFromNote(event.note);
    for (const candidate of candidates) {
      if (target.includes(candidate)) {
        continue;
      }

      target.push(candidate);
      if (target.length >= limit) {
        return;
      }
    }
  }
}

export function buildTradeNoteTemplates(
  events: PortfolioTradeEvent[],
  { ticker, type, limit = 6 }: NoteTemplateScope = {}
) {
  const orderedEvents = [...events].sort(
    (left, right) => new Date(right.tradedAt).getTime() - new Date(left.tradedAt).getTime()
  );
  const templates: string[] = [];

  const sameTickerSameType = orderedEvents.filter(
    (event) => event.note && event.ticker === ticker && event.type === type
  );
  appendTemplates(templates, sameTickerSameType, limit);

  if (templates.length < limit && ticker) {
    const sameTicker = orderedEvents.filter((event) => event.note && event.ticker === ticker);
    appendTemplates(templates, sameTicker, limit);
  }

  if (templates.length < limit && type) {
    const sameType = orderedEvents.filter((event) => event.note && event.type === type);
    appendTemplates(templates, sameType, limit);
  }

  if (templates.length < limit) {
    const fallback = orderedEvents.filter((event) => event.note);
    appendTemplates(templates, fallback, limit);
  }

  return templates.slice(0, limit);
}
