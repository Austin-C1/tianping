import type { Locale } from "../i18n/messages";

const categoryNames: Record<string, string> = {
  crypto: "加密",
  cryptocurrency: "加密",
  culture: "文化娱乐",
  election: "选举",
  elections: "选举",
  entertainment: "文化娱乐",
  macro: "宏观",
  market: "市场",
  other: "其他",
  politics: "政治",
  sports: "体育"
};

const inferredCategories: Array<{
  key: string;
  patterns: RegExp[];
}> = [
  {
    key: "Politics",
    patterns: [
      /\b(congress|democrat|election|government|house|iran|israel|leader|minister|netanyahu|president|republican|rubio|senate|senator|trump|vance)\b/i,
      /\bU\.S\.\b/i
    ]
  },
  {
    key: "Sports",
    patterns: [
      /\b(fifa|game|nba|nfl|nhl|spread|ufc|wimbledon|world cup)\b/i,
      /\bend in a draw\b/i,
      /\bO\/U\b/i,
      /\bwin on \d{4}-\d{2}-\d{2}\b/i,
      /\bvs\.\b/i
    ]
  },
  {
    key: "Crypto",
    patterns: [/\b(bitcoin|btc|crypto|eth|ethereum|solana|xrp)\b/i]
  },
  {
    key: "Macro",
    patterns: [/\b(cpi|fed|gdp|inflation|rate cut|recession|tariff|unemployment)\b/i]
  },
  {
    key: "Culture",
    patterns: [/\b(album|gta|movie|oscar|rihanna|spotify|taylor swift)\b/i]
  }
];

const subjectNames: Record<string, string> = {
  "ahmed al-sharaa": "艾哈迈德·沙拉",
  "any u.s. house member": "任一美国众议员",
  "any u.s. senator": "任一美国参议员",
  argentina: "阿根廷",
  australia: "澳大利亚",
  austria: "奥地利",
  belgium: "比利时",
  "benjamin netanyahu": "本雅明·内塔尼亚胡",
  brazil: "巴西",
  cameroon: "喀麦隆",
  canada: "加拿大",
  "cape verde": "佛得角",
  chile: "智利",
  china: "中国",
  "claudia sheinbaum": "克劳迪娅·辛鲍姆",
  "congo dr": "刚果民主共和国",
  "costa rica": "哥斯达黎加",
  czechia: "捷克",
  btc: "比特币",
  colombia: "哥伦比亚",
  croatia: "克罗地亚",
  "delcy rodríguez": "德尔西·罗德里格斯",
  "delcy rodr?-guez": "德尔西·罗德里格斯",
  "dr congo": "刚果民主共和国",
  ecuador: "厄瓜多尔",
  egypt: "埃及",
  england: "英格兰",
  ethereum: "以太坊",
  france: "法国",
  germany: "德国",
  ghana: "加纳",
  greece: "希腊",
  "gustavo petro": "古斯塔沃·佩特罗",
  honduras: "洪都拉斯",
  iran: "伊朗",
  ireland: "爱尔兰",
  italy: "意大利",
  "ivory coast": "科特迪瓦",
  jamaica: "牙买加",
  japan: "日本",
  "jd vance": "JD·万斯",
  "marco rubio": "马可·鲁比奥",
  mexico: "墨西哥",
  "miguel díaz-canel": "米格尔·迪亚斯-卡内尔",
  "miguel d?-az-canel": "米格尔·迪亚斯-卡内尔",
  morocco: "摩洛哥",
  netherlands: "荷兰",
  "new zealand": "新西兰",
  nigeria: "尼日利亚",
  "northern ireland": "北爱尔兰",
  "no listed leader": "没有列出的领导人",
  norway: "挪威",
  panama: "巴拿马",
  paraguay: "巴拉圭",
  "pedro sánchez": "佩德罗·桑切斯",
  "pedro s??nchez": "佩德罗·桑切斯",
  "pete hegseth": "皮特·赫格塞思",
  poland: "波兰",
  portugal: "葡萄牙",
  qatar: "卡塔尔",
  rihanna: "蕾哈娜",
  romania: "罗马尼亚",
  russia: "俄罗斯",
  "saudi arabia": "沙特阿拉伯",
  scotland: "苏格兰",
  senegal: "塞内加尔",
  serbia: "塞尔维亚",
  slovakia: "斯洛伐克",
  slovenia: "斯洛文尼亚",
  "south africa": "南非",
  "south korea": "韩国",
  spain: "西班牙",
  sweden: "瑞典",
  switzerland: "瑞士",
  "taylor fritz": "泰勒·弗里茨",
  turkey: "土耳其",
  türkiye: "土耳其",
  ukraine: "乌克兰",
  "united states": "美国",
  uruguay: "乌拉圭",
  usa: "美国",
  wales: "威尔士",
  "us recession": "美国经济衰退"
};

const monthNames: Record<string, string> = {
  april: "4 月",
  august: "8 月",
  december: "12 月",
  february: "2 月",
  january: "1 月",
  july: "7 月",
  june: "6 月",
  march: "3 月",
  may: "5 月",
  november: "11 月",
  october: "10 月",
  september: "9 月"
};

