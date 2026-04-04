import { describe, expect, it } from "vitest";

import { getKrxMarketSessionStatus } from "@/lib/server/krx-market-calendar";

describe("getKrxMarketSessionStatus", () => {
  it("marks Saturdays as closed weekend sessions", () => {
    const session = getKrxMarketSessionStatus(new Date("2026-04-04T09:00:00+09:00"));

    expect(session.isOpenDay).toBe(false);
    expect(session.closureKind).toBe("weekend");
    expect(session.closureLabel).toContain("휴장");
    expect(session.headline).toBe("오늘은 지난 기록을 검토하고, 새로운 계획을 만들어보세요.");
  });

  it("marks Korean public holidays as closed holiday sessions", () => {
    const session = getKrxMarketSessionStatus(new Date("2026-05-05T09:00:00+09:00"));

    expect(session.isOpenDay).toBe(false);
    expect(session.closureKind).toBe("holiday");
    expect(session.holidayName).toBeTruthy();
    expect(session.headline).toBe("오늘은 지난 기록을 검토하고, 새로운 계획을 만들어보세요.");
  });

  it("marks ordinary weekdays as open sessions", () => {
    const session = getKrxMarketSessionStatus(new Date("2026-04-06T09:00:00+09:00"));

    expect(session.isOpenDay).toBe(true);
    expect(session.closureKind).toBe("open");
    expect(session.closureLabel).toBe("개장일");
  });
});
