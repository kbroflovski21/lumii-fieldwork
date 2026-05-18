# 服务对象 Tab Design

状态：设计规格
日期：2026-05-15
工作区 id：`service_objects`
页面标题：`服务对象`

## 1. 目的和边界

本 tab 管理站点服务对象的完整档案：基础信息、照护上下文、服务资格、服务计划、计划例外、AI 洞察和家属订阅。

服务对象是整条业务链路的核心——从服务需求产生、排班派单、SOP 驱动的上门服务、到服务凭证采集和家属报告，都围绕服务对象展开。每个服务对象可以有多个周期性服务计划（如"每周一三五助餐"），也可以从档案直接发起按次服务。

### 本 tab 负责

- 服务对象基础档案维护（姓名、年龄、性别、地址、健康情况、注意事项）。
- 服务资格管理（养护险、政府购买服务、机构服务、自费）。
- 地址和地图显示点维护。
- 服务计划（周期性照护规则）的创建、编辑、暂停、归档。
- 计划例外（暂停、调整时间、替换服务人员、跳过服务）管理。
- AI 洞察展示（身体、情绪、用药、风险趋势）。
- 家属联系人和订阅状态管理。
- 从服务对象档案发起按次服务（生成一条服务排期）。
- 风险标签和照护重点维护。

### 边界

- 已完成服务的 GPS 证据、音频、转写和导出 → `服务记录` tab。
- 已生成的具体单条排期调整 → `服务排期` tab。
- 服务人员档案 → `服务人员` tab。
- 家属端小程序/公众号的用户界面 → 不在 Fieldwork 范围内。

## 2. 用户要回答的问题

来自 `business-use-cases.md` 和 `agentic-flows.md` 的关键运营问题：

| 问题 | 对应用例 |
| --- | --- |
| 站点有多少服务对象？各资格类型分布如何？ | 4.3 维护服务对象档案 |
| 某个服务对象住在哪里，有什么照护重点和注意事项？ | 4.3、4.8 SOP 驱动服务 |
| 某个服务对象属于养护险还是政府购买服务？ | 4.3 服务资格 |
| 服务对象当前有什么服务计划？频次是什么？ | 4.7 排班派单 |
| 是否需要暂停、调整或跳过某次计划服务？ | 4.7 改约/取消 |
| 最近有什么风险、洞察或状态变化？ | 4.13 服务对象洞察、F06 周期性洞察报告 |
| 哪些服务对象需要优先关注？ | 首页"优先关注事项"提醒 |
| 这个服务对象的家属订阅了什么？ | 4.12、F07 家属订阅和报告 |
| 能否从档案创建一条临时服务安排？ | 4.6 外生需求 |
| 哪些服务对象资料缺失或服务资格过期？ | 日常运营监控 |

## 3. 核心概念

| 概念 | 说明 | 来源 |
| --- | --- | --- |
| 服务对象 | 接受照护的人，站点服务关系的核心记录 | business-use-cases 4.3 |
| 服务资格 | 养护险（insurance）、政府购买（government）、机构（institution）、自费（self_paid） | business-use-cases 4.3 |
| 服务计划 | 周期性照护规则，含项目、频次、偏好时间窗和半固定服务人员 | business-use-cases 4.7 |
| 计划例外 | 对服务计划的临时调整：暂停、时间变更、人员替换、跳过一次 | business-use-cases 4.7 |
| AI 洞察 | 从服务记录、家属反馈和服务趋势自动生成的风险观察和建议 | agentic-flows F06 |
| 家属联系人 | 服务对象家属，含联系方式、关系、订阅偏好 | business-use-cases 4.12、F07 |
| 风险标签 | 独居、跌倒风险、认知障碍等需关注的风险标识 | business-use-cases 4.3 |
| 照护重点 | 午餐后需确认服药、不能食用某类食物等具体注意事项 | business-use-cases 4.8 |

## 4. 主界面布局

### 页头

```text
服务对象                                          [+ 新增服务对象]
管理服务对象档案、服务计划、照护重点和家属订阅
```