const exactQuestionTranslations: Record<string, string> = {
  "ETH all-time high in 2026?": "ETH 会在 2026 年创历史新高吗？",
  "Fed rate cut at next meeting?": "美联储下次会议会降息吗？",
  "New Rihanna Album before GTA VI?": "蕾哈娜会在 GTA VI 前发布新专辑吗？",
  "US recession in 2026?": "美国 2026 年会经济衰退吗？",
  "Will BTC close above $100k this week?": "BTC 本周收盘会高于 10 万美元吗？",
  "Will BTC hit $120k in 2026?": "BTC 会在 2026 年达到 12 万美元吗？"
};

export function localizeMarketQuestion(question: string, locale: Locale): string {
  if (locale === "en") {
    return question;
  }

  const exactTranslation = exactQuestionTranslations[question];
  if (exactTranslation) {
    return exactTranslation;
  }

  const btcHitMatch = question.match(/^Will BTC hit \$(\d+)k in (\d{4})\?$/i);
  if (btcHitMatch) {
    const [, target, year] = btcHitMatch;
    return `BTC 会在 ${year} 年达到 ${Number(target) / 10} 万美元吗？`;
  }

  const priceMoveMatch = question.match(/^Will (.+) (dip to|reach) \$([\d,]+)(k)? in ([A-Za-z]+)\?$/i);
  if (priceMoveMatch) {
    const [, subject, direction, target, hasThousandsSuffix, month] = priceMoveMatch;
    const verb = direction.toLowerCase() === "dip to" ? "跌到" : "达到";
    return `${localizeSubject(subject)}会在 ${localizeMonth(month)}${verb} ${formatUsdTarget(target, Boolean(hasThousandsSuffix))}吗？`;
  }

  const fedCutsAtLeastMatch = question.match(/^Will (\d+) or more Fed rate cuts happen in (\d{4})\?$/i);
  if (fedCutsAtLeastMatch) {
    const [, count, year] = fedCutsAtLeastMatch;
    return `${year} 年美联储会降息 ${count} 次或更多吗？`;
  }

  const fedCutsMatch = question.match(/^Will (\d+) Fed rate cuts happen in (\d{4})\?$/i);
  if (fedCutsMatch) {
    const [, count, year] = fedCutsMatch;
    return `${year} 年美联储会降息 ${count} 次吗？`;
  }

  const enterMatch = question.match(/^Will (.+) enter (.+) by ([A-Za-z]+) (\d{1,2})\?$/);
  if (enterMatch) {
    const [, subject, place, month, day] = enterMatch;
    return `${localizeSubject(subject)}会在 ${localizeMonthDay(month, day)}前进入${localizeSubject(place)}吗？`;
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

  const winOnMatch = question.match(/^Will (.+) win on (\d{4})-(\d{2})-(\d{2})\?$/);
  if (winOnMatch) {
    const [, subject, year, month, day] = winOnMatch;
    return `${localizeSubject(subject)}会在 ${formatIsoDate(year, month, day)}获胜吗？`;
  }

  const drawMatch = question.match(/^Will (.+) vs\. (.+) end in a draw\?$/);
  if (drawMatch) {
    const [, firstTeam, secondTeam] = drawMatch;
    return `${localizeSubject(firstTeam)}对${localizeSubject(secondTeam)}会打平吗？`;
  }

  const wimbledonWinnerMatch = question.match(/^Will (.+) be the (\d{4}) Men[’']s Wimbledon winner\?$/);
  if (wimbledonWinnerMatch) {
    const [, subject, year] = wimbledonWinnerMatch;
    return `${localizeSubject(subject)}会赢得 ${year} 年温网男单冠军吗？`;
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
  fallback: string,
  question = ""
): string {
  const normalizedCategory = category?.trim();
  const categoryKey = normalizedCategory || inferMarketCategory(question);

  if (locale === "en") {
    return categoryKey || fallback;
  }

  return categoryKey ? categoryNames[categoryKey.trim().toLowerCase()] ?? categoryKey : fallback;
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

function localizeMonth(month: string): string {
  return monthNames[month.trim().toLowerCase()] ?? month;
}

function localizeMonthDay(month: string, day: string): string {
  return `${localizeMonth(month)} ${Number(day)} 日`;
}

function formatIsoDate(year: string, month: string, day: string): string {
  return `${year} 年 ${Number(month)} 月 ${Number(day)} 日`;
}

function formatUsdTarget(target: string, hasThousandsSuffix: boolean): string {
  if (!hasThousandsSuffix) {
    return `${target} 美元`;
  }

  return `${Number(target.replaceAll(",", "")) / 10} 万美元`;
}

function inferMarketCategory(question: string): string | null {
  const normalizedQuestion = question.trim();
  if (!normalizedQuestion) {
    return null;
  }

  return inferredCategories.find((category) =>
    category.patterns.some((pattern) => pattern.test(normalizedQuestion))
  )?.key ?? "Other";
}
