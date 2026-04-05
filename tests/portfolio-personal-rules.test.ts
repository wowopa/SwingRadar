import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  loadPortfolioPersonalRulesForUser,
  savePortfolioPersonalRuleForUser,
  setPortfolioPersonalRuleActiveForUser
} from "@/lib/server/portfolio-personal-rules";

describe("portfolio personal rules storage", () => {
  let tempDir = "";
  const previousRulesFile = process.env.SWING_RADAR_USER_PORTFOLIO_PERSONAL_RULES_FILE;
  const previousDatabaseUrl = process.env.SWING_RADAR_DATABASE_URL;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "swing-radar-portfolio-personal-rules-"));
    process.env.SWING_RADAR_USER_PORTFOLIO_PERSONAL_RULES_FILE = path.join(tempDir, "portfolio-personal-rules.json");
    delete process.env.SWING_RADAR_DATABASE_URL;
  });

  afterEach(async () => {
    if (previousRulesFile === undefined) {
      delete process.env.SWING_RADAR_USER_PORTFOLIO_PERSONAL_RULES_FILE;
    } else {
      process.env.SWING_RADAR_USER_PORTFOLIO_PERSONAL_RULES_FILE = previousRulesFile;
    }

    if (previousDatabaseUrl === undefined) {
      delete process.env.SWING_RADAR_DATABASE_URL;
    } else {
      process.env.SWING_RADAR_DATABASE_URL = previousDatabaseUrl;
    }

    await rm(tempDir, { recursive: true, force: true });
  });

  it("stores promoted personal rules separately for each user", async () => {
    await savePortfolioPersonalRuleForUser("user-1", {
      text: "보류 상태에서는 당일 진입하지 않기",
      sourceCategory: "next_rule",
      updatedBy: "tester@example.com"
    });
    await savePortfolioPersonalRuleForUser("user-2", {
      text: "확인 가격 실패면 당일 보류",
      sourceCategory: "watchouts",
      updatedBy: "other@example.com"
    });

    const user1Rules = await loadPortfolioPersonalRulesForUser("user-1");
    const user2Rules = await loadPortfolioPersonalRulesForUser("user-2");

    expect(user1Rules).toHaveLength(1);
    expect(user1Rules[0]).toMatchObject({
      text: "보류 상태에서는 당일 진입하지 않기",
      sourceCategory: "next_rule",
      sourceLabel: "다음 규칙",
      isActive: true,
      updatedBy: "tester@example.com"
    });
    expect(user2Rules).toHaveLength(1);
    expect(user2Rules[0]).toMatchObject({
      text: "확인 가격 실패면 당일 보류",
      sourceCategory: "watchouts",
      sourceLabel: "아쉬운 점",
      isActive: true,
      updatedBy: "other@example.com"
    });
  });

  it("can disable and re-enable a promoted rule", async () => {
    const saved = await savePortfolioPersonalRuleForUser("user-1", {
      text: "확인 가격 실패면 당일 보류",
      sourceCategory: "watchouts",
      updatedBy: "tester@example.com"
    });

    await setPortfolioPersonalRuleActiveForUser("user-1", {
      id: saved.id,
      isActive: false,
      updatedBy: "tester@example.com"
    });

    let rules = await loadPortfolioPersonalRulesForUser("user-1");
    expect(rules[0]).toMatchObject({
      id: saved.id,
      isActive: false
    });

    await savePortfolioPersonalRuleForUser("user-1", {
      text: "확인 가격 실패면 당일 보류",
      sourceCategory: "watchouts",
      updatedBy: "tester@example.com"
    });

    rules = await loadPortfolioPersonalRulesForUser("user-1");
    expect(rules[0]).toMatchObject({
      id: saved.id,
      isActive: true
    });
  });
});
