# Lumii Fieldwork 全局 UI 规范

状态：全局视觉与 UI element 基线
日期：2026-05-15
适用范围：产品壳、视觉 token、通用 UI element、响应式和视觉验收规则

## 1. 文档边界

本文只定义视觉风格和通用 UI element，不定义角色、路由、业务工作区、数据实体、业务流程、API 或验收场景。

其他文档引用本文时，只引用视觉和组件规则：

- 产品和业务规格决定“展示什么、谁来操作、动作语义是什么”。
- 本文决定“这些内容如何以一致、克制、可扫描的 UI element 呈现”。
- 如果页面规格需要本文未定义的 UI element，先补充本文，再进入实现。

本文禁止承载：

- 具体角色列表。
- 具体页面路由。
- 业务对象职责。
- 后端交接契约。
- 单个业务页面的专属文案或数据字段。

## 2. 视觉原则

Fieldwork 是助手优先的工作台界面。视觉应服务高频操作、快速扫描和低干扰判断。

核心原则：

- 信息密度高但不拥挤。
- 层级靠布局、字号、色彩和留白建立，不靠堆叠阴影。
- 业务列表优先使用紧凑行、rich row 或表格，不把每一行做成重卡片。
- 操作按钮、状态标签、筛选 chip、指标值必须视觉语义分明。
- 详情和复杂操作进入 drawer、modal 或页面明确允许的 `Inline Detail Panel`，不塞进列表行。
- 每个屏幕最多一层强调面板；禁止阴影 panel 套阴影 panel。

反模式：

- 在一个带阴影的大 panel 内再放多个带阴影的小 panel。
- 批量操作 bar 做成漂浮卡片，再叠在另一个卡片上。
- 列表行右侧塞三到五个同级按钮。
- 状态标签和按钮使用同一种蓝色 pill 样式。
- 把详情页内容直接接在列表下方。
- 用巨大标题占据操作界面视觉中心。

## 3. 视觉 Token

### 3.1 颜色

#### 全局基色

| Token | 值 | 用途 |
| --- | --- | --- |
| `--page-bg` | `#F7F9FB` | 页面底色 |
| `--work-bg` | `#E8EEF9` | 工作区底色（壳 radial gradient 层） |
| `--surface` | `#FFFFFF` | 面板、表格容器、drawer |
| `--surface-subtle` | `#F9FAFB` | 表格表头、输入框底色、聊天气泡 |
| `--surface-sidebar` | `#FAFBFC` | 右侧信息面板底色 |
| `--line` | `#E5E7EB` | 分割线、边框（实色，非半透明） |
| `--line-subtle` | `#F3F4F6` | 轻分割线（表格行间、toolbar 底部） |
| `--text` | `#191C1E` | 主文本 |
| `--text-secondary` | `#374151` | 次级文本、表格行文字 |
| `--text-muted` | `#9CA3AF` | 时间、说明、禁用态、meta 标签 |
| `--accent` | `#0052CC` | 业务主动作、激活导航、链接 |
| `--accent-soft` | `rgba(0,82,204,0.08)` | 激活导航背景、轻强调 |
| `--ai-accent` | `#6366F1` | AI 助手强调色（发送按钮、事件行链接、聊天 focus） |
| `--ai-avatar-bg` | `linear-gradient(135deg, #6366F1, #818CF8)` | AI 头像渐变背景 |
| `--success-bg` | `#E0F4EC` | 成功状态背景 |
| `--success-text` | `#116B4C` | 成功状态文字 |
| `--warning-bg` | `#FFF1D6` | 预警状态背景 |
| `--warning-text` | `#976000` | 预警状态文字 |
| `--danger-bg` | `#FEE2E2` | 危险状态背景 |
| `--danger-text` | `#B42318` | 危险状态文字 |
| `--muted-bg` | `#F3F4F6` | 中性状态背景（已停用等） |
| `--muted-text` | `#6B7280` | 中性状态文字 |

#### 颜色使用原则

