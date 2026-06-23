import type { Locale } from "../i18n/messages";

const categoryNames: Record<string, string> = {
  crypto: "加密",
  cryptocurrency: "加密",
  culture: "文化",
  election: "选举",
  elections: "选举",
  entertainment: "娱乐",
  macro: "宏观",
  market: "市场",
  politics: "政治",
  sports: "体育"
};

const subjectNames: Record<string, string> = {
  "ahmed al-sharaa": "艾哈迈德·沙拉",
  "claudia sheinbaum": "克劳迪娅·辛鲍姆",
  colombia: "哥伦比亚",
  "delcy rodríguez": "德尔西·罗德里格斯",
  "delcy rodr?-guez": "德尔西·罗德里格斯",
  "dr congo": "刚果民主共和国",
  "gustavo petro": "古斯塔沃·佩特罗",
  "miguel díaz-canel": "米格尔·迪亚斯-卡内尔",
  "miguel d?-az-canel": "米格尔·迪亚斯-卡内尔",
  "no listed leader": "没有列出的领导人",
  "pedro sánchez": "佩德罗·桑切斯",
  "pedro s??nchez": "佩德罗·桑切斯",
  rihanna: "蕾哈娜",
  spain: "西班牙"
};

const exactQuestionTranslations: Record<string, string> = {
  "ETH all-time high in 2026?": "ETH 会在 2026 年创历史新高吗？",
  "Fed rate cut at next meeting?": "美联储下次会议会降息吗？",
  "New Rihanna Album before GTA VI?": "蕾哈娜会在 GTA VI 前发布新专辑吗？",
  "Will BTC close above $100k this week?": "BTC 本周收盘会高于 10 万美元吗？"
};

export function localizeMarketQuestion(question: string, locale: Locale): string {
  if (locale === "en") {
    return question;
  }

  const exactTranslation = exactQuestionTranslations[question];
  if (exactTranslation) {
    return exactTranslation;
  }

  const outBeforeMatch = question.match(/^Will (.+) be out before (\d{4})\?$/);
  if (outBeforeMatch) {
    const [, subject, year] = outBeforeMatch;
    return `${localizeSubject(subject)}会在 ${year} 年前下台吗？`;
  }

  const leaderOutMatch = question.match(/^Will (.+) be the next leader out before (\d{4})\?$/);
  if (leaderOutMatch) {
    const [, subject, year] = leaderOutMatch;
    return `${localizeSubject(subject)}会在 ${year} 年前成为下一位下台的领导人吗？`;
  }

  const worldCupMatch = question.match(/^Will (.+) win the (\d{4}) FIFA World Cup\?$/);
  if (worldCupMatch) {
    const [, subject, year] = worldCupMatch;
    return `${localizeSubject(subject)}会赢得 ${year} 年 FIFA 世界杯吗？`;
  }

  const spreadMatch = question.match(/^Spread: (.+) \(([-+]?\d+(?:\.\d+)?)\)$/);
  if (spreadMatch) {
    const [, subject, spread] = spreadMatch;
    return `让分：${localizeSubject(subject)}（${spread}）`;
  }

  const totalMatch = question.match(/^(.+) vs\. (.+): O\/U (\d+(?:\.\d+)?)$/);
  if (totalMatch) {
    const [, firstTeam, secondTeam, total] = totalMatch;
    return `${localizeSubject(firstTeam)} 对 ${localizeSubject(secondTeam)}：总分大/小 ${total}`;
  }

  return question;
}

export function localizeMarketCategory(
  category: string | null,
  locale: Locale,
  fallback: string
): string {
  if (!category) {
    return fallback;
  }

  if (locale === "en") {
    return category;
  }

  return categoryNames[category.trim().toLowerCase()] ?? category;
}

export function localizeOutcome(outcome: string, locale: Locale): string {
  if (locale === "en") {
    return outcome;
  }

  const normalized = outcome.trim().toLowerCase();
  if (normalized === "yes") {
    return "是";
  }

  if (normalized === "no") {
    return "否";
  }

  if (normalized === "over") {
    return "大于";
  }

  if (normalized === "under") {
    return "小于";
  }

  const subjectTranslation = subjectNames[normalized];
  if (subjectTranslation) {
    return subjectTranslation;
  }

  return outcome;
}

function localizeSubject(subject: string): string {
  return subjectNames[subject.trim().toLowerCase()] ?? subject;
}
