# 站点运营首页 Design

状态：设计规格
日期：2026-05-15
工作区 id：`home`

## 1. 目的和边界

首页是 AI 辅助的站点运营态势入口，负责让运营人员快速理解今天的关键事项，并通过指令继续追问或触发业务工作区。

首页负责：

- 当前日期的运营摘要。
- 排期缺口、待复核记录、设备健康和导出准备状态。
- 助手事件流、结构化结果卡、快速追问入口和交互式事件入口。
- 首页右侧高亮信息面板。

业务工作区承接：

- 编辑服务人员、设备、服务对象、排期或记录。
- 承载业务 tab 的完整列表和复杂筛选。
- 展示非首页业务 tab 的右侧 panel。

## 2. 用户要回答的问题

- 今天还有谁没排期？
- 哪些智能工牌离线或未同步？
- 哪些服务记录需要确认？
- 哪些服务记录能导出？
- 哪些服务对象或服务事项需要优先关注？

## 3. 主界面布局

首页使用完整 `App Shell`：

```text
Icon Navigation
  + Assistant Header
  + Message Bubble / Structured Result Card / Interactive Event Row / Quick Inquiry
  + Right Insight Panel 或移动端 Right Insight Drawer
  + Command Input
```

中央事件流使用 AI 聊天界面，每条消息左侧有紫色 Bot 图标 avatar：

- `Message Bubble`：运营摘要、系统播报、用户提问。
- `Structured Result Card`：排期缺口、导出准备情况、服务对象风险、记录复核摘要。
- `Interactive Event Row`：从事件流进入设备、服务排期、服务记录等工作区的导航入口。
- `Quick Inquiry`：可继续追问的问题，具体 UI 规则引用 `global-ui-guidance.md`。

事件流示例：

- “今日还有 6 个服务对象未排期。”
- “智能工牌 FW-021 已接入站点，今日可用。”
- “4 条服务记录信息不完整，已放入服务记录。”
- “查一下今天谁还没排期。”

快速追问交互契约：

- 每个追问入口包含问题正文和短 hint，例如“待排服务对象”。
- 点击追问入口后，把问题正文填入底部 `Command Input`，不直接切换业务 tab。
- 追问入口的 UI element、响应式和点击目标规则引用 `global-ui-guidance.md` 的 `Quick Inquiry`。

交互式事件入口契约：

- “进入设备”“进入服务排期”“进入服务记录”等入口统一为 `Interactive Event Row`。
- 入口必须归属对应事件或结构化结果卡，作为独立 compact row 或结构化结果卡内 row 呈现。
- 入口不得作为 `Message Bubble` 内部的裸文字按钮或普通 row action。
- 同一事件行只展示一个可点击目标，target label 使用业务工作区名，例如“设备”“服务排期”“服务记录”；“进入”语义由 disclosure icon 和 aria label 表达。
- 点击后切换到对应工作区；只有 API 或工作区已存在的目标才能展示为可点击入口。
- 入口 UI element 规则引用 `global-ui-guidance.md` 的 `Interactive Event Row`。

交互式事件行 slot：

| Slot | 首页内容 | 说明 |
| --- | --- | --- |
| event title | 活动标题，例如“智能工牌 FW-021 已接入站点” | 主要事件 |
| supporting text | 活动描述或影响，例如“今日可用” | 最多两行 |
| target label | `设备`、`服务排期`、`服务记录`、`服务对象` | 只写目标工作区 |
| trailing disclosure icon | 进入目标工作区 | 不表达状态 |

禁止：

- 用 primary/secondary button 承载事件流跳转。
- 在一个事件行里展示多个目标入口。
- 在事件流里伪装尚未存在 API 或工作区的可执行动作。

## 4. 右侧高亮信息面板

右侧高亮信息面板使用 `Right Insight Panel`，只出现在首页。

信息层级：

