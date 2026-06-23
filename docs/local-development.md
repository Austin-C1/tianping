# 本地开发说明

## 必要服务

| 服务 | 地址 | 用途 |
|---|---|---|
| PostgreSQL | `localhost:5432` | Prisma 主数据库 |
| Redis | `localhost:6379` | BullMQ 和后续限流状态 |
| API | `http://localhost:4000` | NestJS 后端 |
| Web | `http://localhost:3000` | Next.js 交易前台 |
| Admin | `http://localhost:3001` | Vue 3 / Vben v5 方向管理后台 |

## 本地账号

默认管理员：

| 字段 | 值 |
|---|---|
| Email | `admin@pmx.local` |
| Password | `change-me-123` |

普通用户可以通过 Web 注册页创建。

## 启动依赖服务

```bash
docker compose up -d
```

检查状态：

```bash
docker compose ps
```

PostgreSQL 和 Redis 都应处于 running/healthy 状态。

## 初始化数据库

```bash
npm run prisma:generate
npm run db:migrate
npm run db:seed
```

`db:seed` 会创建默认管理员账号。

## 启动应用

同时启动三端：

```bash
npm run dev
```

单独启动：

```bash
npm run start:dev --workspace @pmx/api
npm run dev --workspace @pmx/web
npm run dev --workspace @pmx/admin
```

## 验证入口

| 页面 | 预期 |
|---|---|
| `http://localhost:4000/health` | 返回包含 `"ok":true` 的 JSON |
| `http://localhost:3000` | 打开 PMX Trading 工作台 |
| `http://localhost:3001/#/login` | 打开 Admin 登录页 |
| `http://localhost:3001/#/dashboard` | 管理员登录后打开 Dashboard |
| `http://localhost:3001/#/users` | 管理员登录后看到真实用户列表 |

## 验收命令

```bash
npm run build
npm test
npm run test:e2e
```

通过标准：

- Web、Admin、API、Shared 都能构建。
- API 单测通过。
- Web 单测通过。
- Playwright 主流程通过。
- 普通 USER 不能进入 Admin。
- ADMIN 能进入 Admin 并看到真实用户数据。

## Docker 网络说明

如果 Docker Hub 拉镜像超时，可以让 Docker Desktop 使用本机代理或可访问的 registry mirror。

本机 Git 推送已验证可通过代理：

```bash
git -c http.proxy=http://127.0.0.1:7897 -c https.proxy=http://127.0.0.1:7897 push
```

修改 Docker Desktop 代理通常需要重启 Docker Desktop，重启会临时停止当前容器。

## 当前风险

| 项目 | 说明 |
|---|---|
| Admin | 当前是 Vben v5 技术方向的精简后台，不是完整官方 Vben v5 monorepo |
| Web | 市场数据仍是占位内容，真实 Polymarket 数据尚未接入 |
| 交易 | 真实 CLOB 提交默认未启用 |
| 钱包 | 钱包绑定、Deposit Wallet、入金授权状态尚未完成 |