- page title：`服务对象`
- 简短说明：管理服务对象档案、服务计划、照护重点和家属订阅
- 一个 primary button：`新增服务对象`

### Table container

```text
┌──────────────────────────────────────────────────────────────────┐
│ [🔍搜索姓名或地址] [服务资格 ▾] [服务状态 ▾] [风险标签 ▾]          │
├──────────────────────────────────────────────────────────────────┤
│ 姓名      地址           资格    服务计划        家属订阅    状态    │
├──────────────────────────────────────────────────────────────────┤
│ 陈阿姨    控江路1200号   政府    助餐·每周一三五   周报      正常    │
│ 李爷爷    长阳路800号    养护险  助浴·每周两次    未订阅    需关注   │
└──────────────────────────────────────────────────────────────────┘
```

## 5. 筛选与搜索

### 搜索

按姓名或地址模糊搜索，本地过滤。

### 服务资格下拉框

| 选项 | 过滤逻辑 |
| --- | --- |
| 服务资格（默认） | 不过滤 |
| 养护险 | `eligibilityType === "insurance"` |
| 政府购买 | `eligibilityType === "government"` |
| 机构服务 | `eligibilityType === "institution"` |
| 自费 | `eligibilityType === "self_paid"` |

### 服务状态下拉框

| 选项 | 过滤逻辑 |
| --- | --- |
| 服务状态（默认） | 不过滤 |
| 正常 | `state === "normal"` 或 `state === "plan_active"` 或 `state === "subscribed"` |
| 需关注 | `riskTags.length > 0` 或 `state === "risk_tagged"` 或 `state === "plan_exception_active"` |
| 计划暂停 | `state === "plan_paused"` |
| 家属未绑定 | `state === "family_binding_pending"` |

### 风险标签下拉框

| 选项 | 过滤逻辑 |
| --- | --- |
| 风险标签（默认） | 不过滤 |
| 有风险标签 | `riskTags.length > 0` |
| 无风险标签 | `riskTags.length === 0` |

筛选规则：

- 下拉框默认显示字段名，不显示"全部"。
- 选中非默认值时文字变为 `--accent` 色。
- 三个下拉框可组合使用，和搜索可叠加。

## 6. Table 列定义

列布局：`grid-template-columns: 1fr 1.3fr 0.7fr 1.2fr 0.7fr 0.7fr`

| 列 | 内容 | 样式 |
| --- | --- | --- |
| 姓名 | `name`，下方小字显示年龄/性别 | avatar + 14px/600 name link，可点击打开 Modal |
| 地址 | `address`，截断为一行 | body 13px，溢出 ellipsis |
| 资格 | `eligibilityType` 中文 tag | tag 样式 |
| 服务计划 | 第一个 `servicePlanSummary` 的 `serviceProject · cadenceLabel`；无计划显示 `—` muted | body 13px |
| 家属订阅 | `familySubscriptionSummary` 中文 | body 13px；`none` 显示 "未订阅" muted |
| 状态 | 综合状态 badge | 语义色 |

### 资格类型映射

| eligibilityType | 中文 |
| --- | --- |
| `insurance` | 养护险 |
| `government` | 政府购买 |
| `institution` | 机构服务 |
| `self_paid` | 自费 |

### 家属订阅映射

| familySubscriptionSummary | 中文 |
| --- | --- |
| `none` | 未订阅 |
| `daily` | 日报 |
| `weekly` | 周报 |
| `monthly` | 月报 |

### 综合状态推导

UI 需要从 `state` 字段或多个字段组合推导出一个用户可理解的综合状态：

| 状态 | tone | 条件 |
| --- | --- | --- |
| 正常 | success | 有活跃计划，无风险标签，无活跃例外 |
| 需关注 | warning | `riskTags.length > 0` 或 `state === "risk_tagged"` |
| 计划例外 | warning | `state === "plan_exception_active"` |
| 计划暂停 | muted | `state === "plan_paused"` |
| 待绑定 | muted | `state === "family_binding_pending"` |
| 已归档 | muted | 归档 |

### 行交互

