"use client";

import { CircleHelp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TutorialLauncherButtonProps {
  iconOnly?: boolean;
  tone?: "default" | "light";
  resetAll?: boolean;
  className?: string;
  label?: string;
}

export function TutorialLauncherButton({
  iconOnly = false,
  tone = "default",
  resetAll = false,
  className,
  label
}: TutorialLauncherButtonProps) {
  const isLight = tone === "light";

  function openTutorial() {
    window.dispatchEvent(
      new CustomEvent("swing-radar:tutorial-open", {
        detail: {
          resetAll
        }
      })
    );
  }

  return (
    <Button
      type="button"
      variant={isLight ? "secondary" : "outline"}
      size="sm"
      onClick={openTutorial}
      className={cn(
        iconOnly ? "h-10 w-10 rounded-full p-0" : "h-9 rounded-full px-3.5",
        isLight ? "border-white/14 bg-white/10 text-white hover:bg-white/14 hover:text-white" : undefined,
        className
      )}
      aria-label={label ?? (resetAll ? "전체 튜토리얼 다시 보기" : "현재 화면 튜토리얼 보기")}
      title={label ?? (resetAll ? "전체 튜토리얼 다시 보기" : "현재 화면 튜토리얼 보기")}
    >
      <CircleHelp className="h-4 w-4" />
      {iconOnly ? null : <span className="ml-2">{label ?? (resetAll ? "튜토리얼 다시 보기" : "가이드")}</span>}
    </Button>
  );
}
