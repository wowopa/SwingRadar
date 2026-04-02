export function buildNaverFinanceUrl(ticker: string) {
  return `https://finance.naver.com/item/main.naver?code=${encodeURIComponent(ticker)}`;
}

export function buildGoogleQuoteSearchUrl(company: string, ticker: string) {
  const query = `${company} ${ticker} 주가`;
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}