| 平台 | 交互 | 行为 |
| --- | --- | --- |
| 桌面 | 单击行 | 选中行（高亮 + 左侧蓝色边条） |
| 桌面 | 点击姓名 | 打开档案 Modal |
| 桌面 | 双击行 | 打开档案 Modal |
| 手机 | 单击整行 | 直接打开底部 Modal |

禁止：

- 列表行展示编辑、归档、创建计划、管理家属等操作按钮。
- 把完整服务计划或家属联系人表格塞进列表行。
- 详情内容直接接在列表行下方。

## 7. Modal 信息架构

Modal 有三种模式：查看档案、编辑档案、新增服务对象。所有模式使用居中全屏 Modal（CSS class `so-modal`），高度固定 92vh，不随内容动态调整。

### 通用 Modal 结构

```text
┌──────────────────────────────────────────────┐
│ 摘要卡 (so-modal__summary)                    │
│   avatar + 姓名 + 资格/状态 + 关闭按钮        │
├──────────────────────────────────────────────┤
│ Tab 导航 (so-modal__tabs)                     │
│   [档案概览] [服务计划] [服务历史] [家属联系人] │
├──────────────────────────────────────────────┤
│ 内容区 (so-modal__content, scrollable)        │
│   3 列概览网格 / tab 内容                      │
├──────────────────────────────────────────────┤
│ 底部操作栏 (so-modal__footer)                  │
│   左: [归档]  右: [编辑档案] [安排服务]        │
└──────────────────────────────────────────────┘
```

### 查看档案 Modal（`so-modal--view`）

点击姓名或双击行（手机单击行）打开。

**摘要卡**：avatar（per-name 彩色底 + 首字母）+ 服务对象姓名 + `资格类型 · 综合状态` 副标题 + 风险标签（warning tone tag） + 关闭按钮。padding 14px，标题 17px。

**Tab 导航**：4 个 tab — `档案概览`、`服务计划`、`服务历史`、`家属联系人`。

**Tab 1：档案概览**

3 列概览网格（`so-modal__overview`，`grid-template-columns: 1fr 1fr 1fr`），字段间用右边框分隔：

| 行 | 列 1 | 列 2 | 列 3 |
| --- | --- | --- | --- |
| 行 1 | 姓名 `name` | 电话 `phone` | 年龄/性别 `age`岁 · `gender` |
| 行 2 | 服务资格 `eligibilityType`（中文 tag） | 服务频次 `serviceFrequency` | 服务项目 `serviceProjects`（逗号分隔） |
| 行 3 | 地址 `address`（full-width 跨 3 列） | — | — |

照护重点 section（在概览网格下方）：

- 风险标签：`riskTags` 展示为 warning tone 的 tag 列表（如"独居""跌倒风险"）
- 照护备注：`careNotes` 逐条展示（如"午餐后需确认服药"）
- 无风险标签和照护备注时显示"暂无特殊注意事项"muted

AI 洞察 section：

- `latestInsightSummary`：一段摘要文字
- `insightSummaries`：列表展示，每条含 title + description + severity（info/warning/critical）
- severity 使用左侧边条颜色（同首页 alert 风格）
- 无洞察时显示"暂无洞察"muted

**Tab 2：服务计划**

服务计划 section 从 API 加载已保存的排期数据：请求 `GET /api/service-schedule-occurrences?serviceObjectId={id}` 获取该服务对象的所有排期，展示为计划列表。

每个 `servicePlanSummary` 展示为一个 sub-card：

| 字段 | 说明 |
| --- | --- |
| 服务项目 | `serviceProject` |
| 频次 | `cadenceLabel`（如"每周一三五"） |
| 时间窗 | `preferredTimeWindow.label` 或 `start - end` |
| 半固定人员 | `primarySocialWorkerName` 或 "未指定" muted |
| 状态 | `status` badge（active=success, paused=muted, archived=muted） |
| 活跃例外 | `activeExceptionCount > 0` 时显示 warning badge |

**AI 安排服务（点击"安排服务"按钮展开，替代档案 sections 区域）**

