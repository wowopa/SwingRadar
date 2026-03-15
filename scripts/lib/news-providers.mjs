import { fetchJson, fetchText, wait } from "./external-source-utils.mjs";

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

const TRUSTED_SOURCE_PATTERNS = [
  /hankyung/i,
  /mk\.co\.kr/i,
  /edaily/i,
  /yna/i,
  /sedaily/i,
  /newsis/i,
  /chosun/i,
  /joongang/i,
  /donga/i,
  /moneytoday/i,
  /fnnews/i,
  /sbs biz/i,
  /mbn/i
];

const LOWER_QUALITY_SOURCE_PATTERNS = [
  /topstarnews/i,
  /joongangenews/i,
  /digitaltoday/i,
  /news2day/i,
  /pinpointnews/i,
  /cbci/i,
  /e-science/i,
  /ggilbo/i,
  /biotimes/i,
  /ftoday/i
];

const CURATED_RSS_FEEDS = [
  {
    source: "hankyung.com",
    url: "https://www.hankyung.com/feed/economy"
  },
  {
    source: "hankyung.com",
    url: "https://www.hankyung.com/feed/finance"
  },
  {
    source: "hankyung.com",
    url: "https://www.hankyung.com/feed/it"
  },
  {
    source: "mk.co.kr",
    url: "https://www.mk.co.kr/rss/30100041/"
  },
  {
    source: "mk.co.kr",
    url: "https://www.mk.co.kr/rss/50300009/"
  },
  {
    source: "yna.co.kr",
    url: "https://www.yna.co.kr/rss/economy.xml"
  },
  {
    source: "newsis.com",
    url: "https://www.newsis.com/RSS/economy.xml"
  },
  {
    source: "newsis.com",
    url: "https://www.newsis.com/RSS/industry.xml"
  },
  {
    source: "etnews.com",
    url: "https://www.etnews.com/rss/04.xml"
  },
  {
    source: "etnews.com",
    url: "https://www.etnews.com/rss/02.xml"
  }
];

function includesAny(text, keywords = []) {
  return keywords.some((keyword) => text.includes(normalizeText(keyword)));
}

