# Site Operations API Contract

状态：兼容入口，已拆分
日期：2026-05-14
路由：`/site-operations`

站点运营 API contract 已经从单文件拆分为目录化契约。当前主入口是：

[`site-operations/README.md`](site-operations/README.md)

## API Contract 文档

| 文档 | 作用 |
| --- | --- |
| [`site-operations/00-global-api.md`](site-operations/00-global-api.md) | 跨 tab 共用 API 规则、权限、错误、分页、fixture 规范 |
| [`site-operations/01-home-api.md`](site-operations/01-home-api.md) | 首页摘要、Highlight、活动流 API |
| [`site-operations/02-service-personnel-api.md`](site-operations/02-service-personnel-api.md) | 服务人员目录、常用工牌关系、表扬摘要 API |
| [`site-operations/03-devices-api.md`](site-operations/03-devices-api.md) | 智能工牌激活、健康、生命周期 API |
| [`site-operations/04-service-objects-api.md`](site-operations/04-service-objects-api.md) | 服务对象、服务计划、计划例外、家属订阅 API |
| [`site-operations/05-service-schedules-api.md`](site-operations/05-service-schedules-api.md) | 服务排期、按次服务、单条调整 API |
| [`site-operations/06-service-records-api.md`](site-operations/06-service-records-api.md) | 服务记录、证据、复核、异常、导出 API |

## 使用规则

- 旧路径保留用于历史引用和外部链接，不再作为完整 API contract 维护。
- 跨 tab 共用 API 规则以 [`site-operations/00-global-api.md`](site-operations/00-global-api.md) 为准。
- 每个 tab 的 endpoint、entity response shape、mutation、权限和 fixture 覆盖以对应 tab API 文件为准。
- 产品功能、UI、交互和验收以 [`../superpowers/specs/site-operations/README.md`](../superpowers/specs/site-operations/README.md) 为准。