安排服务使用 AI 自然语言输入，后台自动解析并生成多条服务项。

交互设计：

```text
┌─────────────────────────────────────────────┐
│ ✨ AI 安排服务                        [收起] │
│                                             │
│ 描述服务安排，AI 自动生成服务计划：            │
│                                             │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│ │每周一三五 │ │下周二陪诊│ │每天上午  │      │
│ │上午助餐   │ │         │ │探访关爱  │      │
│ └──────────┘ └──────────┘ └──────────┘      │
│                                             │
│ [输入服务安排，如"每周一三五上午10点助餐"... 🔵]│
│                                             │
│ 已生成 3 条服务项           [全部确认 (3)]    │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ 助餐                    [确认] [⊘] [📅] │ │
│ │ 周一 · 2026-05-18 · 上午 10:00-12:00   │ │
│ │                           点击修改       │ │
│ ├─────────────────────────────────────────┤ │
│ │ 助餐                    [确认] [⊘] [📅] │ │
│ │ 周三 · 2026-05-20 · 上午 10:00-12:00   │ │
│ ├─────────────────────────────────────────┤ │
│ │ 助餐                    [确认] [⊘] [📅] │ │
│ │ 周五 · 2026-05-22 · 上午 10:00-12:00   │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

输入区：

- 顶部标题：`✨ AI 安排服务`，右侧"收起"按钮
- 提示文字：描述服务安排，AI 自动生成服务计划
- 示例 prompt pills：可点击自动填入输入框
  - "每周一、三、五上午10点到12点助餐"
  - "下周二下午2点陪诊"
  - "每天上午9点到11点探访关爱"
  - "本周五下午助浴"
- 输入框：pill 形状（`--ai-accent` 边框），Enter 或点击发送按钮提交
- 发送按钮：圆形紫色（`--ai-accent`）

AI 解析规则（前端 mock）：

- 从输入中提取服务类型关键词（助餐/助浴/陪诊/探访关爱/助洁）
- 从输入中提取星期几（"一""三""五" → 生成对应天数的服务项）
- 从输入中提取时间段（"上午""下午""9点""10点"等 → 映射预设时间窗）
- "每天"/"每日" → 生成周一到周五 5 条服务项

生成服务项：

- 每条服务项显示为卡片：服务项目名 + 星期 + 日期 + 时间段
- 待确认状态下右侧有 3 个操作按钮：
  - **确认**（绿色按钮）→ 左侧绿色边条 + "已确认" badge
  - **取消**（Ban 图标）→ 淡出 + 删除线 + "已取消" badge
  - **延期**（CalendarClock 图标）→ 橙色左边条 + "已延期" badge
- **全部确认**：顶部批量按钮，一键确认所有待处理项
- **修改**：点击服务项信息区域展开内嵌编辑器（修改服务内容下拉/日期/时间段），保存后更新卡片
- 确认/取消/延期后按钮区变为状态 badge，不可再操作

AI 生成计划的持久化：

- 用户确认每条服务项后，前端调用 `POST /api/service-schedule-occurrences`（`createOneTimeServiceSchedule`）将排期持久化到后端。
- 确认后的计划在服务计划 section 中立即可见（section 从 API 重新加载）。
- "全部确认"批量操作逐条调用 API 创建排期。

设计原则：

- 操作不跳转页面，在当前 Modal body 内完成（展开时隐藏档案 sections）。
- `服务排期` tab 是只读的排期总览（日历/列表），不承载创建操作。
- AI 自然语言降低操作门槛——用户说"每周一三五助餐"就够了，不需要一个个填表。
- 生成后每条可独立确认/取消/延期/修改，保留精细控制能力。

**Tab 3：服务历史**

该服务对象的历史服务记录列表：

- 每行展示：`服务项目 · 服务日期`（strong）+ `起止时间 · 服务人员 · 完成业务项数/总业务项数`
- 右侧展示状态 badges：有异常时显示"有异常" warning badge + 复核状态 badge（已确认=success，待复核=warning）
- 每行右侧有"查看记录"按钮（FileText 图标），点击打开 RecordDrawer
- RecordDrawer 使用**内联替换**模式：`viewingRecord` 状态触发 early return，RecordDrawer 完全替换当前服务对象 Modal（不叠加第二层 Modal）
- RecordDrawer header 使用"← 返回服务对象"按钮，点击清除 `viewingRecord` 状态回到服务对象 Modal
- 历史记录中 `serviceItems` 按 `category: "business"` 统计完成项数

**Tab 4：家属联系人**

每个 `familyContact` 展示为一行：

| 字段 | 说明 |
| --- | --- |
| 姓名 | `name` |
| 关系 | `relation`（如"女儿"） |
| 电话 | `phone`（restricted 模式下脱敏） |
| 订阅状态 | `subscriptionStatus` 中文 badge |
| 最近推送 | `lastPushedAt` 格式化时间 |

订阅状态映射：

| subscriptionStatus | 中文 | tone |
| --- | --- | --- |
| `none` | 未订阅 | muted |
| `daily` | 日报 | success |
| `weekly` | 周报 | success |
| `monthly` | 月报 | success |
| `exception_only` | 仅异常 | warning |

家属联系人的新增和编辑在"编辑档案"和"新增服务对象"Modal 的表单中完成。

### 编辑档案 Modal（`so-modal--form`）

摘要卡标题改为"编辑服务对象"。使用 `so-form-cards` 布局。

底部操作栏：[取消]（secondary）[保存]（primary）。

表单字段（分两个区）：

**基础信息区：**

- 姓名（必填）
- 电话
- 年龄 + 性别（并排）
- 地址（必填）
- 服务资格下拉
- 服务项目（逗号/顿号分隔输入）
- 服务频次
- 风险标签（逗号/顿号分隔输入）
- 照护备注（多行输入）

**家属联系人区（分割线 + section title）：**

- 家属姓名 + 关系（并排）
- 家属电话

### 新增服务对象 Modal（`so-modal--form`）

摘要卡标题改为"新增服务对象"。使用 `so-form-cards` 布局。

底部操作栏：[取消]（secondary）[创建]（primary）。

表单字段同编辑，但姓名和地址为必填，资格类型必选。

创建成功后关闭 Modal 并刷新列表。

## 8. 动作归属

| 动作 | 归属 | 对应用例 |
| --- | --- | --- |
| 新增服务对象 | 页头 primary button → 新增 Modal | 4.3 维护服务对象档案 |
| 编辑服务对象 | 查看 Modal → 编辑 Modal | 4.3 |
| 归档服务对象 | 查看 Modal danger action + 确认 | 4.3 |
| AI 安排服务 | 查看 Modal → AI 自然语言输入 → 生成多条服务项 → 逐条确认/取消/延期/修改 | 4.6 外生需求 |
| 确认/取消/延期服务项 | AI 安排服务生成的每条服务项右侧按钮 | 4.7 排班管理 |
| 修改生成的服务项 | 点击服务项信息区展开内嵌编辑器 | 4.7 排班管理 |
| 编辑家属联系人 | 编辑/新增 Modal 表单中的家属联系人区 | 4.12、F07 |
| 查看洞察详情 | 查看 Modal 洞察 section | 4.13、F06 |

动作实现约束：

- 列表行不展示任何操作按钮。
- "AI 安排服务"在 Modal body 内完成（展开时隐藏档案 sections），不跳转页面。
- 家属联系人在编辑/新增 Modal 表单中维护，不单独设"更新家属订阅"按钮。
- 生成的服务项支持逐条确认、取消、延期和修改。

## 9. 状态

### ServiceObject state 枚举

```ts
type ServiceObjectState =
  | "normal"                   // 正常
  | "family_binding_pending"   // 家属待绑定
  | "subscribed"               // 家属已订阅
  | "risk_tagged"              // 有风险标签
  | "service_ineligible"       // 服务资格无效
  | "plan_active"              // 有活跃计划
  | "plan_paused"              // 计划已暂停
  | "plan_exception_active";   // 有活跃计划例外
