# 站点运营 Overall Design

状态：设计规格
日期：2026-05-14
范围：`/site-operations` 总体产品契约和跨 tab 规则

## 1. 契约位置

站点运营是社区照护站的日常工作台。本文定义 overall 产品目标、tab 边界、全局 UI element 引用和交接要求；每个 tab 的字段级信息层级和具体验收由同目录 tab 文档定义。

全局产品壳、响应式规则、视觉 token 和通用 UI element 由 [`../../../global-ui-guidance.md`](../../../global-ui-guidance.md) 定义。后端 API contract 由 [`../../../api-contract/site-operations/README.md`](../../../api-contract/site-operations/README.md) 定义。

如果本文和 [`../../../role-ui-design.md`](../../../role-ui-design.md) 对站点运营的描述不同，以本文和同目录 tab 文档为业务实现契约；`global-ui-guidance.md` 始终是视觉契约。

## 2. 产品目标

运营人员进入页面后应直接看到可工作的界面，而不是营销页、说明页或占位页。

页面承接的主业务闭环：

```text
管理服务人员并激活智能工牌
  -> 维护服务对象和服务计划
  -> 服务计划和按次请求生成服务排期
  -> 服务发生，智能工牌采集音频
  -> 后端保存 GPS 证据、音频、转写和结构化服务记录
  -> 后端根据语音内容和运营上下文推断服务人员、服务对象和服务项目
  -> 运营人员复核服务记录并处理导出条件
  -> 服务对象记录和家属订阅状态可继续查询
```

核心原则：

- 数据实体术语使用 `服务人员`，不把普通上门照护人员统称为社工。
- `设备` 负责智能工牌激活、站点归属、可用性、同步健康和设备生命周期。
- `服务对象` 负责服务对象记录、照护上下文、家属订阅状态、服务计划和计划例外。
- `服务排期` 负责由服务计划和按次请求生成的具体服务日程，包括清单、日历、时间线和地图视图。
- `服务记录` 负责已完成服务的记录复核、服务异常、信息完整性、GPS 证据、音频、转写和导出状态。
- 需要复核的服务记录由 `ServiceRecord.reviewStatus: "needs_review"` 表示。
- 家属相关能力在此角色中只覆盖家属绑定和订阅状态。
- 所有可见业务区都必须对齐稳定的数据契约和后端动作。

## 3. 全局 UI Element 引用

站点运营页面必须只使用 `global-ui-guidance.md` 中定义的通用 UI element。本文和 tab 文档只引用 element 名称和业务用途，不定义 element 的具体表现规则。

| 本文视觉词 | 必须引用的 global UI element |
| --- | --- |
| Fieldwork 产品壳 | `App Shell` |
| 助手身份和运行状态头部 | `Assistant Header` |
| 左侧图标导航 | `Icon Navigation` |
| 手机底部导航 | `Mobile Bottom Navigation` |
| 底部指令输入 | `Command Input` |
| 中央聊天/事件流 | `Message Bubble`、`Structured Result Card`、`Quick Inquiry`、`Interactive Event Row` |
| 右侧高亮信息面板 | `Right Insight Panel`、移动端 `Right Insight Drawer` |
| 今日服务摘要、排期缺口等指标 | `KPI Card` 或 compact KPI list |
| 当前风险、关注对象、处理入口、最近动态 | `Risk / attention item`、`Action entry list`、`Activity list` |
| 搜索和筛选 | `Search and Input`、`Filter Chip`、`Segmented Control` |
| 状态 | `Status Badge` |
| 主动作、次动作、危险动作 | `Button` |
| 业务列表项 | `Rich Row` |
| 需要横向比较的高密度清单 | `Table` |
| 批量动作 | `Batch Action Bar` |
| 详情查看、创建、编辑 | `Detail Modal` |
| 导出确认或导出设置 | `Drawer`（辅助模式）或 `Inline Detail Panel` |
| 空、加载、错误、权限受限 | `Empty / Loading / Error` |

引用约束：

- 本文和 tab 文档不定义 element 的表现参数；这些全部以 `global-ui-guidance.md` 为准。
- tab 文档只能定义业务字段、动作归属、场景、状态和应引用的 global UI element。
- 如果 tab 文档需要新 element，先更新 `global-ui-guidance.md`，再回到 tab 文档引用该 element。

### 3.1 UI Conformance Gate

后续实现和评审必须先通过以下 UI 契约检查：

- button reset 不得覆盖具体 button element 的字号、字重和行高。
- disclosure 必须是 `Rich Row`、`Action entry list` 或 `Interactive Event Row` 的 trailing slot，不作为独立裸文字按钮漂浮在 bubble 内。
- 首页事件流中的工作区跳转必须使用 `Interactive Event Row`；右侧面板处理入口必须使用 `Action entry list`。
- `Right Insight Panel` 超过 4 个 KPI 时使用 compact KPI group，不使用带阴影的大 KPI card 网格。
- 业务列表行内最多一个显性入口；编辑、归档、绑定、导出、复核、播放音频等 detail actions 全部进入 `Detail Modal` 或页面明确允许的 `Inline Detail Panel`。
- 主工作区内的 table、rich row、batch action bar、summary strip 默认 flat，不在 raised surface 内继续加阴影。
- 手机端 table 必须转换为带 slot 语义的 rich row/card-list，不只是隐藏表头后堆叠 cell。