function unique(values) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function canonicalHeadline(value) {
  return normalizeHeadline(value).replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function normalizeHeadline(value) {
  return normalizeText(value)
    .replace(/\s*[-|｜·•]\s*[^-|｜·•]{1,24}$/u, "")
    .replace(/\[[^\]]+\]/gu, " ")
    .replace(/[“”"'`]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function summarySignature(value) {
  return normalizeText(stripHtml(value))
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 16)
    .join(" ");
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

function sourceLabelOf(article) {
  return normalizeText(article.source ?? "");
}

function sourceBucketOf(article) {
  const host = hostnameOf(article.url ?? "");
  const sourceLabel = sourceLabelOf(article);
  if (host.includes("news.google.com") && sourceLabel) {
    return sourceLabel;
  }

  if (host) {
    return host.replace(/^www\./, "");
  }

  return sourceLabel || "unknown-source";
}

function isTrustedSource(host, sourceLabel) {
  return TRUSTED_SOURCE_PATTERNS.some((pattern) => pattern.test(host) || pattern.test(sourceLabel));
}

function isLowerQualitySource(host, sourceLabel) {
  return LOWER_QUALITY_SOURCE_PATTERNS.some((pattern) => pattern.test(host) || pattern.test(sourceLabel));
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
  const sourceLabel = sourceLabelOf(article);
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
  if (isTrustedSource(host, sourceLabel)) score += priorityBand === "default" ? 5 : 8;
  if (isLowerQualitySource(host, sourceLabel)) score -= priorityBand === "default" ? 4 : 7;
  if (host.endsWith(".kr") || host.endsWith(".co.kr")) score += 3;
  if (priorityBand !== "default" && /(hankyung\.com|mk\.co\.kr|edaily\.co\.kr|yna\.co\.kr|sedaily\.com|newsis\.com)/i.test(host)) {
    score += 5;
  }
  if (article.source === "naver-search") score += 2;
  if (isBlockedDomain(host, entry)) score -= 20;
  if (!(host.endsWith(".kr") || host.endsWith(".co.kr"))) score -= 6;

  const articleTime = Date.parse(article.date ?? "");
  if (Number.isFinite(articleTime)) {
    const ageDays = (Date.now() - articleTime) / (1000 * 60 * 60 * 24);
    if (ageDays > 21) score -= 12;
    else if (ageDays > 10) score -= 6;
    else if (ageDays <= 2) score += 2;
  }

  return score;
}

function ageDaysOf(article) {
  const articleTime = Date.parse(article.date ?? "");
  if (!Number.isFinite(articleTime)) {
    return null;
  }

  return (Date.now() - articleTime) / (1000 * 60 * 60 * 24);
}

function shouldExcludeArticleByQuality(article, entry, options = {}) {
  const host = hostnameOf(article.url ?? "");
  const sourceLabel = sourceLabelOf(article);
  const priorityBand = getPriorityBand(options.priorityRank ?? null);
  const trusted = isTrustedSource(host, sourceLabel);
  const lowerQuality = isLowerQualitySource(host, sourceLabel);
  const preferredDomain = isPreferredDomain(host, entry);
  const koreanDomain = host.endsWith(".kr") || host.endsWith(".co.kr");
  const ageDays = ageDaysOf(article);

  if (priorityBand === "top20") {
    if (lowerQuality && !(trusted || preferredDomain)) return true;
    if (ageDays !== null && ageDays > 10) return true;
    if (!(trusted || preferredDomain || koreanDomain) && ageDays !== null && ageDays > 5) return true;
  }

  if (priorityBand === "top100") {
    if (lowerQuality && !(trusted || preferredDomain)) return true;
    if (ageDays !== null && ageDays > 21) return true;
    if (!(trusted || preferredDomain || koreanDomain) && ageDays !== null && ageDays > 10) return true;
  }

  return false;
}

export function dedupeArticles(items) {
  const bestByKey = new Map();

  for (const item of items) {
    const host = hostnameOf(item.url ?? "");
    const sourceLabel = sourceLabelOf(item);
    const titleKey = canonicalHeadline(item.headline ?? "");
    const summaryKey = summarySignature(item.summary ?? "");
    const dedupeKey = titleKey.length >= 12 ? titleKey : `${titleKey}|${summaryKey}`;
    const qualityScore =
      (isTrustedSource(host, sourceLabel) ? 10 : 0) +
      (isPreferredDomain(host, {
        preferredDomains: [],
        blockedDomains: []
      })
        ? 3
        : 0) +
      (host.endsWith(".kr") || host.endsWith(".co.kr") ? 2 : 0) -
      (isLowerQualitySource(host, sourceLabel) ? 5 : 0);
    const recencyScore = Date.parse(item.date ?? "") || 0;
    const existing = bestByKey.get(`${item.ticker ?? ""}|${dedupeKey}`);

    if (!existing) {
      bestByKey.set(`${item.ticker ?? ""}|${dedupeKey}`, {
        item,
        qualityScore,
        recencyScore
      });
      continue;
    }

    if (qualityScore > existing.qualityScore || (qualityScore === existing.qualityScore && recencyScore > existing.recencyScore)) {
      bestByKey.set(`${item.ticker ?? ""}|${dedupeKey}`, {
        item,
        qualityScore,
        recencyScore
      });
    }
  }

  return Array.from(bestByKey.values()).map((entry) => entry.item);
}

function decodeXmlEntities(value) {
  return (value ?? "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractTagValue(block, tagName) {
  const match = block.match(new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match ? decodeXmlEntities(match[1].trim()) : "";
}

function extractTagAttribute(block, tagName, attributeName) {
  const match = block.match(new RegExp(`<${tagName}[^>]*${attributeName}="([^"]+)"[^>]*>`, "i"));
  return match ? decodeXmlEntities(match[1].trim()) : "";
}

function parseGoogleNewsRss(xml) {
  const items = [];
  const matches = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];

  for (const itemBlock of matches) {
    items.push({
      title: stripHtml(extractTagValue(itemBlock, "title")),
      link: extractTagValue(itemBlock, "link"),
      pubDate: extractTagValue(itemBlock, "pubDate"),
      description: stripHtml(extractTagValue(itemBlock, "description")),
      sourceName: stripHtml(extractTagValue(itemBlock, "source")),
      sourceUrl: extractTagAttribute(itemBlock, "source", "url")
    });
  }

  return items;
}

function parseStandardRss(xml) {
  const items = [];
  const matches = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];

  for (const itemBlock of matches) {
    items.push({
      title: stripHtml(extractTagValue(itemBlock, "title")),
      link: extractTagValue(itemBlock, "link"),
      pubDate: extractTagValue(itemBlock, "pubDate"),
      description: stripHtml(extractTagValue(itemBlock, "description"))
    });
  }

  return items;
}

function rankArticles(items, entry, maxItems, options = {}) {
  const priorityBand = getPriorityBand(options.priorityRank ?? null);
  const minScore =
    entry.minArticleScore ??
    (priorityBand === "top20" ? 8 : priorityBand === "top100" ? 7 : 8);
  const sourceDiversityLimit =
    options.sourceDiversityLimit ??
    (() => {
      const configured = Math.max(1, Number.parseInt(process.env.SWING_RADAR_NEWS_SOURCE_DIVERSITY_LIMIT ?? "2", 10));
      if (priorityBand === "top20") return Math.min(Math.max(configured, 2), 2);
      if (priorityBand === "top100") return Math.min(Math.max(configured, 3), 3);
      return configured;
    })();

  return applySourceDiversity(
    dedupeArticles(items)
    .filter((item) => !shouldExcludeArticleByQuality(item, entry, options))
    .map((item) => ({ item, score: scoreArticle(item, entry, options) }))
    .filter((entryScore) => entryScore.score >= minScore)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return right.item.date.localeCompare(left.item.date);
    })
    .map((entryScore) => entryScore.item)
    .slice(0, Math.max(maxItems * 3, maxItems)),
    sourceDiversityLimit
  ).slice(0, maxItems);
}

