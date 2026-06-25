# PMX Light Market UI Design

## Goal

Build a simplified prediction-market interface that is clean, precise, and not crowded. The UI should help users find high-activity markets, scan all markets, open a market detail page, and review positions without showing unrelated panels.

This is a PMX interface. It can follow prediction-market interaction patterns, but it must not copy Polymarket branding, logos, exact visual identity, or pixel-level layout.

## Current Scope

| Area | In scope |
|---|---|
| Home | High total-bet markets and all markets |
| Category page | Left competition/type navigation and right-side market cards |
| Market detail | Full market lines and odds |
| Account | Current positions, historical positions, and PnL |
| Trading state | Keep real submit unavailable until product gates allow it |

| Area | Out of scope |
|---|---|
| Home left sidebar | Do not show a left list on the homepage |
| News and promotion | No news rail, ad block, QR block, or campaign content |
| Complex charts | No chart-heavy market detail in this UI pass |
| Platform Wallet | Still deferred, not part of this UI scope |
| Pixel copy | Do not copy Polymarket trade dress exactly |

## Visual Direction

The interface should feel like a lightweight market terminal: quiet white surfaces, strong black typography, restrained borders, enough whitespace, and color used only for odds, status, and positive or negative money values.

Cards should be simple but not empty. Each card must carry the minimum useful decision data:

- market title
- active status when relevant
- total bet amount or volume
- available outcomes
- current odds
- category or competition context when needed

## Information Architecture

```text
Home
  -> high total-bet markets
  -> all markets
  -> market detail

Category page
  -> left competition/type navigation
  -> filtered market list
  -> market detail

Market detail
  -> all available lines and odds
  -> order ticket only after an odd is selected

Account
  -> current positions
  -> historical positions
  -> PnL summary
```

## Home Page

The homepage must not use a left sidebar. It has one centered content column after the global top navigation.

Required sections:

1. High total-bet markets
2. All markets

Optional controls:

- global search
- horizontal category chips
- sort by total bet amount
- filter by live, ending soon, category, and status

Homepage wireframe:

