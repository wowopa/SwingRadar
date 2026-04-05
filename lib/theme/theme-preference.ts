export const THEME_PREFERENCE_STORAGE_KEY = "swing-radar:theme-preference:v1";
export const THEME_PREFERENCE_EVENT = "swing-radar:theme-change";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const DEFAULT_THEME_PREFERENCE: ThemePreference = "light";

const SYSTEM_DARK_QUERY = "(prefers-color-scheme: dark)";

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export function normalizeThemePreference(value: unknown): ThemePreference {
  return isThemePreference(value) ? value : DEFAULT_THEME_PREFERENCE;
}

export function resolveThemePreference(
  preference: ThemePreference,
  systemPrefersDark: boolean
): ResolvedTheme {
  if (preference === "system") {
    return systemPrefersDark ? "dark" : "light";
  }

  return preference;
}

export function readStoredThemePreference() {
  if (typeof window === "undefined") {
    return DEFAULT_THEME_PREFERENCE;
  }

  try {
    return normalizeThemePreference(window.localStorage.getItem(THEME_PREFERENCE_STORAGE_KEY));
  } catch {
    return DEFAULT_THEME_PREFERENCE;
  }
}

export function getResolvedThemeFromDocument(): ResolvedTheme {
  if (typeof document === "undefined") {
    return "light";
  }

  return document.documentElement.dataset.themeResolved === "dark" ? "dark" : "light";
}

function getSystemResolvedTheme() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "light" as ResolvedTheme;
  }

  return window.matchMedia(SYSTEM_DARK_QUERY).matches ? "dark" : "light";
}

export function applyThemePreference(preference: ThemePreference) {
  if (typeof document === "undefined") {
    return "light" as ResolvedTheme;
  }

  const resolved = resolveThemePreference(preference, getSystemResolvedTheme() === "dark");
  const root = document.documentElement;
  root.dataset.theme = preference;
  root.dataset.themeResolved = resolved;
  root.style.colorScheme = resolved;
  return resolved;
}

export function persistThemePreference(preference: ThemePreference) {
  if (typeof window === "undefined") {
    return "light" as ResolvedTheme;
  }

  try {
    window.localStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, preference);
  } catch {
    // Ignore storage failures and still apply the in-memory preference.
  }

  const resolved = applyThemePreference(preference);
  window.dispatchEvent(
    new CustomEvent(THEME_PREFERENCE_EVENT, {
      detail: {
        preference,
        resolved
      }
    })
  );
  return resolved;
}

export function createThemeInitScript() {
  return `(() => {
    try {
      const key = ${JSON.stringify(THEME_PREFERENCE_STORAGE_KEY)};
      const raw = window.localStorage.getItem(key);
      const preference = raw === "light" || raw === "dark" || raw === "system" ? raw : ${JSON.stringify(DEFAULT_THEME_PREFERENCE)};
      const resolved = preference === "system"
        ? (window.matchMedia(${JSON.stringify(SYSTEM_DARK_QUERY)}).matches ? "dark" : "light")
        : preference;
      const root = document.documentElement;
      root.dataset.theme = preference;
      root.dataset.themeResolved = resolved;
      root.style.colorScheme = resolved;
    } catch {
      const root = document.documentElement;
      root.dataset.theme = ${JSON.stringify(DEFAULT_THEME_PREFERENCE)};
      root.dataset.themeResolved = "light";
      root.style.colorScheme = "light";
    }
  })();`;
}