- 业务工作区（表格、表单、drawer）统一使用 `--accent`（蓝色）作为主动作色。
- 首页聊天区使用 `--ai-accent`（紫色）作为 AI 助手强调色，区分"AI 输出"和"业务操作"。
- 面板和容器使用实色白底 `#FFFFFF` + 实色边框 `#E5E7EB`，不使用半透明 `rgba` 背景。
- 右侧信息面板使用 `#FAFBFC` 微灰底色，与主内容区有微弱色差但不突兀。

### 3.2 字号

| Element | 字号 | 字重 | 说明 |
| --- | --- | --- | --- |
| App title | 15-17px | 700 | 产品壳标题 |
| Page title | 20-24px | 720-760 | 当前主区域标题 |
| Panel title | 13-15px | 680-720 | 面板标题，不做 hero |
| Section label | 11-12px | 650-700 | 小节标签、表头 |
| Body | 13-14px | 400-520 | 正文和列表内容 |
| Meta | 11-12px | 400-520 | 时间、说明、弱信息 |
| KPI value | 20-24px | 720-780 | 指标数字 |
| Button | 12-13px | 600-700 | 按钮文字 |

标题规则：

- 工作台内部不用 hero title。
- 右侧面板标题使用 panel title，不得大于 page title。
- KPI 数字可以成为视觉重点，但 KPI label 必须弱化。

字体实现规则：

- 全局 `button` / `input` reset 只能继承 font family 和 letter spacing，不得使用高优先级 `font: inherit` 覆盖组件级字号、字重和行高。
- 所有带文字的 button 必须显式落在 `Button` 字号范围内；icon-only button 不显示文字。
- 组件选择器必须能覆盖 reset；如果 button 有专属字号或字重，定义必须落在 button class 或其 label slot 上。

### 3.3 圆角、间距、阴影

| Token | 值 | 用途 |
| --- | --- | --- |
| `--radius-lg` | `12px` | 主容器（表格容器、聊天容器） |
| `--radius-md` | `10px` | 按钮、输入框、事件行、气泡 |
| `--radius-sm` | `8px` | 小按钮、状态标签、KPI 卡 |
| `--radius-pill` | `22px` | 聊天输入框（pill 形状） |
| `--radius-circle` | `50%` | 发送按钮（圆形） |
| `--radius-chat` | `2px 14px 14px 14px` | AI 聊天气泡（左上锐角，其余圆角） |
| `--space-xs` | `4px` | 图标文字间距 |
| `--space-sm` | `8px` | 紧凑元素间距 |
| `--space-md` | `12px` | 行内和卡片间距 |
| `--space-lg` | `16-20px` | 面板内边距、section 间距 |
| `--space-page` | `24px` | 页面 padding |
| `--shadow-raised` | `0 4px 12px rgba(0,0,0,0.06)` | hover 浮起效果（轻量） |
| `--shadow-drawer` | `-12px 0 40px rgba(0,0,0,0.1)` | 桌面端 drawer 阴影 |
| `--shadow-drawer-mobile` | `0 -16px 40px rgba(0,0,0,0.12)` | 手机端底部 drawer 阴影 |

阴影规则：

- 主工作区内的表格、表格行、toolbar 默认不使用阴影，只使用 `--line` 边框。
- hover 状态可使用 `--shadow-raised` 轻量浮起，但不改变布局尺寸。
- Drawer、modal 使用对应 shadow token。
- 禁止阴影嵌套（shadow 内再放 shadow）。

## 4. 产品壳 Elements

### 4.1 App Shell

固定全屏应用壳。桌面端由顶部助手头部、左侧图标导航、主工作区和可选右侧信息面板组成。手机端由顶部助手头部、主工作区和底部导航组成。

规则：

- 页面本体不滚动，滚动发生在主工作区内部。
- 主工作区背景使用 `--work-bg`。
- 右侧信息面板只用于首页或聊天首页。
- 业务工作区不使用营销页 hero，不使用说明型落地页布局。

### 4.2 Assistant Header

- 高度 64-68px。
- 左侧 36-40px 产品标识。
- 标题一行，副标题一行。
- 副标题状态点为 6-7px 圆点。
- Header 是产品身份区，不承载业务筛选和批量操作。

