# 站点运营设计规格目录

状态：设计规格入口
日期：2026-05-14
路由：`/site-operations`

本文是站点运营设计规格的入口。站点运营业务复杂度较高，设计规格按 overall + tab 拆分；后续 implementation plan 必须引用具体 tab 文档，而不是只引用一个宽泛总文档。

## 阅读顺序

| 顺序 | 文档 | 作用 |
| --- | --- | --- |
| 1 | [`00-overall-design.md`](00-overall-design.md) | 总体目标、跨 tab 边界、全局 UI element 引用、交接要求 |
| 2 | [`01-home.md`](01-home.md) | 首页、聊天入口、右侧高亮信息面板、指令输入 |
| 3 | [`02-service-personnel.md`](02-service-personnel.md) | 服务人员目录、常用工牌关系、正向反馈信号 |
| 4 | [`03-devices.md`](03-devices.md) | 设备/智能工牌激活、健康、生命周期 |
| 5 | [`04-service-objects.md`](04-service-objects.md) | 服务对象、服务计划、计划例外、家属订阅 |
| 6 | [`05-service-schedules.md`](05-service-schedules.md) | 服务排期、按次服务、日历/时间线/地图 |
| 7 | [`06-service-records.md`](06-service-records.md) | 服务记录、复核、GPS、音频、转写、导出 |

## 契约关系

- 视觉风格、产品壳、通用 UI element：[`../../../global-ui-guidance.md`](../../../global-ui-guidance.md)
- 角色粗粒度结构：[`../../../role-ui-design.md`](../../../role-ui-design.md)
- 后端 API contract：[`../../../api-contract/site-operations/README.md`](../../../api-contract/site-operations/README.md)

## 拆分原则

- `00-overall-design.md` 只定义跨 tab 的规则，不定义单个列表行的字段级视觉层级。
- 每个 tab 文档必须定义自己的目的、边界、用户问题、主界面布局、列表/表格信息层级、Modal 信息架构、状态、动作归属、响应式、API 引用和验收。
- 任何列表型 UI 都必须明确 `Rich Row` 或 `Table` 的 primary、secondary、status、metric 和 trailing action。
- 任何 detail action 都必须明确归属：列表行、toolbar、Detail Modal、Drawer（辅助）或 inline detail panel。
- 如果 tab 文档和 overall 文档冲突，以 tab 文档的业务字段细节为准；以 overall 文档的跨 tab 边界和 global UI guidance 引用为准。

## 实现计划要求

后续实现计划按 tab 拆分：

```text
docs/superpowers/plans/site-operations/
  01-home-implementation.md
  02-service-personnel-implementation.md
  03-devices-implementation.md
  04-service-objects-implementation.md
  05-service-schedules-implementation.md
  06-service-records-implementation.md
```

每个 plan 必须列出它实现的 tab spec 小节，并逐条映射验收标准。
