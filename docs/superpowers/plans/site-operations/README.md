# Site Operations Implementation Plans

状态：implementation plan 入口
日期：2026-05-14
路由：`/site-operations`

本文是站点运营按 tab 实现计划的入口。实现顺序以 `docs/todos.md` 为准，先完成首页计划 review，再进入首页实现。

## 计划列表

| 顺序 | 工作区 | 计划 | 状态 |
| --- | --- | --- | --- |
| 1 | `home` | [`01-home-implementation.md`](01-home-implementation.md) | ready for review |
| 2 | `social_workers` | [`02-service-personnel-implementation.md`](02-service-personnel-implementation.md) | ready for review |
| 3 | `smart_badges` | `03-devices-implementation.md` | not started |
| 4 | `service_objects` | `04-service-objects-implementation.md` | not started |
| 5 | `service_schedules` | `05-service-schedules-implementation.md` | not started |
| 6 | `service_records` | `06-service-records-implementation.md` | not started |

## 执行规则

- 每个 tab plan 必须引用对应 design spec、API contract、当前实现代码和测试文件。
- 每个 tab plan 先 review，再执行实现。
- 实现阶段必须按 plan 的测试步骤执行，不直接跳到代码修改。
