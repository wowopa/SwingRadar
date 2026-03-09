import { fetchJson, wait } from "./external-source-utils.mjs";

const KO = {
  positive: "\uAE0D\uC815",
  neutral: "\uC911\uB9BD",
  caution: "\uC8FC\uC758"
};

const GLOBAL_BLOCKED_TITLE_PATTERNS = [
  /end flat/i,
  /shares end/i,
  /up&down/i,
  /\[\s*\uC774bio\s*\]/iu,
  /\[\s*\uBC14\uC774\uC624\uB9E5\uC9DA\uAE30\s*\]/u,
  /\uC2A4\uD398\uC15C\uB9AC\uD3EC\uD2B8/u,
  /\uC7A5\uB9C8\uAC10/u,
  /\uC2DC\uD669/u,
  /\u5916/u,
  /\uBCC4\uC138/u
];

function includesAny(text, keywords = []) {
  return keywords.some((keyword) => text.includes(normalizeText(keyword)));
}

function unique(values) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function canonicalHeadline(value) {
  return normalizeText(value).replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export function mapImpact(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  if (/(surge|beat|record|upgrade|partnership|approval|expands|growth|profit|ai|rebound)/i.test(text)) return KO.positive;
  if (/(probe|delay|drop|cuts|lawsuit|warning|downgrade|miss|risk|decline|antitrust|recall)/i.test(text)) return KO.caution;
  return KO.neutral;
}

export function normalizeText(value) {
  return (value ?? "").toLowerCase();
}

export function stripHtml(value) {
  return (value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function hostnameOf(urlValue) {
  try {
    return new URL(urlValue).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function isPreferredDomain(host, entry) {
  return (entry.preferredDomains ?? []).some((domain) => host.includes(normalizeText(domain)));
}

function isBlockedDomain(host, entry) {
  return (entry.blockedDomains ?? []).some((domain) => host.includes(normalizeText(domain)));
}

function getPriorityBand(priorityRank) {
  if (!priorityRank || priorityRank < 1) {
    return "default";
  }
  if (priorityRank <= 20) {
    return "top20";
  }
  if (priorityRank <= 100) {
    return "top100";
  }
  return "default";
}

function getEnglishAliases(entry) {
  return (entry.aliases ?? []).filter((value) => /[a-z]/i.test(value));
}

export function buildNewsQueries(entry, provider, options = {}) {
  const priorityBand = getPriorityBand(options.priorityRank ?? null);
  const queries = unique([
    entry.newsQuery,
    ...(entry.newsQueriesKr ?? []),
    ...(provider === "gnews" ? entry.newsQueries ?? [] : []),
    ...(priorityBand !== "default" ? getEnglishAliases(entry) : [])
  ]);

  if (priorityBand === "top100") {
    queries.push(`"${entry.company}" 주가`, `"${entry.company}" 실적`);
  }

  if (priorityBand === "top20") {
    queries.push(
      `"${entry.company}" 전망`,
      `"${entry.company}" 수급`,
      `"${entry.company}" 목표주가`
    );
  }

  const maxQueryCount = priorityBand === "top20" ? 8 : priorityBand === "top100" ? 6 : 4;
  return unique(queries).slice(0, maxQueryCount);
}

export function matchesFilters(article, entry) {
  const rawTitle = article.headline ?? "";
  const title = normalizeText(rawTitle);
  const summary = normalizeText(article.summary ?? "");
  const body = `${title} ${summary}`.trim();
  const host = hostnameOf(article.url ?? "");

  if (!title) {
    return false;
  }

  if (GLOBAL_BLOCKED_TITLE_PATTERNS.some((pattern) => pattern.test(rawTitle))) {
    return false;
  }

  if (isBlockedDomain(host, entry)) {
    return false;
  }

  if ((entry.blockedKeywords ?? []).some((keyword) => body.includes(normalizeText(keyword)))) {
    return false;
  }

  const requiredKeywords = entry.requiredKeywords ?? [];
  const contextKeywords = entry.contextKeywords ?? [];
  const hasIdentityInTitle = !requiredKeywords.length || includesAny(title, requiredKeywords);
  const hasIdentityInBody = !requiredKeywords.length || includesAny(body, requiredKeywords);
  const hasContextInTitle = !contextKeywords.length || includesAny(title, contextKeywords);
  const hasContextInBody = !contextKeywords.length || includesAny(body, contextKeywords);
  const preferredDomain = isPreferredDomain(host, entry);
  const koreanDomain = host.endsWith(".kr") || host.endsWith(".co.kr");

  if (!hasIdentityInBody || !hasIdentityInTitle) {
    return false;
  }

  if (contextKeywords.length && !(hasContextInTitle || (hasContextInBody && (preferredDomain || koreanDomain)))) {
    return false;
  }

  return true;
}

function scoreArticle(article, entry, options = {}) {
  const title = normalizeText(article.headline ?? "");
  const summary = normalizeText(article.summary ?? "");
  const body = `${title} ${summary}`.trim();
  const host = hostnameOf(article.url ?? "");
  const priorityBand = getPriorityBand(options.priorityRank ?? null);
  let score = 0;

  for (const keyword of entry.requiredKeywords ?? []) {
    const normalizedKeyword = normalizeText(keyword);
    if (title.includes(normalizedKeyword)) score += 8;
    else if (body.includes(normalizedKeyword)) score += 2;
  }

  for (const keyword of entry.contextKeywords ?? []) {
    const normalizedKeyword = normalizeText(keyword);
    if (title.includes(normalizedKeyword)) score += 6;
    else if (body.includes(normalizedKeyword)) score += 2;
  }

  if (title.includes(normalizeText(entry.company))) score += priorityBand === "default" ? 5 : 7;
  if (isPreferredDomain(host, entry)) score += priorityBand === "default" ? 8 : 12;
  if (host.endsWith(".kr") || host.endsWith(".co.kr")) score += 3;
  if (priorityBand !== "default" && /(hankyung\.com|mk\.co\.kr|edaily\.co\.kr|yna\.co\.kr|sedaily\.com|newsis\.com)/i.test(host)) {
    score += 5;
  }
  if (article.source === "naver-search") score += 2;
  if (isBlockedDomain(host, entry)) score -= 20;
  if (!(host.endsWith(".kr") || host.endsWith(".co.kr"))) score -= 6;

  return score;
}

export function dedupeArticles(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.ticker ?? ""}|${hostnameOf(item.url ?? "")}|${canonicalHeadline(item.headline ?? "")}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function rankArticles(items, entry, maxItems, options = {}) {
  const minScore = entry.minArticleScore ?? 10;
  return dedupeArticles(items)
    .map((item) => ({ item, score: scoreArticle(item, entry, options) }))
    .filter((entryScore) => entryScore.score >= minScore)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return right.item.date.localeCompare(left.item.date);
    })
    .map((entryScore) => entryScore.item)
    .slice(0, maxItems);
}

function parseRetryDelayMs(error, attempt) {
  const retryAfterSeconds = Number.parseInt(String(error?.retryAfter ?? ""), 10);
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return retryAfterSeconds * 1000;
  }

  return Math.min(1500 * 2 ** attempt, 12000);
}

async function fetchJsonWithRetry(url, options, telemetry = {}) {
  const retryLimit = Math.max(0, Number.parseInt(process.env.SWING_RADAR_NEWS_RETRY_LIMIT ?? "2", 10));

  for (let attempt = 0; attempt <= retryLimit; attempt += 1) {
    try {
      return await fetchJson(url, options);
    } catch (error) {
      const status = error && typeof error === "object" && "status" in error ? error.status : null;
      const shouldRetry = status === 429 || status === 408 || (typeof status === "number" && status >= 500);

      if (!shouldRetry || attempt === retryLimit) {
        throw error;
      }

      const delayMs = parseRetryDelayMs(error, attempt);
      telemetry.onRetry?.({
        status,
        delayMs,
        attempt: attempt + 1,
        url
      });
      await wait(delayMs);
    }
  }

  throw new Error(`Request failed after retries: ${url}`);
}

export async function fetchNaverNews(entry, maxItems, telemetry, options = {}) {
  const clientId = process.env.SWING_RADAR_NAVER_CLIENT_ID;
  const clientSecret = process.env.SWING_RADAR_NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("SWING_RADAR_NAVER_CLIENT_ID and SWING_RADAR_NAVER_CLIENT_SECRET are required for Naver provider");
  }

  const queries = buildNewsQueries(entry, "naver", options);
  const priorityBand = getPriorityBand(options.priorityRank ?? null);
  const effectiveMaxItems = priorityBand === "top20" ? Math.max(maxItems, 8) : priorityBand === "top100" ? Math.max(maxItems, 6) : maxItems;
  const perQueryLimit = Math.max(priorityBand === "default" ? 5 : 7, Math.ceil(effectiveMaxItems / Math.max(queries.length, 1)) + 5);
  const items = [];

  for (const query of queries) {
    const url = new URL("https://openapi.naver.com/v1/search/news.json");
    url.searchParams.set("query", query);
    url.searchParams.set("display", String(perQueryLimit));
    url.searchParams.set("sort", "date");

    const payload = await fetchJsonWithRetry(url.toString(), {
      headers: {
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret,
        "User-Agent": "SWING-RADAR/0.1"
      }
    }, telemetry);

    for (const article of payload.items ?? []) {
      const candidate = {
        ticker: entry.ticker,
        company: entry.company,
        headline: stripHtml(article.title),
        summary: stripHtml(article.description),
        source: "naver-search",
        url: article.originallink || article.link || "",
        date: new Date(article.pubDate).toISOString().slice(0, 10)
      };

      if (!matchesFilters(candidate, entry)) continue;

      items.push({
        ...candidate,
        impact: mapImpact(candidate.headline, candidate.summary)
      });
    }
  }

  return rankArticles(items, entry, effectiveMaxItems, options).slice(0, effectiveMaxItems);
}

export async function fetchGNews(entry, maxItems, telemetry, options = {}) {
  const apiKey = process.env.SWING_RADAR_NEWS_API_KEY;
  if (!apiKey) {
    throw new Error("SWING_RADAR_NEWS_API_KEY is required for GNews provider");
  }

  const queries = buildNewsQueries(entry, "gnews", options);
  const priorityBand = getPriorityBand(options.priorityRank ?? null);
  const effectiveMaxItems = priorityBand === "top20" ? Math.max(maxItems, 8) : priorityBand === "top100" ? Math.max(maxItems, 6) : maxItems;
  const perQueryLimit = Math.max(priorityBand === "default" ? 3 : 5, Math.ceil(effectiveMaxItems / Math.max(queries.length, 1)) + 2);
  const items = [];

  for (const query of queries) {
    const url = new URL("https://gnews.io/api/v4/search");
    url.searchParams.set("q", query);
    url.searchParams.set("lang", "ko");
    url.searchParams.set("country", "kr");
    url.searchParams.set("max", String(perQueryLimit));
    url.searchParams.set("apikey", apiKey);

    const payload = await fetchJsonWithRetry(url.toString(), {
      headers: { "User-Agent": "SWING-RADAR/0.1" }
    }, telemetry);

    for (const article of payload.articles ?? []) {
      const candidate = {
        ticker: entry.ticker,
        company: entry.company,
        headline: article.title ?? "",
        summary: article.description ?? article.content ?? "",
        source: article.source?.name ?? "gnews",
        url: article.url,
        date: article.publishedAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)
      };

      if (!matchesFilters(candidate, entry)) continue;

      items.push({
        ...candidate,
        impact: mapImpact(candidate.headline, candidate.summary)
      });
    }
  }

  return rankArticles(items, entry, effectiveMaxItems, options).slice(0, effectiveMaxItems);
}