### 4.3 Icon Navigation

- 桌面宽度 56px。
- 图标按钮 40x40。
- 激活态：`--accent-soft` 背景 + `--accent` 图标。
- 未激活态：`--text-muted` 图标。
- 桌面端不显示长文字；语义由 tooltip、aria-label 或相邻标题补足。

### 4.4 Mobile Bottom Navigation

- 固定在底部。
- 使用图标 + 9-11px 短标签。
- 点击目标高度不小于 44px。
- 与指令输入区保持独立分层，不能互相遮挡。

### 4.5 Command Input

- 固定在聊天区域底部（不跨越右侧信息面板）。
- 输入框高度 44px，圆角使用 `--radius-pill`（22px）pill 形状。
- 发送按钮 40px 圆形（`border-radius: 50%`），使用 icon-only。
- 发送按钮使用 `--ai-accent` 实底色（紫色），hover 加深。
- 输入框使用 `--surface` 白底 + `--line` 边框，focus 时边框变为 `--ai-accent` + 浅紫 box-shadow。
- 上方使用 `--line-subtle` 分割线与聊天内容分隔。

## 5. Surface 与 Panel

### 5.1 Surface 层级

| Surface | 用途 | 样式 |
| --- | --- | --- |
| Base work area | 主工作区背景 | 壳层渐变底色 |
| Table container | 表格/列表容器 | `--surface` 白底 + `--line` 边框 + `--radius-lg` 圆角，无阴影 |
| Chat area | 聊天消息区 | 无容器边框，消息直接浮在工作区上 |
| Right sidebar | 右侧信息面板 | `--surface-sidebar` 底色 + 左侧 `--line` 分割 |
| Floating layer | drawer / modal | `--surface` 白底 + 边框 + drawer shadow |

规则：

- 业务工作区（服务人员、设备等）的表格使用 table container，内含 toolbar + 表头 + 数据行。
- 首页聊天区不使用外层白色容器，消息气泡直接浮在工作区底色上。
- Panel 内不能再放 raised card 形成阴影叠加。
- Table container 内的 toolbar、表头、数据行都是 flat element，只使用 `--line-subtle` 分割。

### 5.2 Right Insight Panel

右侧信息面板是首页高亮信息容器。

桌面端宽度 320px，背景 `--surface-sidebar`（`#FAFBFC`），左侧使用 `#ECEEF2` 分割线。

面板支持收缩/展开，收缩按钮放在面板 header 行右侧（28px icon button），不单独占一行。

允许 element：

- Compact KPI group（2 列网格，白底 + `#ECEEF2` 边框）。
- Risk / attention item（白底 + severity 左边框）。
- Action entry list（白底 + `#ECEEF2` 边框）。
- Activity list（时间线式，无边框）。

section 标题使用 10-11px uppercase + 图标，颜色 `--text-muted`。

规则：

- 面板标题 14px/700，不大于 page title。
- KPI value 使用 18-20px/700，label 使用 10-11px uppercase muted。
- 处理入口使用 action list row，不堆大按钮。
- 手机端进入底部 `Right Insight Drawer`，由主区域内的 breadcrumb opener 打开。
- 手机端 sidebar 收缩按钮隐藏，只显示 breadcrumb opener。

#### Compact KPI group

Compact KPI group 用于右侧信息面板、状态摘要和小面积运营概览。它不是 raised card 网格。

结构：

```text
label
value
optional short context
```

规则：

- 每个 KPI item 使用 flat row 或 flat grid cell，只使用 `--line` 分割线或浅底，不使用阴影。
- value 使用 18-22px / 720-780；label 使用 11-12px muted。
- KPI group 超过 4 项时必须使用 compact list 或 2 列紧凑网格，不使用一排大卡片。
- 文本型动态、最近活动和处理入口不得放入 KPI value。

#### Risk / attention item

Risk / attention item 用于呈现一到三条需要运营关注的风险或提醒。

结构：

```text
severity marker
title
supporting text
optional meta
```