```text
┌──────────────────────────────────────────────────────────────────────┐
│ PMX        搜索盘口 / 市场 / 标签                      余额  账户  中文 │
├──────────────────────────────────────────────────────────────────────┤
│ 热门   体育   加密   政治   宏观   文化   更多                         │
├──────────────────────────────────────────────────────────────────────┤
│ 高投注额盘口                                           查看全部        │
│ ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐ │
│ │ 世界杯冠军          │ │ BTC 涨跌            │ │ 美国-伊朗协议       │ │
│ │ 法国 19%  是 / 否   │ │ Up 49% / Down 51%   │ │ 是 24% / 否 76%     │ │
│ │ 总投注额 $3B        │ │ 总投注额 $1M        │ │ 总投注额 $2M        │ │
│ └────────────────────┘ └────────────────────┘ └────────────────────┘ │
│                                                                      │
│ 全部盘口                                      搜索  筛选  按投注额排序 │
│ [全部] [体育] [加密] [政治] [宏观] [文化] [实时] [即将结束]            │
│                                                                      │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ ● 实时  $32.90K 总投注额                                         │ │
│ │ Mariam Bolkvadze            34¢                                  │ │
│ │ Jeline Vandromme            67¢                                  │ │
│ │ 胜负线        让分        总分                                    │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ $50.41K 总投注额                                                 │ │
│ │ M. Timofeeva               61¢                                  │ │
│ │ H. Watson                  40¢                                  │ │
│ │ Moneyline    Set Handicap    Total Sets                         │ │
│ └──────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

Home acceptance rules:

- No left category rail on the homepage.
- The first content block must be high total-bet markets.
- The second content block must be all markets.
- The default sort for all markets should favor total bet amount or volume.
- Market cards must show odds without requiring the detail page.
- No order ticket should be permanently visible on the homepage.

## Category Page

Category pages may use a left sidebar. This sidebar is for competition or market-type drilldown only.

For sports, the left sidebar can show:

- live
- upcoming
- World Cup
- UCL
- MLB
- NHL
- football
- tennis
- basketball
- other supported sports or leagues

Category page wireframe:

```text
┌──────────────────────────────────────────────────────────────────────┐
│ PMX        搜索盘口 / 市场 / 标签                      余额  账户  中文 │
├───────────────┬──────────────────────────────────────────────────────┤
│ 实时           │ 世界杯                                               │
│ 远期           │ 价格与预测                                           │
│               │                                                      │
│ 所有体育赛事    │ 体育直播                              搜索  筛选       │
│ World Cup 164 │                                                      │
│ UCL        81 │ WTA                         胜负线      让分      总分 │
│ MLB       124 │ ┌────────────────────────────────────────────────┐   │
│ NHL        16 │ │ ● S3  $32.90K 总投注额                         │   │
│ 足球       88 │ │ Mariam Bolkvadze        34¢     +1.5 99.8¢  O21.5│
│ 网球      133 │ │ Jeline Vandromme         67¢     -1.5 49.9¢  U21.5│
│ 篮球       42 │ └────────────────────────────────────────────────┘   │
│ 棒球       31 │                                                      │
│ 冰球       16 │ ┌────────────────────────────────────────────────┐   │
│ 高尔夫     11 │ │ ● S2  $50.41K 总投注额                         │   │
│ F1         45 │ │ M. Timofeeva            61¢     -1.5 49.9¢  O22.5│
│               │ │ H. Watson               40¢     +1.5 99.8¢  U22.5│
│               │ └────────────────────────────────────────────────┘   │
└───────────────┴──────────────────────────────────────────────────────┘
```

Category acceptance rules:

- The left sidebar appears only on category/drilldown pages, not on home.
- Right-side cards should be compact rows, not marketing cards.
- Odds columns should align across cards when the market type supports it.
- Users can open a market detail page from any market row.

## Market Detail Page

The market detail page must focus on all available lines and odds. It should not show news, promotion blocks, QR codes, unrelated statistics, or a chart-heavy layout in this pass.

The order ticket is not permanently shown by default. It appears only after the user selects an odd. On desktop it can appear as a right drawer or side panel. On mobile it should appear as a bottom sheet.

Market detail wireframe:

```text
┌──────────────────────────────────────────────────────────────────────┐
│ PMX        搜索盘口 / 市场 / 标签                      余额  账户  中文 │
├───────────────┬──────────────────────────────────────────────────────┤
│ 实时           │ 体育 · WTA                                           │
│ 远期           │ Maria Timofeeva - Heather Watson                    │
│               │ S2    $50.66K 总投注额                               │
│ 所有体育赛事    │                                                      │
│ World Cup 164 │ 主要盘口                                             │
│ UCL        81 │ ┌────────────────────────────────────────────────┐   │
│ 网球      133 │ │ Moneyline              Timofeeva 56¢   Watson 45¢│  │
│   全部    133 │ └────────────────────────────────────────────────┘   │
│   ATP      28 │ ┌────────────────────────────────────────────────┐   │
│   WTA      14 │ │ Set Handicap 1.5      Timofeeva -1.5 49.9¢      │   │
│   ITF      75 │ │                       Watson +1.5 99.8¢         │   │
│ 篮球       42 │ └────────────────────────────────────────────────┘   │
│ 棒球       31 │ ┌────────────────────────────────────────────────┐   │
│               │ │ Total Sets 2.5        Over 66¢     Under --      │   │
│               │ └────────────────────────────────────────────────┘   │
│               │                                                      │
│               │ 其他盘口                                             │
│               │ Match Winner / Set 1 Winner / Correct Score / ...   │
└───────────────┴──────────────────────────────────────────────────────┘
```

Market detail acceptance rules:

- Show all lines and odds available in the local market model.
- Do not show unrelated blocks.
- Selecting an odd opens an order ticket.
- If real submit is unavailable, the ticket must clearly remain preview-only.
- Odds and line labels must remain readable on mobile.

## Account Page

The account page should focus on current positions, historical positions, and PnL. It should not behave like a social profile page.

Account wireframe:

```text
┌──────────────────────────────────────────────────────────────────────┐
│ PMX        搜索盘口 / 市场 / 标签                      余额  账户  中文 │
├──────────────────────────────────────────────────────────────────────┤
│ 账户概览                                   盈亏                       │
│ ┌──────────────────────────────┐          ┌────────────────────────┐ │
│ │ 0x4807...F611C               │          │ $0.00                  │ │
│ │ 持仓价值 $0.00               │          │ 过去 24 小时           │ │
│ │ 最高盈利 $165.84             │          │ [1天][1周][1个月][全部] │ │
│ │ 预测 67                      │          └────────────────────────┘ │
│ └──────────────────────────────┘                                      │
│                                                                      │
│ 持仓   交易记录                                                       │
│ [生效中] [已结束]        搜索持仓                         按盈亏排序   │
│                                                                      │
│ 结果      盘口                              总交易金额      盈利金额     │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ 已盈利  BTC Up or Down - Apr 13       $197.02       $362.86       │ │
│ │         362.9 Down at 54.3¢                         +$165.84      │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ 已盈利  BTC Up or Down - Apr 13       $360.92       $487.95       │ │
│ │         487.9 Up at 74¢                             +$127.03      │ │
│ └──────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

