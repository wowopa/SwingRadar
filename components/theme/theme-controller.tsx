"use client";

import { useEffect } from "react";

import {
  applyThemePreference,
  normalizeThemePreference,
  THEME_PREFERENCE_EVENT,
  THEME_PREFERENCE_STORAGE_KEY
} from "@/lib/theme/theme-preference";

const SYSTEM_DARK_QUERY = "(prefers-color-scheme: dark)";

export function ThemeController() {
  useEffect(() => {
    const media = window.matchMedia(SYSTEM_DARK_QUERY);

    const syncTheme = () => {
      const nextPreference = window.localStorage.getItem(THEME_PREFERENCE_STORAGE_KEY);
      applyThemePreference(normalizeThemePreference(nextPreference));
    };

    syncTheme();

    function handleThemeEvent() {
      syncTheme();
    }

    function handleStorage(event: StorageEvent) {
      if (event.key && event.key !== THEME_PREFERENCE_STORAGE_KEY) {
        return;
      }

      syncTheme();
    }

    function handleSystemChange() {
      syncTheme();
    }

    window.addEventListener(THEME_PREFERENCE_EVENT, handleThemeEvent as EventListener);
    window.addEventListener("storage", handleStorage);
    media.addEventListener("change", handleSystemChange);

    return () => {
      window.removeEventListener(THEME_PREFERENCE_EVENT, handleThemeEvent as EventListener);
      window.removeEventListener("storage", handleStorage);
      media.removeEventListener("change", handleSystemChange);
    };
  }, []);

  return null;
}
