"use client";

import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "swing-radar.admin-token";

export function useAdminToken() {
  const [token, setTokenState] = useState("");

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        setTokenState(raw);
      }
    } catch {
      setTokenState("");
    }
  }, []);

  const setToken = (nextToken: string) => {
    setTokenState(nextToken);

    try {
      if (nextToken.trim()) {
        window.sessionStorage.setItem(STORAGE_KEY, nextToken);
      } else {
        window.sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignore browser storage failures and keep the in-memory token.
    }
  };

  const authHeaders = useMemo(
    () => (token.trim() ? { Authorization: `Bearer ${token.trim()}` } : undefined),
    [token]
  );

  return {
    token,
    setToken,
    authHeaders
  };
}
