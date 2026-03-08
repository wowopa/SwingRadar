import { describe, expect, it } from "vitest";

import symbolMaster from "@/data/config/symbol-master.json";
import watchlist from "@/data/config/watchlist.json";

const suspiciousPatterns = [
  /\?\S/u,
  /�/u,
  /諛섎/u,
  /\?쇱/u,
  /\?ㅼ/u,
  /\?\?몃/u
];

function collectStrings(value: unknown, bucket: string[]) {
  if (typeof value === "string") {
    bucket.push(value);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectStrings(item, bucket);
    }
    return;
  }

  if (value && typeof value === "object") {
    for (const nested of Object.values(value)) {
      collectStrings(nested, bucket);
    }
  }
}

function hasSuspiciousEncoding(value: string) {
  return suspiciousPatterns.some((pattern) => pattern.test(value));
}

describe("config integrity", () => {
  it("symbol master does not contain garbled text patterns", () => {
    const strings: string[] = [];
    collectStrings(symbolMaster, strings);

    const corrupted = strings.filter(hasSuspiciousEncoding);
    expect(corrupted).toEqual([]);
  });

  it("watchlist config does not contain garbled text patterns", () => {
    const strings: string[] = [];
    collectStrings(watchlist, strings);

    const corrupted = strings.filter(hasSuspiciousEncoding);
    expect(corrupted).toEqual([]);
  });
});
