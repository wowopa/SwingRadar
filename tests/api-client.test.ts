import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchJson } from "@/lib/repositories/api-client";

describe("fetchJson", () => {
  const originalApiOrigin = process.env.SWING_RADAR_API_ORIGIN;
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SWING_RADAR_API_ORIGIN = "http://localhost:3000";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();

    if (originalApiOrigin === undefined) {
      delete process.env.SWING_RADAR_API_ORIGIN;
    } else {
      process.env.SWING_RADAR_API_ORIGIN = originalApiOrigin;
    }

    if (originalAppUrl === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
    }
  });

  it("returns fallback data when the API responds with an error status", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500
    });

    const payload = await fetchJson("/api/recommendations", {
      fallback: () => Promise.resolve({ source: "fallback" })
    });

    expect(payload).toEqual({ source: "fallback" });
  });

  it("returns fallback data when fetch throws", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));

    const payload = await fetchJson("/api/recommendations", {
      fallback: () => ({ source: "fallback" })
    });

    expect(payload).toEqual({ source: "fallback" });
  });

  it("throws when there is no fallback", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500
    });

    await expect(fetchJson("/api/recommendations")).rejects.toThrow("Failed to fetch /api/recommendations: 500");
  });
});