```

### 页面数据状态

- `empty_objects`：站点还没有服务对象，显示"暂无服务对象"并提供新增入口。
- 筛选/搜索无结果：显示"没有匹配的服务对象"。
- 加载中：显示"服务对象数据加载中..."。
- 加载失败：显示错误信息。
- `read_only`：只读模式，新增、编辑和归档操作禁用。
- `restricted`：权限受限，家属电话脱敏。
- `unavailable`：显示不可用原因。

## 10. 数据契约

本 tab 的数据类型对齐 API contract [`../../../api-contract/site-operations/04-service-objects-api.md`](../../../api-contract/site-operations/04-service-objects-api.md)。

### 核心类型

```ts
type ServiceEligibilityType = "insurance" | "government" | "institution" | "self_paid";

type ServiceObject = {
  id: string;
  name: string;
  phone?: string;
  age?: number;
  gender?: "female" | "male" | "unknown";
  address: string;
  mapDisplayPoint?: MapDisplayPoint;
  eligibilityType: ServiceEligibilityType | string;
  serviceProjects: string[];
  serviceFrequency?: string;
  careNotes: string[];
  riskTags: string[];
  familySubscriptionSummary: "none" | "daily" | "weekly" | "monthly";
  latestInsightSummary?: string;
  insightSummaries?: InsightSummary[];
  servicePlanSummaries: ServicePlanSummary[];
  familyContacts: FamilyContact[];
  state?: ServiceObjectState;
};