规则：

- severity marker 可以是左边框、短 label 或 icon，不使用 primary button 样式。
- title 使用 13px / 650-720；supporting text 使用 12px muted。
- 每条 item 高度随内容自适应，但长文必须限制为两行或进入详情。
- 不在 attention item 内放多个操作按钮；需要处理时使用独立 action entry list。

#### Action entry list

Action entry list 用于右侧面板、drawer 或结构化结果卡里的轻量跳转入口。

结构：

```text
action label
optional target/meta
trailing disclosure icon
```

规则：

- 每个 action entry 是 compact row，最小高度 44px，推荐 48-52px。
- 背景使用透明或 `--surface`，边框使用 `--line`；不使用 primary button 实底色。
- action label 使用 13px / 600-700；meta 使用 11-12px muted。
- trailing disclosure icon 固定 14-16px，只表示进入目标，不承担状态表达。
- 同一行只保留一个可点击入口；多个业务动作进入 drawer。

#### Activity list

Activity list 用于最近动态和弱时间线。

结构：

```text
time or source
activity title
optional short meta
```

规则：

- 时间/source 使用 11-12px muted。
- title 使用 12-13px body，不作为 KPI value。
- 活动列表默认不可编辑；进入详情时使用单个 disclosure 或 action entry。

## 6. Controls

### 6.1 Button

| Type | 用途 | 样式 |
| --- | --- | --- |
| Primary button | 页面主动作 | `--accent` 实底色，白字，36px 高，`--radius-sm` 圆角，hover 加深 |
| Secondary button | 次动作 | `#F3F4F6` 底 + `--line` 边框，`--text-secondary` 字色 |
| Danger ghost | 破坏性弱化动作 | 透明底 + `#FCA5A5` 边框，`--danger-text` 字色 |
| Danger solid | 确认破坏性动作 | `--danger-bg` 底 + `--danger-text` 边框 |
| Icon button | 工具按钮 | 28-36px，透明底，hover 时 `--surface-subtle` 底色 |
| AI send button | 聊天发送 | 40px 圆形，`--ai-accent` 实底，白色 Send icon |

按钮内可带 icon（14-15px），icon + 文字间距 6px。

规则：

- 所有 button 的默认 reset 只能继承字体家族和 letter spacing，不得用高优先级 shorthand 覆盖具体 button element 的字号、字重和行高。
- Button 文本必须落在 12-13px / 600-700，除非该 button 是 icon-only。
- 同一个 toolbar 最多一个 primary button。
- 列表行内最多一个显性动作，通常是“查看”或 disclosure。
- 编辑、归档、绑定、导出等 detail actions 放在 drawer 或页面明确允许的 `Inline Detail Panel`。
- 禁用按钮必须有可见原因，通常由旁边说明或 disabled reason 提供。

### 6.2 Filter Chip

- 用于筛选，不用于状态展示。
- 高度 28-32px。
- 背景使用 muted 或透明底。
- 激活态可以使用 `--accent-soft`，但不能像 primary button。

### 6.3 Status Badge

- 用于实体状态，不可点击。
- 使用语义色：success（`--success-bg/text`）/ warning（`--warning-bg/text`）/ muted（`--muted-bg/text`）。
- 圆角 6px（非 pill），12px/600 文字，padding 5px 10px。
- 状态文字必须使用中文映射（如 `active` → "在职"、`incomplete_profile` → "待补全"），不直接显示英文枚举值。
- 不使用蓝色主动作样式。

### 6.4 Segmented Control

- 用于互斥视图切换。
- 外层浅 muted 背景，选中项白底或 `--surface-strong`。
- 不能用于普通状态标签。

### 6.5 Search 和 Input

- 搜索框高度 36px，`--radius-sm` 圆角。
- 左侧 Search icon 16px `--text-muted` 色。
- 背景 `--surface-subtle`，边框 `--line`。
- focus 时边框 `--accent` + 浅蓝 box-shadow。
- Placeholder 使用 `#9CA3AF`。
- 表单输入框高度 40px，focus 时同样边框变色 + box-shadow。

