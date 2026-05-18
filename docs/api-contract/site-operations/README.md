# 站点运营 API Contract 目录

状态：后端交接契约入口
日期：2026-05-14
路由：`/site-operations`

本文是站点运营 API contract 的入口。API contract 按 global + tab 拆分，和站点运营 design spec 一一对应。

## 阅读顺序

| 顺序 | 文档 | 作用 |
| --- | --- | --- |
| 1 | [`00-global-api.md`](00-global-api.md) | 跨 tab 共用 API 规则、权限、错误、分页、fixture 规范 |
| 2 | [`01-home-api.md`](01-home-api.md) | 首页摘要、Highlight、活动流 API |
| 3 | [`02-service-personnel-api.md`](02-service-personnel-api.md) | 服务人员目录、常用工牌关系、表扬摘要 API |
| 4 | [`03-devices-api.md`](03-devices-api.md) | 智能工牌激活、健康、生命周期 API |
| 5 | [`04-service-objects-api.md`](04-service-objects-api.md) | 服务对象、服务计划、计划例外、家属订阅 API |
| 6 | [`05-service-schedules-api.md`](05-service-schedules-api.md) | 服务排期、按次服务、单条调整 API |
| 7 | [`06-service-records-api.md`](06-service-records-api.md) | 服务记录、证据、复核、异常、导出 API |

## 和 Design Spec 的关系

Design spec 负责功能、UI、交互和验收：

[`../../superpowers/specs/site-operations/README.md`](../../superpowers/specs/site-operations/README.md)

API contract 负责：

- entity response shape
- list/detail endpoint
- create/update/archive mutation
- permission state
- error case
- fixture example coverage
- cross-tab reference rules

每个 tab design spec 必须引用同编号 API contract。例如：

```text
02-service-personnel.md
  -> docs/api-contract/site-operations/02-service-personnel-api.md
```

## 兼容入口

旧文件 [`../site-operations-api-contract.md`](../site-operations-api-contract.md) 保留为兼容入口，不再承载完整 API 契约。
