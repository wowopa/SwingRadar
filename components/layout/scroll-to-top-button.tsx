"use client";

import { ArrowUp } from "lucide-react";

export function ScrollToTopButton() {
  return (
    <button
      type="button"
      aria-label="맨 위로 이동"
      onClick={() =>
        window.scrollTo({
          top: 0,
          behavior: "smooth"
        })
      }
      className="fixed bottom-5 right-5 z-50 inline-flex h-12 w-12 items-center justify-center rounded-full border border-border/80 bg-white/88 text-foreground shadow-lg backdrop-blur-md transition hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary sm:bottom-6 sm:right-6"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