## 7. Data Display Elements

### 7.1 KPI Card

用于少量指标扫描。

结构：

```text
value
label
optional delta / context
```

规则：

- KPI card 可以是独立卡，也可以在 flat panel 内作为无阴影格子。
- KPI value 是视觉重点，label 弱化。
- 文本型动态不放在 KPI value 中。
- 同一区域 KPI 数量超过 4 个时，优先改为 compact KPI list。

### 7.2 Rich Row

Rich row 是业务列表的默认 element，用于比普通表格更强的信息层级。

标准结构：

```text
leading icon / avatar
primary title
secondary metadata
status badge
metric / signal
trailing disclosure or one action
```

槽位语义：

| Slot | 必须承载 | 不得承载 |
| --- | --- | --- |
| leading icon / avatar | 实体类型、头像、首字母或图标 | 状态、动作按钮 |
| primary title | 该实体最重要的识别信息 | 多个并列字段、说明文案 |
| secondary metadata | 帮助判断的次要事实，最多两行 | 长说明、完整详情、表单字段 |
| status badge | 当前状态或风险等级 | 筛选、主动作、可点击按钮 |
| metric / signal | 一个短指标或反馈信号 | 多个 KPI 组、复杂趋势图 |
| trailing disclosure/action | 一个进入详情或单个上下文动作 | 编辑/归档/绑定/导出等多个 detail actions |

规则：

- 标准 rich row 最小高度 56px，推荐 56-72px；手机端可自适应增高，但不能把完整详情塞进行内。
- row 内 gap 使用 8-12px，左右 padding 不低于 12px。
- trailing disclosure/action 固定在行尾或移动端最后一行，使用 action entry 或 icon/text button，不使用 primary button。
- primary title 是行内视觉重点。
- secondary metadata 使用 muted 小字。
- status badge 使用语义色。
- metric 可以是数字、趋势或短标签。
- trailing 区域最多一个显性按钮；更多动作进入 drawer。
- 行本身可以点击打开详情 drawer。
- 行之间用分割线或浅底色区分，不使用每行阴影卡片。
- 页面规格必须为每种 rich row 明确每个 slot 对应的业务字段；未定义 slot 的列表不得进入实现。

### 7.3 Table

Table 用于需要横向比较、排序或批量选择的高密度数据。

结构：

```text
table container (white, --line border, --radius-lg)
  toolbar (search + filters + primary action)
  column header (sticky, --surface-subtle bg, uppercase 12px/600)
  data rows
  pagination or count
```

样式规范（已实现参考：服务人员页面）：

- Table container：白底 + `--line` 边框 + `--radius-lg` 圆角，`flex: 1` 充满工作区。
- Toolbar：容器顶部，搜索框 + 筛选下拉 + 新增按钮横排，底部 `--line-subtle` 分割。
- Column header：`--surface-subtle` 底色，12px uppercase 600，sticky，`--line` 底部分割。
- Data row：60px 行高，`--line-subtle` 底部分割线，hover 时 `--surface-subtle` 底色。
- Selected row：`rgba(0,82,204,0.04)` 底色 + 左侧 3px `--accent` 蓝色边条。
- 姓名列带 avatar（36px 圆角方形，per-name 彩色底 + 首字母）。
- 资质使用 tag 样式（`#F3F4F6` 底 + 4px 圆角 + 12px 文字）。
- 状态使用 status badge（6px 圆角，非 999px pill）。
- 表扬/指标列使用 icon + 数字（如 ThumbsUp + "42"）。

筛选下拉规范：

- 默认显示字段名（如"全部状态""工牌绑定"），让用户不展开也知道是什么筛选。
- 选中非默认值时文字变为 `--accent` 色 + 加粗。
- 使用 `--surface-subtle` 底色 + `--line` 边框 + `--radius-sm` 圆角。

手机端：

- 表格隐藏，转为 card list（白底 + `--line` 边框 + `--radius-lg` 圆角）。
- 每张卡片带 avatar + 姓名 + 电话 + 状态 badge + meta 行。
- 整卡可点击，打开底部 drawer。