Account acceptance rules:

- Show active positions.
- Show closed or historical positions.
- Show PnL clearly.
- Keep funding and wallet readiness visible only where it affects action.
- Do not show unrelated social/profile decoration.

## Chinese Copy Rules

Chinese mode should use Chinese UI labels for ordinary product copy. Keep protocol, product, and ticker names in English when that is clearer.

| English | Chinese |
|---|---|
| Market | 盘口 or 市场, depending on context |
| All markets | 全部盘口 |
| High volume markets | 高投注额盘口 |
| Total bet amount | 总投注额 |
| Odds | 赔率 |
| Outcome | 结果 |
| Positions | 持仓 |
| Active | 生效中 |
| Closed | 已结束 |
| PnL | 盈亏 |
| Order ticket | 订单票据 |
| Preview only | 仅预览 |
| Wallet | 钱包 |
| Deposit Wallet | Deposit Wallet |
| pUSD | pUSD |
| CLOB | CLOB |

## Implementation Boundaries

This design should primarily change the web app presentation layer:

- `apps/web/src/app/page.tsx`
- `apps/web/src/features/markets/market-detail-page.tsx`
- `apps/web/src/features/auth/account-panel.tsx`
- `apps/web/src/features/i18n/messages.ts`
- `apps/web/src/app/globals.css`
- related tests and e2e checks

Avoid backend changes unless the UI needs a field that already exists in the API but is not exposed to the web client.

## Testing And Verification

Before this UI can be considered complete:

- Unit tests must cover homepage sections and copy.
- Unit tests must cover market detail odds rendering.
- Account tests must cover active and closed position rows.
- E2E must confirm the homepage has no left sidebar.
- E2E must confirm high total-bet markets and all markets are visible.
- E2E must confirm selecting an odd opens the order ticket.
- Visual browser verification must check desktop and mobile widths.

## Success Criteria

| Requirement | Expected result |
|---|---|
| Homepage has no left list | Pass |
| Homepage shows high total-bet markets | Pass |
| Homepage shows all markets | Pass |
| Category pages keep left drilldown | Pass |
| Market detail shows all odds and lines | Pass |
| Order ticket appears only after selecting odds | Pass |
| Account shows positions and PnL | Pass |
| Chinese UI copy is complete | Pass |
| Real submit remains gated | Pass |
