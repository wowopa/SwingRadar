import { describe, expect, it } from "vitest";

import { getFeaturedSymbols, searchSymbols } from "@/lib/symbols/master";

describe("symbol search", () => {
  it("matches by ticker, aliases, and keyword fields", () => {
    expect(searchSymbols("005930", 5).map((item) => item.ticker)).toContain("005930");
    expect(searchSymbols("Samsung Electronics", 5).map((item) => item.ticker)).toContain("005930");
    expect(searchSymbols("Celltrion", 5).map((item) => item.ticker)).toContain("068270");
  });

  it("ignores whitespace and prioritizes stronger matches first", () => {
    const results = searchSymbols("  005 930 ", 5);

    expect(results[0]?.ticker).toBe("005930");
  });

  it("returns ready symbols first in featured results", () => {
    const featured = getFeaturedSymbols(5);

    expect(featured[0]?.status).toBe("ready");
  });
});