### 7.4 Batch Action Bar

批量操作 bar 是 table/list 的工具条，不是悬浮卡片。

规则：

- 放在 table/list surface 内部顶部，或作为 flat toolbar 紧贴列表。
- 背景使用浅 muted 或透明底。
- 不使用阴影。
- 不放在另一个 raised panel 上形成层叠。
- 左侧显示选择数量，右侧显示批量动作。
- 只展示当前上下文可用的批量动作。

### 7.5 Empty / Loading / Error

- Empty state 说明当前没有数据，并给出可继续处理的入口。
- Loading state 不使用大面积空白；优先使用 skeleton 或小型状态行。
- Error state 说明失败原因和可恢复动作。
- Permission / unavailable state 必须说明限制原因。

## 8. Detail Elements

### 8.1 Drawer

Drawer 用于展示列表选中项详情和 detail actions。

桌面端：

- 从右侧进入，宽度 420px。
- 白底 + `--line` 左边框 + `--shadow-drawer` 阴影。
- 不挤压主列表（overlay 模式 + scrim）。

手机端：

- 底部 drawer，`--radius-lg` 上圆角，最大高度 86vh。
- `--shadow-drawer-mobile` 阴影。

Drawer 内容结构（已实现参考：服务人员详情 drawer）：

```text
header: [avatar-lg 48px] + name + status-inline + close-btn
actions: [编辑档案] [更新工牌] [归档(danger-ghost)]
body (scrollable):
  section "基础信息": dt/dd 字段列表 (80px label col)
  section "常用工牌": dt/dd 或 "未绑定" muted
  section "正向反馈": award-icon + count + praise-quote
```

样式规范：

- Header：`--line-subtle` 底部分割，avatar 使用 per-name 彩色底 + 首字母 48px。
- Action buttons 带 icon（Edit3、Shield 等），使用 `--secondary` 样式，danger 使用 ghost 样式。
- Section h4：11px uppercase 700 + `#6B7280` + `--line-subtle` 底部分割。
- Fields dt：12px/500 `--text-muted`，dd：13px `--text-secondary`。
- Praise quote：`#FFFBEB` 底色 + 3px `#F59E0B` 左边框 + 13px `#92400E` 文字。
- Close button：28-32px icon button，hover 时 `--surface-subtle` 底色。

规则：

- 列表行不展示 drawer 内的任何操作按钮。
- Drawer 关闭后列表布局不跳动。

### 8.2 Inline Detail Panel

Inline detail panel 只在页面规格明确允许时使用。

规则：

- 只能用于常驻 split-view，不用于把详情直接接在列表后方。
- 必须和列表并列或处于稳定详情区域。
- 不作为移动端默认方案。

## 9. Chat Elements

### 9.1 Message Layout

每条消息使用 avatar + content 横向布局：

```text
[AI Avatar 32px]  [bubble / event-row / metric-cards / highlight-card]
                  [timestamp]
```

规则：

- AI Avatar：32px 圆角方形（`--radius-md`），使用 `--ai-avatar-bg` 紫色渐变，内放 Bot 图标 16px 白色。
- 每条消息都带 avatar，即使连续多条 AI 消息也不合并。
- 消息组整体 `max-width: 720px`，不铺满全宽。
- 消息间距 6px（紧凑对话感）。

### 9.2 Message Bubble

- 背景使用 `--surface-subtle`（`#F8F9FB`）。
- 圆角使用 `--radius-chat`（左上 2px，其余 14px），表达"来自 AI"的方向感。
- 正文 14px，行高 1.65。
- 正文内 `<strong>` 使用 `--accent` 蓝色加粗，突出数字。
- 正文内 `<span>` 使用 `#6B7280` 次级说明。
- 时间戳 11px `#B0B8C4`，放在 bubble 下方。

### 9.3 Structured Result Card

- 用于助手返回的结构化结果（排期概况、风险提醒等）。
- 背景使用 `--surface-subtle`。
- 左侧 3px `--ai-accent` 紫色边框，表达"AI 生成内容"。
- 圆角使用 `--radius-chat`。
- 标题 14px/600，描述 13px muted。
- 卡片内可嵌套 Interactive Event Row。

