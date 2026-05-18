# 服务人员 Tab Design

状态：设计规格
日期：2026-05-15
工作区 id：`social_workers`
页面标题：`服务人员`

## 1. 目的和边界

本 tab 管理站点服务人员目录、可选常用工牌关系和正向反馈信号。

服务人员可以使用站点任一可用工牌；后端根据语音内容和运营上下文推断使用者、服务对象和服务项目。服务人员也可以有一个常用工牌，作为运营便利和默认关联。

本 tab 负责：

- 新增和维护服务人员目录。
- 展示联系方式、人员类型/资质、常用工牌摘要。
- 展示表扬数量或最近正向反馈信号。
- 维护服务人员档案和常用智能工牌关系。

边界：

- 智能工牌激活、停用、丢失、同步健康等生命周期动作，这些属于 `设备`。
- 排期工作量和分配状态，这些属于 `服务排期`。
- 已完成服务事实和记录复核，这些属于 `服务记录`。

## 2. 用户要回答的问题

- 站点有哪些服务人员？
- 某个服务人员联系方式和资质是什么？
- 这个服务人员是否有常用工牌？
- 哪些服务人员资料缺失或已停用？
- 哪些服务人员收到过正向反馈？

## 3. 主界面布局

主要 UI：

- 服务人员列表：`Table`
- 按姓名或电话搜索：`Search and Input`
- 状态和工牌绑定筛选：两个下拉框
- 服务人员详情/编辑/创建：Detail Modal
- 页头新增按钮：primary action

页头包含：

- page title：`服务人员`
- 简短说明：管理站点人员目录、联系方式和常用工牌关系
- 工具栏：搜索框 + 人员状态下拉框 + 工牌绑定下拉框 + 新增服务人员按钮

工具栏布局：

```text
[🔍搜索姓名或电话] [人员状态 ▾] [工牌绑定 ▾]  [+新增服务人员]
```

## 4. 筛选与搜索

### 搜索

按姓名或电话模糊搜索，本地过滤。搜索框在页头工具栏。

### 人员状态下拉框

| 选项 | 过滤逻辑 |
| --- | --- |
| 全部状态 | 不过滤（默认） |
| 在职 | `status === "active"` |
| 已停用 | `status === "disabled"` |
| 资料待补全 | `status === "incomplete_profile"` |

### 工牌绑定下拉框

| 选项 | 过滤逻辑 |
| --- | --- |
| 全部 | 不过滤（默认） |
| 已绑定工牌 | `preferredBadge !== undefined` |
| 未绑定工牌 | `preferredBadge === undefined` |

筛选规则：

- 两个下拉框可组合使用，例如"在职 + 未绑定工牌"。
- 搜索和下拉可叠加。
- 下拉框样式：高度 34-36px，`--surface` 背景 + `--line` 边框，和搜索框视觉一致。
- 选中非默认值时下拉框文字用 `--accent` 色，提示当前有筛选生效。

## 5. Table 列定义

服务人员列表使用 `Table`，具体 UI 规则引用 `global-ui-guidance.md`。

列布局：`grid-template-columns: 1.1fr 0.9fr 0.9fr 1fr 0.6fr 0.7fr`

| 列 | 内容 | 样式 |
| --- | --- | --- |
| 姓名 | 左侧 name-based 色彩 avatar（首字 + hash 取色 6 色轮转） + `name`，下方小字"服务人员" | primary title 14px/700 + meta 12px muted。姓名可点击打开 Modal，使用 `--accent` 色 + hover underline |
| 联系方式 | Phone 图标 + `phone` | body 13px，图标 14px muted |
| 资质 | `qualificationLabels` 以 tag（`sw-tag`）样式逐个展示，无资质显示 `—` muted | tag 样式，每个 label 一个 tag |
| 常用工牌 | `preferredBadge.deviceCode` + 工牌状态 Status Badge；无绑定显示 `未绑定` muted | deviceCode 13px + status badge 语义色 |
| 表扬 | ThumbsUp 图标 + `praiseSummary.praiseCount` | body 13px，图标 14px praise 色 |
| 状态 | `status` Status Badge | active=success, disabled=muted, incomplete_profile=warning |

表头 12px muted，行高 56-64px，行间用 `--site-line` 分割线。

### 行交互

| 平台 | 交互 | 行为 |
| --- | --- | --- |
| 桌面 | 单击行 | 选中行（`--accent-soft` 高亮），同时只能选中一行 |
| 桌面 | 点击姓名 | 打开 Modal |
| 桌面 | 双击行 | 打开 Modal |
| 手机 | 单击整行 | 直接打开底部 Modal |