## 4. 工作区

站点运营路由有六个工作区。导航标签和页面标题必须分离：

| 工作区 id | 导航标签 | 页面标题 | 设计文档 |
| --- | --- | --- | --- |
| `home` | `首页` | `首页` | [`01-home.md`](01-home.md) |
| `social_workers` | `人员` | `服务人员` | [`02-service-personnel.md`](02-service-personnel.md) |
| `smart_badges` | `设备` | `设备` | [`03-devices.md`](03-devices.md) |
| `service_objects` | `对象` | `服务对象` | [`04-service-objects.md`](04-service-objects.md) |
| `service_schedules` | `排期` | `服务排期` | [`05-service-schedules.md`](05-service-schedules.md) |
| `service_records` | `记录` | `服务记录` | [`06-service-records.md`](06-service-records.md) |

对应 API contract：

| 工作区 id | API contract |
| --- | --- |
| `home` | [`../../../api-contract/site-operations/01-home-api.md`](../../../api-contract/site-operations/01-home-api.md) |
| `social_workers` | [`../../../api-contract/site-operations/02-service-personnel-api.md`](../../../api-contract/site-operations/02-service-personnel-api.md) |
| `smart_badges` | [`../../../api-contract/site-operations/03-devices-api.md`](../../../api-contract/site-operations/03-devices-api.md) |
| `service_objects` | [`../../../api-contract/site-operations/04-service-objects-api.md`](../../../api-contract/site-operations/04-service-objects-api.md) |
| `service_schedules` | [`../../../api-contract/site-operations/05-service-schedules-api.md`](../../../api-contract/site-operations/05-service-schedules-api.md) |
| `service_records` | [`../../../api-contract/site-operations/06-service-records-api.md`](../../../api-contract/site-operations/06-service-records-api.md) |

`Icon Navigation` 和 `Mobile Bottom Navigation` 只回答“去哪里”。业务内容、筛选、列表、详情和动作都在选中的工作区内完成。

## 5. 首页和业务 Tab 的区别

首页使用完整 `App Shell`：

```text
Icon Navigation
  + Assistant Header
  + Message Bubble / Structured Result Card / Interactive Event Row / Quick Inquiry
  + Right Insight Panel
  + Command Input
```

业务 tab 使用主工作区布局：

- 筛选和搜索：`Search and Input`、`Filter Chip` 或 `Segmented Control`
- 列表、表格、日历、时间线或地图：优先 `Rich Row`；需要横向比较时才使用 `Table`
- 详情：`Detail Modal`（居中全屏，92vh），辅助操作使用 `Drawer`
- 批量动作：`Batch Action Bar`
- 空、加载、错误、不可用和权限受限状态：`Empty / Loading / Error`

右侧高亮信息面板只属于首页。其他工作区使用完整主工作区，不显示 `Right Insight Panel`。

## 6. 跨 Tab 边界

| 能力 | 所属 tab | 不属于 |
| --- | --- | --- |
| 服务人员目录、联系方式、常用工牌关系、表扬信号 | 服务人员 | 设备生命周期、排期工作量 |
| 智能工牌激活、可用性、同步健康、生命周期 | 设备 | 服务人员档案编辑、服务对象档案 |
| 服务对象档案、地址、照护重点、家属订阅、服务计划、计划例外 | 服务对象 | 已完成服务事实、记录导出 |
| 服务计划生成的具体排期、按次服务、单条排期调整 | 服务排期 | 周期规则编辑、服务记录复核 |
| GPS 证据、音频、转写、结构化摘要、异常、复核、导出 | 服务记录 | 排期创建、设备激活 |

跨 tab 跳转可以存在，但动作归属不能混淆。例如：设备列表可以链接最近服务记录，但播放音频和复核动作必须在服务记录详情中完成。

## 7. 交接要求

实现必须便于后端工程师接手：

- 稳定路由：`/site-operations`
- 稳定工作区：`home`、`social_workers`、`smart_badges`、`service_objects`、`service_schedules`、`service_records`
- 评审和联调数据必须符合 API 响应形状
- UI 组件命名围绕业务概念和交接语义
- 每个主动作都必须在 `api.ts` 有边界函数，并在交接契约中有对应端点或事件。缺少端点或事件时，必须先更新交接契约再实现。
- 空、加载、错误、不可用、权限受限状态都必须表示
- 原始音频播放必须由后端通过权限路由或短时签名地址授权

## 8. Overall 验收清单

- `/site-operations` 打开后进入 `首页`。
- 首页使用 Fieldwork 产品壳的聊天/事件流、右侧高亮信息面板和底部指令输入。
- 右侧高亮信息面板只属于首页。
- 非首页工作区不显示首页右侧高亮信息面板。
- 每个业务 tab 的列表/表格信息层级以对应 tab 文档为准。
- 每个业务 tab 的 detail actions 进入对应 tab 文档定义的 `Detail Modal` 或 detail panel。
- UI 必须达到生产质量并适合后端交接。
