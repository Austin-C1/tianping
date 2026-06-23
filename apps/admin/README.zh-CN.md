# PMX Admin

PMX Admin 是 Polymarket 三方基础交易平台的运营管理后台。

该应用基于 Art Design Pro 改造，保留 Vue 3、Vite、Element Plus、Pinia、路由、布局、登录、菜单、表格和权限架构。模板演示路由已移除，替换为 PMX 需要的运营模块。

## 当前范围

- Dashboard：平台状态、市场同步、CLOB 状态、人工 Gate
- Users：用户、钱包绑定和交易准备状态
- Markets：Polymarket 市场同步和市场管理
- Orders：订单预览、签名订单、CLOB 路由、撤单/成交状态
- Audit：认证、Deposit Wallet、订单、风控事件日志
- Risk：geoblock、rate limit、真实下单确认、合规 Gate

## 本地开发

```bash
npm run dev --workspace @pmx/admin
```

开发端口为 `3001`，API 代理到 `http://localhost:4000`。

## 构建

```bash
npm run build --workspace @pmx/admin
```

## 来源说明

管理端基于 Art Design Pro 的 MIT 协议代码改造。授权文件见 `LICENSE`。
