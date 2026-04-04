"use client";

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

  useEffect(() => {
    const nextProgress = loadTutorialProgress();
    setProgress(nextProgress);
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

  if (!isHydrated || !definition || !scope || !isOpen) {
    return null;
  }

  const currentStep = definition.steps[stepIndex];
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

  return (
    <div className="fixed inset-0 z-[90]">
      <button
        type="button"
        aria-label="튜토리얼 닫기"
        className="absolute inset-0 bg-[rgba(15,20,31,0.42)] backdrop-blur-[1px]"
        onClick={markSeenAndClose}
      />

      <div
        className={cn(
          "absolute inset-x-3 bottom-3 rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(15,20,31,0.985),rgba(24,31,45,0.975))] p-4 text-white shadow-[0_28px_64px_-28px_rgba(15,20,31,0.76)]",
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
          <Link href="/account" className="font-medium text-white/72 underline-offset-4 hover:text-white hover:underline">
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
