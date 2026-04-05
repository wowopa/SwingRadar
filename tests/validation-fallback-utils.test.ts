import { describe, expect, it } from "vitest";

import {
  buildDirectTrackingValidationProfile,
  buildTrackingValidationProxy
} from "../scripts/lib/validation-fallback-utils.mjs";

interface TrackingFallbackEntry {
  status: string;
  holdingDays: number;
  mfe: number;
  mae: number;
}

interface ValidationFallbackProfile {
  hitRate: number;
  avgReturn: number | null;
  sampleSize: number;
  maxDrawdown: number | null;
  sourceCount?: number;
  latestStatus?: string | null;
}

const buildDirectTrackingValidationProfileTyped = buildDirectTrackingValidationProfile as (
  trackingItems: TrackingFallbackEntry[]
) => ValidationFallbackProfile | null;

const buildTrackingValidationProxyTyped = buildTrackingValidationProxy as (
  item: TrackingFallbackEntry
) => ValidationFallbackProfile;

describe("validation fallback utils", () => {
  it("builds a shared tracking profile from closed tracking history", () => {
    const profile = buildDirectTrackingValidationProfileTyped([
      {
        status: "closed_win",
        holdingDays: 6,
        mfe: 8.2,
        mae: -2.4
      },
      {
        status: "closed_loss",
        holdingDays: 4,
        mfe: 1.1,
        mae: -5.9
      },
      {
        status: "closed_timeout",
        holdingDays: 7,
        mfe: 3.3,
        mae: -2.1
      }
    ]);

    expect(profile).toMatchObject({
      sourceCount: 3
    });
    expect(profile?.hitRate).toBeGreaterThanOrEqual(42);
    expect(profile?.sampleSize).toBeGreaterThanOrEqual(12);
    expect(profile?.maxDrawdown).toBeLessThan(0);
  });

  it("ignores live watch and active entries when building direct tracking fallback", () => {
    const profile = buildDirectTrackingValidationProfileTyped([
      {
        status: "watch",
        holdingDays: 1,
        mfe: 0,
        mae: 0
      },
      {
        status: "active",
        holdingDays: 2,
        mfe: 1.2,
        mae: -1.1
      }
    ]);

    expect(profile).toBeNull();
  });

  it("keeps single tracking proxies interpretable for later aggregation", () => {
    const proxy = buildTrackingValidationProxyTyped({
      status: "closed_win",
      holdingDays: 5,
      mfe: 7.5,
      mae: -2.2
    });

    expect(proxy).toMatchObject({
      hitRate: 62,
      sampleSize: 10
    });
    expect(proxy.avgReturn).toBeGreaterThan(0);
  });
});
