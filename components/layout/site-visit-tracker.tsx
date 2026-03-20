"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const SITE_VISIT_STORAGE_KEY = "swing-radar.site-visit";

function getSeoulDateKey() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function shouldTrackPath(pathname: string) {
  const excludedPrefixes = ["/admin", "/maintenance"];
  return !excludedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function SiteVisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || !shouldTrackPath(pathname)) {
      return;
    }

    const dateKey = getSeoulDateKey();

    try {
      const raw = window.localStorage.getItem(SITE_VISIT_STORAGE_KEY);
      if (raw) {
        const payload = JSON.parse(raw) as { date?: string };
        if (payload.date === dateKey) {
          return;
        }
      }
    } catch {
      // Ignore storage parsing issues and continue with the visit request.
    }

    const controller = new AbortController();

    void fetch("/api/visit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ pathname }),
      cache: "no-store",
      keepalive: true,
      signal: controller.signal
    })
      .then((response) => {
        if (!response.ok) {
          return;
        }

        try {
          window.localStorage.setItem(
            SITE_VISIT_STORAGE_KEY,
            JSON.stringify({
              date: dateKey,
              trackedAt: new Date().toISOString()
            })
          );
        } catch {
          // Ignore storage failures because the visit already reached the server.
        }
      })
      .catch(() => {
        // Ignore visit tracking failures to keep page entry smooth.
      });

    return () => {
      controller.abort();
    };
  }, [pathname]);

  return null;
}