type InsightSummary = {
  id: string;
  title: string;
  description: string;
  severity?: "info" | "warning" | "critical";
};

type ServicePlanSummary = {
  id: string;
  serviceObjectId: string;
  serviceProject: string;
  cadenceLabel: string;
  preferredTimeWindow: TimeWindow;
  primarySocialWorkerId?: string;
  primarySocialWorkerName?: string;
  status: "active" | "paused" | "archived";
  activeExceptionCount: number;
};

type ServicePlan = {
  id: string;
  serviceObjectId: string;
  serviceProject: string;
  cadenceRule: string;
  cadenceLabel: string;
  preferredTimeWindow: TimeWindow;
  startDate: string;
  endDate?: string;
  primarySocialWorkerId?: string;
  status: "active" | "paused" | "archived";
  exceptions: ServicePlanException[];
  nextScheduleAt?: string;
};

type ServicePlanException = {
  id: string;
  servicePlanId: string;
  kind: "pause" | "time_change" | "worker_change" | "skip";
  effectiveFrom: string;
  effectiveTo?: string;
  timeWindow?: TimeWindow;
  replacementSocialWorkerId?: string;
  note?: string;
};

type FamilyContact = {
  id: string;
  name: string;
  relation: string;
  phone: string;
  subscriptionStatus: "none" | "daily" | "weekly" | "monthly" | "exception_only";
  lastPushedAt?: string;
};

