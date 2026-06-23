import { describe, expect, it } from "vitest";
import {
  localizeMarketCategory,
  localizeMarketQuestion,
  localizeOutcome
} from "./market-localization";

describe("market localization", () => {
  it("translates common leader-out market questions for Chinese users", () => {
    expect(
      localizeMarketQuestion(
        "Will Ahmed al-Sharaa be the next leader out before 2027?",
        "zh-CN"
      )
    ).toBe("艾哈迈德·沙拉会在 2027 年前成为下一位下台的领导人吗？");

    expect(
      localizeMarketQuestion(
        "Will no listed leader be out before 2027?",
        "zh-CN"
      )
    ).toBe("没有列出的领导人会在 2027 年前下台吗？");

    expect(
      localizeMarketQuestion(
        "Will Delcy Rodr?-guez be the next leader out before 2027?",
        "zh-CN"
      )
    ).toBe("德尔西·罗德里格斯会在 2027 年前成为下一位下台的领导人吗？");
  });

  it("translates common sports and entertainment market questions for Chinese users", () => {
    expect(
      localizeMarketQuestion("Will Spain win the 2026 FIFA World Cup?", "zh-CN")
    ).toBe("西班牙会赢得 2026 年 FIFA 世界杯吗？");

    expect(localizeMarketQuestion("Spread: DR Congo (-3.5)", "zh-CN")).toBe(
      "让分：刚果民主共和国（-3.5）"
    );

    expect(
      localizeMarketQuestion("Colombia vs. DR Congo: O/U 8.5", "zh-CN")
    ).toBe("哥伦比亚 对 刚果民主共和国：总分大/小 8.5");

    expect(
      localizeMarketQuestion("New Rihanna Album before GTA VI?", "zh-CN")
    ).toBe("蕾哈娜会在 GTA VI 前发布新专辑吗？");
  });

  it("keeps raw market copy in English mode", () => {
    const question = "Will Claudia Sheinbaum be the next leader out before 2027?";

    expect(localizeMarketQuestion(question, "en")).toBe(question);
  });

  it("translates categories and Yes/No outcomes for Chinese users", () => {
    expect(localizeMarketCategory("Politics", "zh-CN", "市场")).toBe("政治");
    expect(localizeMarketCategory("Sports", "zh-CN", "市场")).toBe("体育");
    expect(localizeOutcome("Yes", "zh-CN")).toBe("是");
    expect(localizeOutcome("No", "zh-CN")).toBe("否");
    expect(localizeOutcome("Over", "zh-CN")).toBe("大于");
    expect(localizeOutcome("DR Congo", "zh-CN")).toBe("刚果民主共和国");
  });
});