禁止：

- 列表行展示编辑、归档、绑定工牌、查看完整档案等操作按钮。
- 状态 badge 使用 primary button 视觉。
- 把服务人员完整档案直接展开在列表下方。

## 6. Modal 信息架构

Modal 有三种模式：查看、编辑、创建。所有模式使用居中全屏 Modal（CSS class `so-modal`），高度固定 92vh，不随内容动态调整。

### 通用 Modal 结构

```text
┌──────────────────────────────────────────────┐
│ 摘要卡 (so-modal__summary)                    │
│   avatar + 姓名 + 角色/状态 + 关闭按钮        │
├──────────────────────────────────────────────┤
│ Tab 导航 (so-modal__tabs)                     │
│   [档案概览] [好评记录]                        │
├──────────────────────────────────────────────┤
│ 内容区 (so-modal__content, scrollable)        │
│   3 列概览网格 / tab 内容                      │
├──────────────────────────────────────────────┤
│ 底部操作栏 (so-modal__footer)                  │
│   左: [归档人员]  右: [更新常用工牌]            │
└──────────────────────────────────────────────┘
```

### 查看模式（`so-modal--view`）

点击姓名或双击行（手机单击行）打开。

**摘要卡**：avatar（per-name 彩色底 + 首字母）+ 姓名 + `服务人员 · 状态` 副标题 + 关闭按钮。padding 14px，标题 17px。

**Tab 导航**：2 个 tab — `档案概览`、`好评记录`。

**Tab 1：档案概览**

3 列概览网格（`so-modal__overview`，`grid-template-columns: 1fr 1fr 1fr`），字段间用右边框分隔：

| 行 | 列 1 | 列 2 | 列 3 |
| --- | --- | --- | --- |
| 行 1 | 姓名 `name` | 电话 `phone` | 状态 `status`（Status Badge） |
| 行 2 | 资质 `qualificationLabels`（full-width，逗号分隔 tag） | — | — |

常用工牌区（3 列子网格）：

| 列 1 | 列 2 | 列 3 |
| --- | --- | --- |
| 设备编号 `preferredBadge.deviceCode` | 状态 `preferredBadge.status`（tone badge） | 最近同步 `preferredBadge.lastSyncAt` |

无绑定时显示"未绑定常用工牌"muted。

内嵌工牌选择器：点击"更新常用工牌"后在概览 tab 内展开蓝色背景面板（`#F0F5FF`），显示可选工牌列表（FW-021、FW-026 等），选择后更新绑定。

**Tab 2：好评记录**

- `praiseSummary.praiseCount` 统计
- 最近反馈摘要 `latestPraiseExcerpt` + 时间 `latestPraiseAt`

**底部操作栏**：

- 左侧：[归档人员]（danger ghost，点击弹确认）
- 右侧：[更新常用工牌]（secondary）

### 编辑模式（`so-modal--form`）

点击查看模式中的"编辑档案"切换。使用 `so-form-cards` 布局。

摘要卡标题改为"编辑服务人员"。

表单区：

- 姓名输入框
- 电话输入框
- 资质标签编辑
- 状态下拉选择

底部操作栏：[取消]（secondary）[保存]（primary）。

保存成功后回到查看模式并刷新数据。取消回到查看模式不保存。

### 创建模式（`so-modal--form`）

点击页头"新增服务人员"打开。

摘要卡标题改为"新增服务人员"。

表单区：

- 姓名输入框（必填）
- 电话输入框（必填）
- 资质标签编辑（可选）
- 常用工牌选择下拉（可选）

底部操作栏：[取消]（secondary）[创建]（primary）。

创建成功后关闭 Modal 并刷新列表。

### Modal 样式

- 居中弹出，固定高度 92vh，宽度自适应（桌面端约 680px）。
- `--surface` 白底 + `--radius-lg` 圆角 + scrim overlay。
- 手机端全屏，底部圆角。
- 关闭后列表布局不跳动。

## 7. 动作归属

| 动作 | 归属 |
| --- | --- |
| 新增服务人员 | 页头 primary button，打开创建 Modal |
| 编辑服务人员联系方式或档案 | Modal 查看模式 → 编辑模式 |
| 从站点目录归档服务人员 | Modal 查看模式 danger action + 确认 |
| 绑定或更新常用智能工牌 | Modal 查看模式 secondary action |
| 查看服务人员档案 | 点击姓名 / 双击行 / 手机单击行 |

