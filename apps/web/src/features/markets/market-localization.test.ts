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
    expect(localizeMarketCategory("Politics", "zh-CN", "其他")).toBe("政治");
    expect(localizeMarketCategory("Sports", "zh-CN", "其他")).toBe("体育");
    expect(localizeMarketCategory("Crypto", "zh-CN", "其他")).toBe("加密");
    expect(localizeMarketCategory("Macro", "zh-CN", "其他")).toBe("宏观");
    expect(localizeMarketCategory(null, "zh-CN", "其他", "Will Marco Rubio enter Iran by June 30?")).toBe("政治");
    expect(localizeMarketCategory(null, "zh-CN", "其他", "Spread: DR Congo (-3.5)")).toBe("体育");
    expect(localizeMarketCategory(null, "zh-CN", "其他", "Will BTC hit $150k in 2027?")).toBe("加密");
    expect(localizeMarketCategory(null, "zh-CN", "其他", "Fed rate cut at next meeting?")).toBe("宏观");
    expect(localizeMarketCategory(null, "zh-CN", "其他", "New Rihanna Album before GTA VI?")).toBe("文化娱乐");
    expect(localizeOutcome("Yes", "zh-CN")).toBe("是");
    expect(localizeOutcome("No", "zh-CN")).toBe("否");
    expect(localizeOutcome("Over", "zh-CN")).toBe("大于");
    expect(localizeOutcome("BTC", "zh-CN")).toBe("比特币");
    expect(localizeOutcome("US recession", "zh-CN")).toBe("美国经济衰退");
    expect(localizeOutcome("DR Congo", "zh-CN")).toBe("刚果民主共和国");
  });

  it("translates common crypto and macro market questions", () => {
    expect(localizeMarketQuestion("Will BTC hit $120k in 2026?", "zh-CN")).toBe(
      "BTC 会在 2026 年达到 12 万美元吗？"
    );
    expect(localizeMarketQuestion("Will BTC hit $150k in 2027?", "zh-CN")).toBe(
      "BTC 会在 2027 年达到 15 万美元吗？"
    );
    expect(localizeMarketQuestion("US recession in 2026?", "zh-CN")).toBe(
      "美国 2026 年会经济衰退吗？"
    );
    expect(localizeMarketQuestion("Will Ethereum dip to $1,400 in June?", "zh-CN")).toBe(
      "以太坊会在 6 月跌到 1,400 美元吗？"
    );
    expect(localizeMarketQuestion("Will Ethereum reach $2,300 in June?", "zh-CN")).toBe(
      "以太坊会在 6 月达到 2,300 美元吗？"
    );
    expect(localizeMarketQuestion("Will 12 or more Fed rate cuts happen in 2026?", "zh-CN")).toBe(
      "2026 年美联储会降息 12 次或更多吗？"
    );
    expect(localizeMarketQuestion("Will 9 Fed rate cuts happen in 2026?", "zh-CN")).toBe(
      "2026 年美联储会降息 9 次吗？"
    );
  });

  it("translates common politics and sports titles in synced market lists", () => {
    expect(localizeMarketQuestion("Will Marco Rubio enter Iran by June 30?", "zh-CN")).toBe(
      "马可·鲁比奥会在 6 月 30 日前进入伊朗吗？"
    );
    expect(localizeMarketQuestion("Will any U.S. House member enter Iran by June 30?", "zh-CN")).toBe(
      "任一美国众议员会在 6 月 30 日前进入伊朗吗？"
    );
    expect(localizeMarketQuestion("Will Ecuador win on 2026-06-25?", "zh-CN")).toBe(
      "厄瓜多尔会在 2026 年 6 月 25 日获胜吗？"
    );
    expect(localizeMarketQuestion("Will Ecuador vs. Germany end in a draw?", "zh-CN")).toBe(
      "厄瓜多尔对德国会打平吗？"
    );
    expect(localizeMarketQuestion("Will Taylor Fritz be the 2026 Men’s Wimbledon winner?", "zh-CN")).toBe(
      "泰勒·弗里茨会赢得 2026 年温网男单冠军吗？"
    );
    expect(localizeMarketQuestion("Will Saudi Arabia win the 2026 FIFA World Cup?", "zh-CN")).toBe(
      "沙特阿拉伯会赢得 2026 年 FIFA 世界杯吗？"
    );
    expect(localizeMarketQuestion("Will Cape Verde win the 2026 FIFA World Cup?", "zh-CN")).toBe(
      "佛得角会赢得 2026 年 FIFA 世界杯吗？"
    );
    expect(localizeMarketQuestion("Will Congo DR win the 2026 FIFA World Cup?", "zh-CN")).toBe(
      "刚果民主共和国会赢得 2026 年 FIFA 世界杯吗？"
    );
  });
});
