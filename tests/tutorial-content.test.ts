import { describe, expect, it } from "vitest";

import { APP_TUTORIAL_DEFINITIONS, resolveTutorialScope } from "@/lib/tutorial/app-tutorial-content";
import { hasSeenTutorial, markTutorialSeen, normalizeTutorialProgress } from "@/lib/tutorial/tutorial-progress";

describe("tutorial content", () => {
  it("keeps expanded step counts for every app scope", () => {
    expect(APP_TUTORIAL_DEFINITIONS.today.steps).toHaveLength(6);
    expect(APP_TUTORIAL_DEFINITIONS["opening-check"].steps).toHaveLength(6);
    expect(APP_TUTORIAL_DEFINITIONS.signals.steps).toHaveLength(8);
    expect(APP_TUTORIAL_DEFINITIONS.analysis.steps).toHaveLength(6);
    expect(APP_TUTORIAL_DEFINITIONS.portfolio.steps).toHaveLength(6);
    expect(APP_TUTORIAL_DEFINITIONS["position-detail"].steps).toHaveLength(7);
    expect(APP_TUTORIAL_DEFINITIONS.account.steps).toHaveLength(5);

    for (const definition of Object.values(APP_TUTORIAL_DEFINITIONS)) {
      expect(definition.version).toBeGreaterThanOrEqual(2);
      expect(definition.steps.filter((step) => step.target).length).toBeGreaterThanOrEqual(definition.steps.length - 1);
    }
  });

  it("reopens a scope when older boolean progress is migrated under a newer version", () => {
    const migrated = normalizeTutorialProgress({
      today: true,
      signals: 2,
      invalid: false
    });

    expect(migrated).toEqual({
      today: 1,
      signals: 2
    });
    expect(hasSeenTutorial(migrated, APP_TUTORIAL_DEFINITIONS.today)).toBe(false);
    expect(hasSeenTutorial(migrated, APP_TUTORIAL_DEFINITIONS.signals)).toBe(true);
  });

  it("marks the current scope as seen with the latest definition version", () => {
    const definition = APP_TUTORIAL_DEFINITIONS.portfolio;
    const progress = markTutorialSeen({}, definition);

    expect(progress).toEqual({
      portfolio: definition.version
    });
    expect(hasSeenTutorial(progress, definition)).toBe(true);
  });

  it("maps app routes to the expected tutorial scope", () => {
    expect(resolveTutorialScope("/recommendations")).toBe("today");
    expect(resolveTutorialScope("/opening-check")).toBe("opening-check");
    expect(resolveTutorialScope("/signals")).toBe("signals");
    expect(resolveTutorialScope("/ranking")).toBe("signals");
    expect(resolveTutorialScope("/analysis/005930")).toBe("analysis");
    expect(resolveTutorialScope("/portfolio")).toBe("portfolio");
    expect(resolveTutorialScope("/portfolio/005930")).toBe("position-detail");
    expect(resolveTutorialScope("/account")).toBe("account");
    expect(resolveTutorialScope("/")).toBeNull();
  });
});
