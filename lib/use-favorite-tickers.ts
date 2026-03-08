"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "swing-radar.favorite-tickers";

export function useFavoriteTickers() {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setFavorites(parsed.filter((item): item is string => typeof item === "string"));
      }
    } catch {
      setFavorites([]);
    }
  }, []);

  const toggleFavorite = (ticker: string) => {
    setFavorites((current) => {
      const next = current.includes(ticker) ? current.filter((item) => item !== ticker) : [...current, ticker];
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  return {
    favorites,
    isFavorite: (ticker: string) => favorites.includes(ticker),
    toggleFavorite
  };
}
