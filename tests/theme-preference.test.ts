import { describe, expect, it } from "vitest";

import {
  DEFAULT_THEME_PREFERENCE,
  createThemeInitScript,
  normalizeThemePreference,
  resolveThemePreference
} from "@/lib/theme/theme-preference";

describe("theme preference", () => {
  it("normalizes invalid values back to the default light theme", () => {
    expect(normalizeThemePreference("light")).toBe("light");
    expect(normalizeThemePreference("dark")).toBe("dark");
    expect(normalizeThemePreference("system")).toBe("system");
    expect(normalizeThemePreference("sepia")).toBe(DEFAULT_THEME_PREFERENCE);
    expect(normalizeThemePreference(null)).toBe(DEFAULT_THEME_PREFERENCE);
  });

  it("resolves the system preference against the OS theme", () => {
    expect(resolveThemePreference("light", false)).toBe("light");
    expect(resolveThemePreference("dark", true)).toBe("dark");
    expect(resolveThemePreference("system", false)).toBe("light");
    expect(resolveThemePreference("system", true)).toBe("dark");
  });

  it("builds an init script that sets both theme preference and resolved theme", () => {
    const script = createThemeInitScript();

    expect(script).toContain("dataset.theme");
    expect(script).toContain("dataset.themeResolved");
    expect(script).toContain(DEFAULT_THEME_PREFERENCE);
  });
});