type ServiceObjectsResponse = {
  serviceObjects: ServiceObject[];
  servicePlans: ServicePlan[];
  operationalState: WorkAreaOperationalState;
};
```

### API Endpoints

- `GET /api/service-objects` — 列表
- `POST /api/service-objects` — 新增
- `GET /api/service-objects/:id` — 单个详情
- `PATCH /api/service-objects/:id` — 更新档案
- `POST /api/service-objects/:id/archive` — 归档
- `GET /api/service-objects/:id/insights` — 洞察详情
- `PUT /api/service-objects/:id/family-subscriptions` — 更新家属订阅
- `GET /api/service-objects/:id/service-plans` — 服务计划列表
- `POST /api/service-objects/:id/service-plans` — 新增计划
- `GET /api/service-plans/:id` — 单个计划详情
- `PATCH /api/service-plans/:id` — 更新计划
- `POST /api/service-plans/:id/archive` — 归档计划
- `POST /api/service-plans/:id/exceptions` — 新增计划例外
- `PATCH /api/service-plan-exceptions/:id` — 更新计划例外

### Fixture 更新

`deploy/site-operations-api-fixture.mjs` 中必须覆盖：

- 有活跃服务计划的服务对象（含 `primarySocialWorkerName`）
- 有暂停计划的服务对象
- 有活跃计划例外的服务对象（含 pause/time_change/worker_change/skip 四种）
- 有风险标签的服务对象（`riskTags` 非空）
- 有照护备注的服务对象（`careNotes` 非空）
- 有 AI 洞察摘要的服务对象（`insightSummaries` 含 info/warning severity）
- 有家属订阅的服务对象（daily/weekly/monthly/exception_only）
- 无家属订阅的服务对象
- 养护险和政府购买两种资格类型
- 已归档服务对象

## 11. 响应式

### 桌面端（>767px）

- 搜索框 + 三个下拉框 + 新增按钮横向排列在 toolbar 内。
- Table 列表占主工作区。
- Modal 居中弹出，固定高度 92vh，overlay 模式 + scrim。

### 手机端（≤767px）

- 搜索框独占一行，下拉框换行排列。
- Table 转换为卡片列表，每张卡片：
  - 第一行：avatar + 姓名 + 综合状态 badge
  - 第二行：地址（截断一行）
  - 第三行：资格 tag + 服务计划摘要（如"助餐·每周一三五"）
  - 第四行：家属订阅 + 风险标签数量
- 整卡点击打开底部 Modal。
- Modal 内容分 section 展示，使用底部 Modal 最大高度 86vh。
- 服务计划和例外保持分节结构，不使用横向表格。

## 12. 与业务流程的对应关系

| 业务流程 | 本 tab 承接 |
| --- | --- |
| 4.3 维护服务对象和家属档案 | 基础信息 + 家属联系人 + 订阅管理 |
| 4.6 接收并分诊服务需求 | "创建按次服务" → 生成排期 |
| 4.7 排班并派发上门任务 | 服务计划提供排班基础数据 |
| 4.8 SOP 驱动的上门服务 | 照护重点和注意事项作为服务前提示 |
| 4.12 家属查看服务报告 | 家属订阅状态管理 |
| 4.13 服务主管查看洞察 | AI 洞察 section |
| F05 后台自动规整服务记录 | 服务对象档案被自动更新 |
| F06 后台周期性生成洞察报告 | insightSummaries 展示 |
| F07 家属订阅和接收报告 | familyContacts + subscriptionStatus |

### 跨 tab 导航

- 查看 Modal 内"安排服务"在当前 Modal 内完成，新排期自动同步到 `服务排期` tab
- 服务计划的 `primarySocialWorkerName` 可点击 → 跳转到 `服务人员` tab
- 首页"优先关注事项"推荐动作 → 跳转到本 tab
- `服务排期` tab 的排期条目 → 可跳回本 tab 查看服务对象详情

## 13. 验收

- 服务对象列表展示姓名（带 avatar）、地址、资格类型、服务计划摘要、家属订阅和综合状态。
- 三个筛选下拉（资格、状态、风险）默认显示字段名，非默认值时 accent 色。
- 列表行不展示任何操作按钮。
- 查看 Modal 展示完整档案：基础信息、照护重点（风险标签 + 备注）、服务计划（含例外）、AI 洞察、家属联系人。
- 服务计划展示项目、频次、时间窗、半固定人员和状态。
- 计划例外展示四种类型（暂停/时间调整/人员替换/跳过）。
- AI 洞察展示 severity 左边框。
- 家属联系人展示关系、电话、订阅状态 badge、最近推送时间。
- `exception_only` 订阅类型正确展示。
- restricted 模式下家属电话脱敏。
- 新增/编辑 Modal 表单字段完整（姓名、年龄、性别、地址、资格、项目、频次、风险、备注）。
- "安排服务"使用 AI 自然语言输入，不跳转页面。
- 服务历史 tab 展示历史服务记录列表，每行有"查看记录"按钮，点击通过内联替换模式打开 RecordDrawer（替换当前 Modal，不叠加）。
- 手机端 Table 转换为卡片列表，Modal 从底部滑出。
- 数据类型对齐 API contract，无旧字段残留。
- Fixture 覆盖全部资格类型、状态组合和例外类型。