export function filterAndRankArticles(items, entry, maxItems, options = {}) {
  return rankArticles(
    items.filter((item) => matchesFilters(item, entry)),
    entry,
    maxItems,
    options
  );
}

function applySourceDiversity(items, perSourceLimit) {
  const counts = new Map();
  const filtered = [];

  for (const item of items) {
    const bucket = sourceBucketOf(item);
    const currentCount = counts.get(bucket) ?? 0;
    if (currentCount >= perSourceLimit) {
      continue;
    }

    counts.set(bucket, currentCount + 1);
    filtered.push(item);
  }

  return filtered;
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

export async function fetchGoogleNewsRss(entry, maxItems, telemetry, options = {}) {
  const queries = buildNewsQueries(entry, "google-news-rss", options);
  const priorityBand = getPriorityBand(options.priorityRank ?? null);
  const effectiveMaxItems = priorityBand === "top20" ? Math.max(maxItems, 10) : priorityBand === "top100" ? Math.max(maxItems, 8) : maxItems;
  const items = [];

  for (const query of queries) {
    const url = new URL("https://news.google.com/rss/search");
    url.searchParams.set("q", query);
    url.searchParams.set("hl", "ko");
    url.searchParams.set("gl", "KR");
    url.searchParams.set("ceid", "KR:ko");

    const xml = await fetchText(url.toString(), {
      headers: {
        "User-Agent": "SWING-RADAR/0.1"
      }
    }, telemetry);

    for (const article of parseGoogleNewsRss(xml)) {
      const candidate = {
        ticker: entry.ticker,
        company: entry.company,
        headline: article.title,
        summary: article.description,
        source: article.sourceName || "google-news-rss",
        url: article.sourceUrl || article.link,
        date: article.pubDate ? new Date(article.pubDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
      };

      items.push({
        ...candidate,
        impact: mapImpact(candidate.headline, candidate.summary)
      });
    }
  }

  return filterAndRankArticles(items, entry, effectiveMaxItems, options).slice(0, effectiveMaxItems);
}

export async function fetchCuratedRssPool(telemetry = {}) {
  const items = [];

  for (const feed of CURATED_RSS_FEEDS) {
    try {
      const xml = await fetchText(feed.url, {
        headers: {
          "User-Agent": "SWING-RADAR/0.1"
        }
      }, telemetry);

      for (const article of parseStandardRss(xml)) {
        items.push({
          headline: article.title,
          summary: article.description,
          source: feed.source,
          url: article.link,
          date: article.pubDate ? new Date(article.pubDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
        });
      }
    } catch (error) {
      telemetry.onFeedFailure?.({
        provider: "curated-rss",
        source: feed.source,
        url: feed.url,
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return dedupeArticles(items);
}

export function selectCuratedRssNews(feedItems, entry, maxItems, options = {}) {
  const priorityBand = getPriorityBand(options.priorityRank ?? null);
  const effectiveMaxItems = priorityBand === "top20" ? Math.max(maxItems, 8) : priorityBand === "top100" ? Math.max(maxItems, 6) : maxItems;

  return filterAndRankArticles(
    feedItems.map((item) => ({
      ...item,
      ticker: entry.ticker,
      company: entry.company,
      impact: item.impact ?? mapImpact(item.headline, item.summary)
    })),
    entry,
    effectiveMaxItems,
    options
  ).slice(0, effectiveMaxItems);
}
