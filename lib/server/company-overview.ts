const NAVER_COMPANY_OVERVIEW_URL = "https://navercomp.wisereport.co.kr/v2/company/c1010001.aspx";
const COMPANY_OVERVIEW_TIMEOUT_MS = 8000;

function stripTags(value: string) {
  return value.replace(/<[^>]+>/g, " ");
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_match: string, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match: string, code: string) => String.fromCodePoint(parseInt(code, 16)));
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function extractOverviewItems(html: string) {
  const blockMatch = html.match(/<div class="cmp_comment">([\s\S]*?)<\/div>/i);
  if (!blockMatch) {
    return [];
  }

  const itemMatches = [...blockMatch[1].matchAll(/<li class="dot_cmp"[^>]*>([\s\S]*?)<\/li>/gi)];
  return itemMatches
    .map((match) => normalizeWhitespace(decodeHtmlEntities(stripTags(match[1]))))
    .filter(Boolean);
}

export async function getCompanyOverviewLines(ticker: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), COMPANY_OVERVIEW_TIMEOUT_MS);

  try {
    const url = new URL(NAVER_COMPANY_OVERVIEW_URL);
    url.searchParams.set("cmp_cd", ticker);

    const response = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        referer: "https://finance.naver.com/"
      },
      cache: "no-store",
      signal: controller.signal
    });

    if (!response.ok) {
      return [];
    }

    const html = await response.text();
    return extractOverviewItems(html);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
