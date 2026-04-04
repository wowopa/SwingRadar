"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { usePathname } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  APP_TUTORIAL_DEFINITIONS,
  resolveTutorialScope,
  type AppTutorialScope
} from "@/lib/tutorial/app-tutorial-content";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "swing-radar:tutorial-progress:v1";

type TutorialProgress = Partial<Record<AppTutorialScope, boolean>>;

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
  label?: string;
}

function loadTutorialProgress() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }

    return JSON.parse(raw) as TutorialProgress;
  } catch {
    return {};
  }
}

function saveTutorialProgress(progress: TutorialProgress) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function AppTutorialController() {
  const pathname = usePathname();
  const scope = useMemo(() => resolveTutorialScope(pathname), [pathname]);
  const definition = scope ? APP_TUTORIAL_DEFINITIONS[scope] : null;
  const [progress, setProgress] = useState<TutorialProgress>({});
  const [isHydrated, setIsHydrated] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);

  useEffect(() => {
    setProgress(loadTutorialProgress());
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    saveTutorialProgress(progress);
  }, [isHydrated, progress]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (!scope || !definition) {
      setIsOpen(false);
      return;
    }

    setStepIndex(0);
    setIsOpen(!progress[scope]);
  }, [definition, isHydrated, progress, scope]);

  useEffect(() => {
    function handleOpenTutorial(event: Event) {
      const customEvent = event as CustomEvent<{ resetAll?: boolean }>;
      const resetAll = Boolean(customEvent.detail?.resetAll);

      if (resetAll) {
        setProgress({});
      }

      if (!scope) {
        return;
      }

      setStepIndex(0);
      setIsOpen(true);
    }

    window.addEventListener("swing-radar:tutorial-open", handleOpenTutorial as EventListener);
    return () => {
      window.removeEventListener("swing-radar:tutorial-open", handleOpenTutorial as EventListener);
    };
  }, [scope]);

  const currentStep = definition?.steps[stepIndex] ?? null;

  useEffect(() => {
    if (!isOpen || !currentStep?.target) {
      return;
    }

    const target = document.querySelector<HTMLElement>(currentStep.target);
    if (!target) {
      return;
    }

    const rect = target.getBoundingClientRect();
    const topThreshold = window.innerWidth < 640 ? 88 : 108;
    const bottomThreshold = window.innerHeight - (window.innerWidth < 640 ? 240 : 164);

    if (rect.top < topThreshold || rect.bottom > bottomThreshold) {
      target.scrollIntoView({
        block: "center",
        inline: "nearest",
        behavior: "smooth"
      });
    }
  }, [currentStep?.target, isOpen, pathname]);

  useEffect(() => {
    if (!isOpen || !currentStep?.target) {
      setSpotlight(null);
      return;
    }

    let frame = 0;

    const updateSpotlight = () => {
      cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const target = document.querySelector<HTMLElement>(currentStep.target!);
        if (!target) {
          setSpotlight(null);
          return;
        }

        const rect = target.getBoundingClientRect();
        const padding = currentStep.spotlightPadding ?? (window.innerWidth < 640 ? 10 : 16);
        const top = Math.max(rect.top - padding, 8);
        const left = Math.max(rect.left - padding, 8);
        const right = Math.min(rect.right + padding, window.innerWidth - 8);
        const bottom = Math.min(rect.bottom + padding, window.innerHeight - 8);
        const width = Math.max(right - left, 0);
        const height = Math.max(bottom - top, 0);

        if (width <= 0 || height <= 0) {
          setSpotlight(null);
          return;
        }

        setSpotlight({
          top,
          left,
          width,
          height,
          label: currentStep.spotlightLabel
        });
      });
    };

    updateSpotlight();
    window.addEventListener("resize", updateSpotlight);
    window.addEventListener("scroll", updateSpotlight, true);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateSpotlight);
      window.removeEventListener("scroll", updateSpotlight, true);
    };
  }, [
    currentStep?.spotlightLabel,
    currentStep?.spotlightPadding,
    currentStep?.target,
    isOpen,
    pathname,
    stepIndex
  ]);

  if (!isHydrated || !definition || !scope || !currentStep || !isOpen) {
    return null;
  }

  const isLastStep = stepIndex === definition.steps.length - 1;
  const currentScope = scope;

  function markSeenAndClose() {
    setProgress((current) => ({
      ...current,
      [currentScope]: true
    }));
    setIsOpen(false);
  }

  function handleNext() {
    if (isLastStep) {
      markSeenAndClose();
      return;
    }

    setStepIndex((current) => current + 1);
  }

  function handlePrevious() {
    setStepIndex((current) => Math.max(0, current - 1));
  }

  function OverlaySlice({
    style
  }: {
    style: CSSProperties;
  }) {
    return (
      <button
        type="button"
        aria-label="튜토리얼 닫기"
        className="fixed z-[90] bg-[rgba(15,20,31,0.2)] transition-colors"
        onClick={markSeenAndClose}
        style={style}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[90]">
      {spotlight ? (
        <>
          <OverlaySlice style={{ top: 0, left: 0, right: 0, height: spotlight.top }} />
          <OverlaySlice style={{ top: spotlight.top, left: 0, width: spotlight.left, height: spotlight.height }} />
          <OverlaySlice
            style={{
              top: spotlight.top,
              left: spotlight.left + spotlight.width,
              right: 0,
              height: spotlight.height
            }}
          />
          <OverlaySlice
            style={{
              top: spotlight.top + spotlight.height,
              left: 0,
              right: 0,
              bottom: 0
            }}
          />

          <div
            className="pointer-events-none fixed z-[91] rounded-[30px] border-2 border-[hsl(42_76%_66%)] bg-white/[0.04] shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_0_0_10px_rgba(139,107,46,0.14),0_28px_64px_-36px_rgba(15,20,31,0.72)]"
            style={{
              top: spotlight.top,
              left: spotlight.left,
              width: spotlight.width,
              height: spotlight.height
            }}
          />

          {spotlight.label ? (
            <div
              className="pointer-events-none fixed z-[91] rounded-full border border-[hsl(42_76%_66%_/_0.45)] bg-[rgba(15,20,31,0.92)] px-3 py-1.5 text-xs font-medium text-white shadow-[0_12px_24px_-18px_rgba(15,20,31,0.9)]"
              style={{
                top: Math.max(spotlight.top - 18, 10),
                left: spotlight.left + 16,
                maxWidth: "min(calc(100vw - 40px), 220px)"
              }}
            >
              {spotlight.label}
            </div>
          ) : null}
        </>
      ) : (
        <button
          type="button"
          aria-label="튜토리얼 닫기"
          className="absolute inset-0 bg-[rgba(15,20,31,0.2)]"
          onClick={markSeenAndClose}
        />
      )}

      <div
        className={cn(
          "absolute inset-x-3 bottom-3 z-[92] rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(15,20,31,0.985),rgba(24,31,45,0.975))] p-4 text-white shadow-[0_28px_64px_-28px_rgba(15,20,31,0.76)]",
          "sm:bottom-6 sm:right-6 sm:left-auto sm:w-[460px] sm:p-5"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="border-white/16 bg-white/10 text-white">
                튜토리얼
              </Badge>
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-white/62">
                {definition.shortLabel}
              </span>
            </div>
            <div>
              <p className="text-lg font-semibold tracking-[-0.03em] text-white">{currentStep.title}</p>
              <p className="mt-2 text-sm leading-6 text-white/78">{currentStep.body}</p>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={markSeenAndClose}
            className="h-9 w-9 shrink-0 rounded-full text-white/72 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {currentStep.bullets?.length ? (
          <div className="mt-4 space-y-2 rounded-[22px] border border-white/10 bg-white/6 p-4">
            {currentStep.bullets.map((bullet) => (
              <div key={bullet} className="flex gap-2 text-sm leading-6 text-white/78">
                <span className="mt-[0.48rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(42_76%_66%)]" />
                <span>{bullet}</span>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-4 flex items-center gap-2">
          {definition.steps.map((step, index) => (
            <span
              key={step.title}
              className={cn(
                "h-1.5 flex-1 rounded-full transition",
                index === stepIndex ? "bg-white" : index < stepIndex ? "bg-[hsl(42_76%_66%)]" : "bg-white/16"
              )}
            />
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-white/60">
          <span>
            {stepIndex + 1} / {definition.steps.length}
          </span>
          <Link
            href="/account"
            className="font-medium text-white/72 underline-offset-4 hover:text-white hover:underline"
          >
            Account에서 다시 보기
          </Link>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-between">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={markSeenAndClose}
              className="h-10 rounded-full border border-white/12 px-4 text-white/78 hover:bg-white/10 hover:text-white"
            >
              건너뛰기
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={handlePrevious}
              disabled={stepIndex === 0}
              className="h-10 rounded-full border border-white/12 px-4 text-white/78 hover:bg-white/10 hover:text-white disabled:opacity-35"
            >
              이전
            </Button>
          </div>
          <Button
            type="button"
            onClick={handleNext}
            className="h-10 rounded-full bg-white text-slate-950 hover:bg-white/92"
          >
            {isLastStep ? "완료" : "다음"}
          </Button>
        </div>
      </div>
    </div>
  );
}
