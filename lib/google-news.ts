export function buildGoogleNewsSearchUrl({
  ticker,
  company
}: {
  ticker: string;
  company?: string | null;
}) {
  const terms = [company?.trim(), ticker?.trim(), "주식"].filter((value): value is string => Boolean(value)).join(" ");
  return `https://news.google.com/search?q=${encodeURIComponent(terms)}&hl=ko&gl=KR&ceid=KR%3Ako`;
}
