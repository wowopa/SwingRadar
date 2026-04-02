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

function isUsefulTagCandidate(value: string) {
  if (value.length < 3 || value.length > 18) {
    return false;
  }

  if (/^\d+$/.test(value)) {
    return false;
  }

  const compact = value.replace(/\s+/g, "");
  if (compact.length < 2) {
    return false;
  }

  return true;
}

function extractTagCandidatesFromNote(note?: string | null) {
  return extractTemplatesFromNote(note).filter(isUsefulTagCandidate);
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

type TagSuggestion = {
  text: string;
  score: number;
  latestAt: number;
};

function appendTagSuggestions(
  target: Map<string, TagSuggestion>,
  events: PortfolioTradeEvent[],
  weight: number
) {
  for (const event of events) {
    const tradedAt = new Date(event.tradedAt).getTime();
    for (const candidate of extractTagCandidatesFromNote(event.note)) {
      const existing = target.get(candidate);
      if (existing) {
        existing.score += weight;
        existing.latestAt = Math.max(existing.latestAt, tradedAt);
        continue;
      }

      target.set(candidate, {
        text: candidate,
        score: weight,
        latestAt: tradedAt
      });
    }
  }
}

export function buildTradeTagSuggestions(
  events: PortfolioTradeEvent[],
  { ticker, type, limit = 5 }: NoteTemplateScope = {}
) {
  const orderedEvents = [...events].sort(
    (left, right) => new Date(right.tradedAt).getTime() - new Date(left.tradedAt).getTime()
  );
  const suggestions = new Map<string, TagSuggestion>();

  const sameTickerSameType = orderedEvents.filter(
    (event) => event.note && event.ticker === ticker && event.type === type
  );
  appendTagSuggestions(suggestions, sameTickerSameType, 4);

  if (ticker) {
    const sameTicker = orderedEvents.filter(
      (event) => event.note && event.ticker === ticker && event.type !== type
    );
    appendTagSuggestions(suggestions, sameTicker, 3);
  }

  if (type) {
    const sameType = orderedEvents.filter(
      (event) => event.note && event.type === type && event.ticker !== ticker
    );
    appendTagSuggestions(suggestions, sameType, 2);
  }

  const fallback = orderedEvents.filter(
    (event) => event.note && event.ticker !== ticker && event.type !== type
  );
  appendTagSuggestions(suggestions, fallback, 1);

  return [...suggestions.values()]
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (right.latestAt !== left.latestAt) {
        return right.latestAt - left.latestAt;
      }

      return left.text.length - right.text.length;
    })
    .slice(0, limit)
    .map((item) => item.text);
}
