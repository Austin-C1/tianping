# 模块汇总

| 模块 | 状态 | 独立性 | 文档 |
|---|---|---|---|
| V2 Web Business Flow Layer | 已完成 | 可独立验证 Web flows；依赖现有 Web/API clients | `docs/superpowers/plans/2026-06-29-v2-web-business-flow-layer.md` |
| API repository boundaries | 已完成 | 可独立验证 API services/repositories；不依赖 api-client | `docs/superpowers/plans/2026-06-29-api-repositories.md` |
| Full OpenAPI-generated api-client | 已完成 | 与 API controllers/DTO 和 Web/Admin low-level clients 强绑定，需一起生成并验证 | `docs/modules/api-client.md` |
| Nx workspace migration | 已完成 | 只改 workspace tooling 和 project metadata，不移动业务目录 | `docs/modules/nx-workspace.md` |
| Contracts migration | 已完成 | 只迁移跨模块共享契约到 `libs/contracts`，保留 `@pmx/shared` 兼容转发 | `docs/modules/contracts.md` |
| Domain migration | 已完成 | 只迁移纯订单域逻辑到 `libs/domain`，不改 API/OpenAPI/DB 行为 | `docs/modules/domain.md` |

## 强绑定关系

- 修改 API controller/DTO response shape 后，必须重新运行 `npm run generate --workspace @pmx/api-client`。
- Web/Admin low-level API modules 必须通过 `@pmx/api-client`，不能直接拼后端路径。
- Nx project metadata 必须覆盖 `web`、`admin`、`api`、`api-client`、`shared`。
- `contracts` 由 `libs/contracts` 承载，`@pmx/shared` 只保留兼容转发。
- `domain` 由 `libs/domain` 承载，API 业务服务只调用其纯领域函数，不把 Nest/Prisma/infrastructure 放入 domain。
