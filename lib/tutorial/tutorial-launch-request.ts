import type { AppTutorialScope } from "@/lib/tutorial/app-tutorial-content";

const TUTORIAL_LAUNCH_REQUEST_KEY = "swing-radar:tutorial-launch-request:v1";

export interface TutorialLaunchRequest {
  scope: AppTutorialScope;
  resetAll?: boolean;
}

export function readTutorialLaunchRequest(): TutorialLaunchRequest | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(TUTORIAL_LAUNCH_REQUEST_KEY);
    if (!raw) {
      return null;
    }

    const payload = JSON.parse(raw) as Partial<TutorialLaunchRequest>;
    if (typeof payload.scope !== "string" || !payload.scope.trim()) {
      return null;
    }

    return {
      scope: payload.scope,
      resetAll: Boolean(payload.resetAll)
    };
  } catch {
    return null;
  }
}

export function writeTutorialLaunchRequest(request: TutorialLaunchRequest) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(TUTORIAL_LAUNCH_REQUEST_KEY, JSON.stringify(request));
}

export function clearTutorialLaunchRequest() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(TUTORIAL_LAUNCH_REQUEST_KEY);
}