| 区域 | 内容 | 信息层级 |
| --- | --- | --- |
| panel title | 今日概览 / 当前日期 | 面板标题，不得大于 page title |
| compact KPI list | 今日服务数、待排缺口、待复核记录、在线人员/工牌、可导出记录 | 数字可突出，label 弱化，5 项 2 列 flat grid |
| risk / attention item | 最需要关注的一到三件事 | 高优先级业务信号 |
| action entry list | 去排期、去复核、查看设备等入口 | 轻量动作列表，不堆大按钮 |
| activity list | 最近动态 | 弱信息，时间线式展示 |

右侧面板的信息重点是 KPI、风险项和处理入口；具体标题、层级和 panel 规则引用 `global-ui-guidance.md` 的 `Right Insight Panel`。

右侧面板约束：

- compact KPI list 共 5 项（今日服务、待排缺口、待复核、在线人员/工牌、可导出记录），使用 2 列 flat grid，不使用带阴影 KPI card。
- 处理入口统一使用 `Action entry list`，每行包含 action label、目标工作区和 trailing disclosure icon。
- 最近动态统一使用 `Activity list`，不混入 KPI value 或处理入口。
- 移动端 drawer 内沿用同一信息层级，不重新定义一套视觉。

## 5. 指令输入

底部输入使用 `Command Input`：

- 固定在主工作区底部。
- 发送按钮使用 icon-only primary button。
- 输入提交后进入 `agent_processing` 状态。
- 助手失败时显示 `agent_error`，但业务工作区仍可用。

## 6. API Contract

本 tab 的 API contract：

[`../../../api-contract/site-operations/01-home-api.md`](../../../api-contract/site-operations/01-home-api.md)

本 tab UI 依赖：

- `HomeSummary`
- `HomeHighlight`
- `HomeActivity`
- 首页处理入口数据
- `GET /api/site-operations/home`

## 7. UI 派生状态

首页 API 不提供独立 `state` 字段。首页状态由 API 响应形状和本地交互派生：

- `normal`：`GET /api/site-operations/home` 成功返回，运营摘要、事件流、结构化结果卡、快速追问和右侧高亮信息可用。
- `has_pending_actions`：不作为 API 字段；当首页处理入口、`highlights`、`summary.recordsNeedReview` 或 `summary.unassignedServices` 有待处理数据时，右侧高亮信息面板展示待处理数量和处理入口。
- `empty_today`：不作为 API 字段；当 `summary.totalScheduledServices === 0` 时展示当天没有服务安排。
- `agent_processing`：本地交互状态；运营人员提交 `Command Input` 后展示响应生成中。
- `agent_error`：首页 API 或助手入口失败时展示错误状态，但业务工作区仍可通过导航继续使用。

## 8. 响应式

- 桌面端展示右侧 `Right Insight Panel`，面板支持收起/展开切换（PanelRightOpen / PanelRightClose 图标），收起时主区域宽度自动扩展。
- 窄屏下右侧高亮信息进入底部 `Right Insight Drawer`。
- 主事件流顶部或 KPI 区附近提供 breadcrumb opener，文案形态为”首页 / 今日概览”。
- 点击 breadcrumb opener 打开底部 drawer；drawer 包含 header、KPI group（5 项）、重点关注、处理入口和最近动态（最多 3 条）。
- 窄屏下必须保留进入今日概览的入口。
- `Command Input` 和 `Mobile Bottom Navigation` 不能互相遮挡。

## 9. 验收

- `/site-operations` 打开后默认进入首页。
- 首页使用 `App Shell`：聊天/事件流、`Right Insight Panel`、`Command Input`。
- 右侧高亮信息面板只属于首页。
- 右侧高亮信息面板按全局 `Right Insight Panel` 规则呈现。
- 处理入口使用 action list，不是多个大按钮。
- 快速追问使用全局 `Quick Inquiry` 风格，点击后填入 `Command Input`。
- 事件流中的工作区跳转使用全局 `Interactive Event Row` 风格。
- 手机端今日概览通过 breadcrumb opener 打开底部 `Right Insight Drawer`。
- 非首页工作区使用主工作区布局，不显示首页右侧面板。