### 9.4 Quick Inquiry

Quick Inquiry 用于助手在聊天/事件流中给出的后续追问入口。

结构：

```text
question text (13px/600)
hint (11px muted)
```

样式：

- 白底 + `--line` 边框，圆角 `--radius-md`。
- 桌面端 2 列网格，手机端单列。
- hover 时边框变为 `#C7D2FE`（浅紫），box-shadow 使用浅紫色。
- 最小高度 48px，padding 10px 12px。
- 点击后把问题填入 `Command Input`。
- 作为消息流中的一条消息出现，带 AI avatar。

### 9.5 Interactive Event Row

Interactive Event Row 用于聊天/事件流中的结构化导航入口。

结构：

```text
[event title + supporting text]  [target label + chevron]
```

样式：

- 背景 `--surface-subtle`，圆角 `--radius-chat`。
- 无边框，hover 时背景加深为 `#EEF0F4`。
- event title 13px/600，supporting text 12px muted。
- target label 使用 `--ai-accent`（紫色）13px/600 + ChevronRight 15px。
- 最小高度 44px。
- 作为消息流中的一条消息，带 AI avatar。

规则：

- 整行可点击，点击后切换到对应工作区。
- 同一行只保留一个目标入口。
- target label 必须说明目标工作区名（”设备””服务排期”等）。

### 9.5 Right Insight Drawer

Right Insight Drawer 是 `Right Insight Panel` 在手机端的表现。

结构：

```text
breadcrumb opener: 首页 / 今日概览
bottom drawer: header + KPI group + attention list + action entry list + activity list
```

规则：

- opener 放在主事件流顶部或 KPI 区附近，目标高度不小于 44px。
- opener 文案使用 breadcrumb 形态，包含当前位置和可打开的面板名。
- drawer 从底部打开，最大高度不超过视口 86%，内容区内部滚动。
- drawer 打开时不得遮挡 `Command Input` 和 `Mobile Bottom Navigation` 的可见层级；关闭后主事件流布局不跳动。

## 10. Responsive Rules

### 10.1 Desktop

- 主导航使用左侧 56px icon rail。
- 主工作区应在首屏内形成稳定布局。
- 右侧信息面板只用于首页或聊天首页。
- 详情使用右侧 drawer。

### 10.2 Mobile

- 主导航使用底部导航。
- 主工作区单列。
- 右侧信息面板内容进入主区域 compact module 或底部 drawer。
- Table 转换为 rich row。
- Drawer 使用底部 drawer。
- 所有文本必须在容器内换行或截断，不允许溢出遮挡。

## 11. Accessibility 和 Fit

- 所有 icon-only button 必须有 `aria-label` 或 tooltip。
- 状态不能只依赖颜色，必须有文字。
- 点击目标不小于 32px；移动端主要点击目标不小于 44px。
- 任何动态内容不能导致 toolbar、row、button 尺寸跳动。
- 长文本必须限制行数或进入详情区域。
- 数字、状态、动作的视觉层级必须在截图中可辨认。
- disclosure icon 不得替代可访问名称；可点击 row 或 button 必须有可读 label。
- 实现验收必须检查 computed style，尤其是 button 字号、字重、点击目标和 row 高度，避免全局 reset 覆盖具体 element 规则。

## 12. 视觉验收清单

实现和截图评审时逐项检查：

- 是否只使用本文定义的 UI element。
- 是否存在阴影 panel 套阴影 panel。
- 是否存在列表行内堆多个同级 detail action。
- 状态 badge 和 button 是否视觉分离。
- 表格是否只在需要比较时使用。
- Rich row 是否有清晰主标题、元信息、状态、指标和单一入口。
- Drawer 是否承载详情和复杂动作。
- 手机端是否将 table、右侧面板和 drawer 转换为对应移动形态。
- 页面是否没有巨大 hero 标题和营销式布局。
- 文本是否在所有断点下不溢出、不遮挡。
