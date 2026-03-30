import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ScoreLogPanel } from "@/components/tracking/score-log-panel";

describe("ScoreLogPanel", () => {
  it("renders score deltas as points with cumulative totals and chase-guard summary", () => {
    Reflect.set(globalThis, "React", React);
    const html = renderToStaticMarkup(
      <ScoreLogPanel
        items={[
          { timestamp: "2026-03-30 08:50", factor: "핵심 스윙 점수", delta: 12.5, reason: "핵심 점수", scoreAfter: 12.5 },
          { timestamp: "2026-03-30 09:10", factor: "추격 억제", delta: -3.2, reason: "과열 신호를 감점했습니다.", scoreAfter: 9.3 }
        ]}
      />
    );

    expect(html).toContain("최종 점수");
    expect(html).toContain("+12.5점");
    expect(html).toContain("-3.2점");
    expect(html).toContain("누적 9.3점");
    expect(html).toContain("추격 억제:");
    expect(html).not.toContain("%");
  });
});
