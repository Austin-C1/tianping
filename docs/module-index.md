# 模块汇总

| 模块 | 状态 | 独立性 | 文档 |
|---|---|---|---|
| V2 Web Business Flow Layer | 已完成 | 可独立验证 Web flows；依赖现有 Web/API clients | `docs/superpowers/plans/2026-06-29-v2-web-business-flow-layer.md` |
| API repository boundaries | 已完成 | 可独立验证 API services/repositories；不依赖 api-client | `docs/superpowers/plans/2026-06-29-api-repositories.md` |
| Full OpenAPI-generated api-client | 开发中 | 与 API controllers/DTO 和 Web/Admin low-level clients 强绑定，需一起生成并验证 | `docs/modules/api-client.md` |

## 强绑定关系

- 修改 API controller/DTO response shape 后，必须重新运行 `npm run generate --workspace @pmx/api-client`。
- Web/Admin low-level API modules 必须通过 `@pmx/api-client`，不能直接拼后端路径。
- Nx workspace migration、`libs/contracts`、`libs/domain` 是后续独立模块，不能混入 api-client 模块。
