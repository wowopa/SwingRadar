export function buildGoogleNewsSearchUrl({
  ticker,
  company
}: {
  ticker: string;
  company?: string | null;
}) {
  const query = company?.trim() || ticker?.trim() || "";
  return `https://news.google.com/search?q=${encodeURIComponent(query)}&hl=ko&gl=KR&ceid=KR%3Ako`;
}
