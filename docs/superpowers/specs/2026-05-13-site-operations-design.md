# 站点运营页面设计规格

状态：兼容入口，已拆分
日期：2026-05-14
路由：`/site-operations`

站点运营设计规格已经从单文件拆分为目录化规格。当前主入口是：

[`site-operations/README.md`](site-operations/README.md)

## 设计文档

| 文档 | 作用 |
| --- | --- |
| [`site-operations/00-overall-design.md`](site-operations/00-overall-design.md) | 总体目标、跨 tab 边界、全局 UI element 引用、交接要求 |
| [`site-operations/01-home.md`](site-operations/01-home.md) | 首页、聊天入口、右侧高亮信息面板、指令输入 |
| [`site-operations/02-service-personnel.md`](site-operations/02-service-personnel.md) | 服务人员目录、常用工牌关系、正向反馈信号 |
| [`site-operations/03-devices.md`](site-operations/03-devices.md) | 设备/智能工牌激活、健康、生命周期 |
| [`site-operations/04-service-objects.md`](site-operations/04-service-objects.md) | 服务对象、服务计划、计划例外、家属订阅 |
| [`site-operations/05-service-schedules.md`](site-operations/05-service-schedules.md) | 服务排期、按次服务、日历/时间线/地图 |
| [`site-operations/06-service-records.md`](site-operations/06-service-records.md) | 服务记录、复核、GPS、音频、转写、导出 |

## 使用规则

- 后续 implementation plan 必须引用具体 tab 文档。
- 旧路径保留用于历史引用和外部链接，不再作为完整设计规格维护。
- 全局视觉风格、产品壳和通用 UI element 仍以 [`../../global-ui-guidance.md`](../../global-ui-guidance.md) 为准。
- 后端 API contract 仍以 [`../../api-contract/site-operations/README.md`](../../api-contract/site-operations/README.md) 为准。