动作实现约束：

- 列表行不展示任何操作按钮。
- `编辑`、`归档`、`绑定工牌` 不出现在列表行中。
- 不做批量操作。

## 8. 状态

- `empty_workers`：站点还没有服务人员，显示"暂无服务人员，点击新增创建第一条记录"并提供新增入口。
- `active`：正常在站点目录中。
- `disabled`：已停用或归档，不可用于新分配。
- `incomplete_profile`：资料待补全。
- 筛选/搜索无结果：显示"没有匹配的服务人员"。
- 加载中：skeleton 或"服务人员数据加载中"。
- 加载失败：错误信息 + 重试。

## 9. 数据契约

本 tab 的数据类型对齐 API contract [`../../../api-contract/site-operations/02-service-personnel-api.md`](../../../api-contract/site-operations/02-service-personnel-api.md)。

### 核心类型

```ts
type SocialWorker = {
  id: string;
  userId: string;
  name: string;
  phone: string;
  siteId: string;
  workerType: "service_personnel";
  qualificationLabels: string[];
  status: "active" | "disabled" | "incomplete_profile";
  preferredBadge?: BadgeBindingSummary;
  praiseSummary: WorkerPraiseSummary;
};

type BadgeBindingSummary = {
  badgeId: string;
  deviceCode: string;
  status: SmartBadgeStatus;
  lastSyncAt?: string;
};

type WorkerPraiseSummary = {
  praiseCount: number;
  latestPraiseAt?: string;
  latestPraiseExcerpt?: string;
};
```

### 需要从当前类型中删除的字段

- `boundBadgeId` → 被 `preferredBadge.badgeId` 替代
- `boundBadgeStatus` / `lastBadgeSyncAt` → 被 `preferredBadge` 替代
- `skills` → 重命名为 `qualificationLabels`
- `praiseCount` → 被 `praiseSummary.praiseCount` 替代
- `todayScheduledCount` → 删除，排期工作量属于服务排期 tab
- `status` 枚举收窄为 `"active" | "disabled" | "incomplete_profile"`

### API Endpoints

- `GET /api/social-workers`
- `POST /api/social-workers`
- `GET /api/social-workers/:id`
- `PATCH /api/social-workers/:id`
- `POST /api/social-workers/:id/archive`
- `PUT /api/social-workers/:id/badge-binding`

### Fixture 更新

`deploy/site-operations-api-fixture.mjs` 中的 `socialWorkers` 数组同步改为 API contract shape，覆盖：

- 有 `preferredBadge` 的在职人员
- 无 `preferredBadge` 的在职人员
- `disabled` 状态人员
- `incomplete_profile` 状态人员
- 有 `praiseSummary.latestPraiseExcerpt` 的人员

## 10. 响应式

### 桌面端（>767px）

- 搜索框 + 两个下拉框 + 新增按钮横向排列。
- Table 列表占主工作区。
- Modal 居中弹出，固定高度 92vh，overlay 模式 + scrim。

### 手机端（≤767px）

- 搜索框独占一行，下拉框和新增按钮换行排列。
- Table 转换为 rich row card list，不使用阴影卡片。
- 卡片内信息排列：
  - 第一行：色彩 avatar + 姓名（primary title）+ 电话 + 状态（status badge）
  - 第二行（meta 行）：资质（顿号分隔或"无资质"）+ 常用工牌设备码（或"未绑定工牌"）+ 表扬次数 + "次表扬"
- 整卡点击打开底部 Modal。
- 底部 Modal 最大高度 86vh，内部滚动。
- Modal 不遮挡底部导航。

## 11. 验收

- 列表使用 Table 展示姓名、联系方式、资质、常用工牌、表扬、状态。
- 列表行不展示任何操作按钮。
- 桌面端单击行选中高亮，点击姓名或双击行打开 Modal。
- 手机端单击整行打开 Modal。
- Modal 查看模式展示基础信息、常用工牌、正向反馈，操作按钮固定在顶部。
- Modal 编辑模式提供表单编辑，保存后回到查看模式。
- Modal 创建模式提供新增表单，创建后关闭刷新列表。
- 归档操作需确认对话框。
- 两个下拉框筛选可组合使用，和搜索可叠加。
- 选中非默认筛选值时下拉框文字变为 `--accent` 色。
- 手机端 Table 转换为 rich row card list。
- 数据类型对齐 API contract，无旧字段残留。
- Fixture 覆盖全部状态组合。
