# 设备 Tab Design

状态：设计规格
日期：2026-05-15
工作区 id：`smart_badges`
页面标题：`设备`

## 1. 目的和边界

本 tab 管理站点智能工牌的完整生命周期：激活、监控、维护和停用。

智能工牌是核心录音设备，服务人员按下按钮开始/结束录音，录音上传后台后自动生成服务记录。工牌支持站点共享使用——任何服务人员都可以使用站点内的任意可用工牌；后端根据语音内容和运营上下文推断使用者、服务对象和服务项目。低置信度推断在 `服务记录` 中体现为 `reviewStatus: "needs_review"`。

运营可以为工牌设置常用服务人员（`preferredWorker`），作为推断的默认关联和运营便利，但不限制其他服务人员使用该工牌。

### 本 tab 负责

- 智能工牌激活（扫码或输入设备码，绑定站点）。
- 工牌库存总览、筛选和搜索。
- 工牌生命周期状态管理（待激活 → 可用 → 使用中 → 离线/丢失/停用）。
- 电量、同步健康、最近录音时间的实时监控。
- 常用服务人员关系维护。
- 最近服务记录链接（可跳转到服务记录 tab）。

### 边界

- 服务人员档案维护 → `服务人员` tab。
- 服务记录复核、音频播放、转写查看和导出 → `服务记录` tab。
- 工牌固件升级、硬件维修 → 不在 Fieldwork 范围内。

## 2. 用户要回答的问题

来自 `business-use-cases.md` 和 `agentic-flows.md` 的关键运营问题：

| 问题 | 对应用例 |
| --- | --- |
| 站点有多少工牌？各状态分布如何？ | 日常运营监控 |
| 哪些工牌可用？ | F03 排单前确认设备可用性 |
| 哪些工牌离线、低电量或同步延迟？ | 首页"设备同步"提醒 |
| 某个工牌属于哪个站点？ | F01 激活归属确认 |
| 某个工牌的常用服务人员是谁？ | F01 可选指定服务人员 |
| 这个工牌最近产生了哪些服务记录？ | F05 后台自动规整后的服务记录追溯 |
| 工牌当前是否正在录音（使用中）？ | F04 服务人员上门记录服务 |
| 如何新激活一个工牌？ | F01 运营激活智能工牌 |
| 工牌丢失了怎么标记？ | 设备生命周期管理 |
| 如何把停用或丢失的工牌恢复？ | 设备生命周期管理 |

## 3. 主界面布局

### 页头

```text
设备                                              [+ 激活工牌]
管理站点智能工牌激活、监控和维护
```

- page title：`设备`
- 简短说明：管理站点智能工牌激活、监控和维护
- 一个 primary button：`激活工牌`

### Table container

```text
┌────────────────────────────────────────────────────────────┐
│ [🔍搜索设备码] [工牌状态 ▾] [常用人员 ▾]                     │
├────────────────────────────────────────────────────────────┤
│ 设备码    站点    状态    电量    最近同步    常用人员    服务记录 │
├────────────────────────────────────────────────────────────┤
│ FW-021   红培社区站  可用   83%   08:50    王丽      3 条     │
│ FW-026   红培社区站  同步延迟 92%  昨日18:43  —        0 条     │
│ FW-030   红培社区站  待激活  —    —        —        —        │
└────────────────────────────────────────────────────────────┘
```

Table container 使用 `global-ui-guidance.md` 定义的白底容器样式（`--surface` 白底 + `--line` 边框 + `--radius-lg` 圆角）。

## 4. 筛选与搜索

### 搜索

按设备码模糊搜索，本地过滤。搜索框在 toolbar 内。

### 工牌状态下拉框

| 选项 | 过滤逻辑 |
| --- | --- |
| 工牌状态（默认） | 不过滤 |
| 可用 | `status === "available"` |
| 使用中 | `status === "in_use"` |
| 待激活 | `status === "pending_activation"` |
| 离线 | `status === "offline"` |
| 同步延迟 | `status === "sync_delayed"` |
| 低电量 | `status === "low_battery"` |
| 已停用 | `status === "disabled"` |
| 丢失 | `status === "lost"` |

### 常用人员下拉框

| 选项 | 过滤逻辑 |
| --- | --- |
| 常用人员（默认） | 不过滤 |
| 有常用人员 | `preferredWorkerId !== undefined` |
| 无常用人员 | `preferredWorkerId === undefined` |

筛选规则：

- 下拉框默认显示字段名（"工牌状态""常用人员"），不显示"全部"，确保用户不展开也知道是什么筛选。
- 选中非默认值时下拉框文字使用 `--accent` 色。
- 两个下拉框可组合使用，和搜索可叠加。

## 5. Table 列定义

列布局：`grid-template-columns: 1fr 0.9fr 0.72fr 0.6fr 1.1fr 1fr 0.82fr`

| 列 | 内容 | 样式 |
| --- | --- | --- |
| 设备码 | `deviceCode`，如 `FW-021` | 14px/600 monospace 底色 tag 样式。可点击打开 Modal，hover underline |
| 站点 | `siteName` | body 13px |
| 状态 | `status` Status Badge | 语义色 badge，6px 圆角 |
| 电量 | `batteryPercent` + `%`；`undefined` 显示 `—` muted | body 13px；低电量（< 20%）使用 warning 色 |
| 最近同步 | `lastSyncAt` 格式化为相对时间或 `MM/DD HH:mm`；`undefined` 显示 `—` muted | body 13px |
| 常用人员 | `preferredWorkerName` 或 `—` muted | body 13px |
| 服务记录 | `recentServiceRecordIds.length` + `条`；0 条显示 `—` muted | body 13px。可点击跳转服务记录 tab |

### 状态映射

| status | 中文 | tone |
| --- | --- | --- |
| `pending_activation` | 待激活 | muted |
| `available` | 可用 | success |
| `in_use` | 使用中 | accent |
| `offline` | 离线 | warning |
| `low_battery` | 低电量 | warning |
| `sync_delayed` | 同步延迟 | warning |
| `lost` | 丢失 | danger |
| `disabled` | 已停用 | muted |

### 行交互

| 平台 | 交互 | 行为 |
| --- | --- | --- |
| 桌面 | 单击行 | 选中行（`--accent-soft` 高亮 + 左侧蓝色边条） |
| 桌面 | 点击设备码 | 打开详情 Modal |
| 桌面 | 双击行 | 打开详情 Modal |
| 手机 | 单击整行 | 直接打开底部 Modal |

禁止：

- 列表行展示停用、标记丢失、恢复、更新常用服务人员等生命周期动作。
- 详情内容直接接在列表行下方。
- 行内同时展示"最近记录"跳转和生命周期动作。

## 6. Modal 信息架构

Modal 有两种模式：设备详情和激活工牌。所有模式使用居中全屏 Modal（CSS class `so-modal`），高度固定 92vh。

### 设备详情 Modal（`so-modal--view`）

点击设备码或双击行（手机单击行）打开。

**摘要卡**：设备图标（`badges-avatar`）+ 设备码 `FW-021`（monospace tag）+ `站点名 · 状态` 副标题 + 关闭按钮。padding 14px，标题 17px。

**Tab 导航**：3 个 tab — `设备信息`、`服务人员`、`服务记录`。

**Tab 1：设备信息**

合并基础信息和运行状态为单个 3×3 概览网格（`so-modal__overview`，`grid-template-columns: 1fr 1fr 1fr`）：

| 行 | 列 1 | 列 2 | 列 3 |
| --- | --- | --- | --- |
| 行 1 | 设备码 `deviceCode` | 所属站点 `siteName` | 当前状态 `status`（Status Badge） |
| 行 2 | 激活时间 `activatedAt` | 电量 `batteryPercent%`（低于 20% warning 色） | 最近同步 `lastSyncAt`（超 12h warning） |
| 行 3 | 最近录音 `lastRecordingAt` | 常用人员 `preferredWorkerName` | 服务记录（`recentServiceRecordIds.length` 条） |

**Tab 2：服务人员**

- 有 `preferredWorkerId` 时显示服务人员姓名和关联信息
- 无时显示"站点共享使用，未指定常用人员"muted 文字
- 说明文字："工牌可被站点内任一服务人员使用，常用人员仅作为推断默认关联"
- 内嵌人员选择器：蓝色背景面板（`#F0F5FF`）+ 下拉选择服务人员（站点共享 / 指定人员）

**Tab 3：服务记录**

- 列出 `recentServiceRecordIds` 对应的最近 5 条记录摘要
- 每条显示：服务日期、服务对象姓名（如有）、服务项目、复核状态 badge
- 复核状态使用语义色：`confirmed` = success、`needs_review` = warning、`info_incomplete` = warning、`exception_open` = danger
- 点击"查看记录"按钮打开 RecordDrawer，使用**内联替换**模式：Modal 组件 early return，RecordDrawer 完全替换当前 Modal（不叠加第二层 Modal）
- RecordDrawer header 使用"← 返回设备"按钮，点击回到设备详情 Modal
- 无记录时显示"暂无服务记录"muted

**底部操作栏**（根据状态动态变化）：

| 按钮 | 类型 | 条件 |
| --- | --- | --- |
| 更新常用人员 | secondary | 状态非 `disabled`/`lost` |
| 停用 | danger ghost | 状态为 `available`/`offline`/`sync_delayed`/`low_battery`，点击弹确认 |
| 标记丢失 | danger ghost | 状态为 `available`/`offline`/`sync_delayed`/`low_battery`，点击弹确认 |
| 恢复 | secondary | 状态为 `disabled` 或 `lost` |

### 激活工牌 Modal（`so-modal--form`）

点击页头"激活工牌"打开。分步向导式。

摘要卡标题："激活工牌"。

**Step 1：输入设备码**

- 输入框：placeholder "输入设备码，如 FW-030"
- 后续可扩展扫码功能

**Step 2：校验设备身份**

- 输入设备码后自动校验
- 成功：显示设备信息确认（设备码、当前站点绑定预览）
- 失败情况：
  - 设备码不存在：显示错误"未找到该设备码"
  - 已绑定其他机构：显示"该工牌已绑定其他机构，需原机构释放后才能激活"
  - 已在当前站点激活：显示"该工牌已激活"

**Step 3：确认绑定**

- 显示设备码 + 当前站点名（红培社区站）
- 确认按钮

**Step 4：激活结果**

- 成功：显示成功状态 + 设备码 + 站点名 + 工牌详情
- 按钮：[查看设备详情] [继续激活下一个]

## 7. 动作归属

| 动作 | 归属 | 对应用例 |
| --- | --- | --- |
| 激活工牌 | 页头 primary button → 激活 Modal | F01 运营激活智能工牌 |
| 输入/扫描设备码 | 激活 Modal Step 1 | F01 |
| 校验设备身份 | 激活 Modal Step 2（自动） | F01 |
| 确认站点绑定 | 激活 Modal Step 3 | F01 |
| 设置常用服务人员 | 激活 Modal Step 4 / 详情 Modal | F01 "可选指定服务人员" |
| 停用工牌 | 详情 Modal danger action + 确认 | 设备生命周期 |
| 标记丢失 | 详情 Modal danger action + 确认 | 设备生命周期 |
| 恢复工牌 | 详情 Modal secondary action | 设备生命周期 |
| 查看最近服务记录 | 详情 Modal → 跳转服务记录 tab | F05 后台自动规整后的追溯 |
| 查看设备详情 | 点击设备码 / 双击行 / 手机单击行 | 日常监控 |

动作实现约束：

- 列表行不展示任何操作按钮。
- 生命周期动作（停用、丢失、恢复）只在 Modal 内出现。
- "使用中"状态的工牌不能被停用或标记丢失（正在录音中）。

## 8. 状态

### 工牌生命周期状态

```text
                  ┌──────────────┐
                  │ pending_     │
                  │ activation   │
                  └──────┬───────┘
                 激活成功 │
                  ┌──────▼───────┐
           ┌──── │  available    │ ◄───── 恢复
           │     └──────┬───────┘
           │    按键开始 │ 录音结束
           │     ┌──────▼───────┐
           │     │   in_use     │
           │     └──────┬───────┘
           │            │
      停用/丢失    ┌────┴────┐
           │      │         │
    ┌──────▼──┐  ┌▼────────┐ ┌──────────┐
    │disabled │  │ offline  │ │sync_delayed│
    │  /lost  │  └─────────┘ └──────────┘
    └─────────┘        └──────────┘
                    电量低 → low_battery
```

### 页面数据状态

- `empty_badges`：站点还没有工牌，显示"暂无智能工牌"并提供激活入口。
- 筛选/搜索无结果：显示"没有匹配的设备"。
- 加载中：显示"设备数据加载中..."。
- 加载失败：显示错误信息。
- `read_only`：只读模式，激活和生命周期动作禁用。
- `restricted`：权限受限，敏感信息隐藏。
- `unavailable`：显示不可用原因。

## 9. 数据契约

本 tab 的数据类型对齐 API contract [`../../../api-contract/site-operations/03-devices-api.md`](../../../api-contract/site-operations/03-devices-api.md)。

### 核心类型

```ts
type SmartBadgeStatus =
  | "pending_activation"
  | "available"
  | "in_use"
  | "offline"
  | "low_battery"
  | "sync_delayed"
  | "lost"
  | "disabled";

type SmartBadge = {
  id: string;
  deviceCode: string;
  orgId: string;
  siteId: string;
  siteName?: string;
  status: SmartBadgeStatus;
  batteryPercent?: number;
  activatedAt?: string;
  lastSyncAt?: string;
  lastRecordingAt?: string;
  preferredWorkerId?: string;
  preferredWorkerName?: string;
  recentServiceRecordIds: string[];
};

type ActivateSmartBadgeRequest = {
  deviceCode: string;
  siteId: string;
  preferredWorkerId?: string;
};

type UpdateSmartBadgeRequest = {
  status?: SmartBadgeStatus;
  preferredWorkerId?: string;
};

type SmartBadgeServiceRecordLink = {
  serviceRecordId: string;
  serviceDate: string;
  serviceObjectName?: string;
  reviewStatus: "confirmed" | "needs_review" | "info_incomplete" | "exception_open";
};

type SmartBadgesResponse = {
  smartBadges: SmartBadge[];
  operationalState: WorkAreaOperationalState;
};
```

### API Endpoints

- `GET /api/smart-badges` — 列表，支持 `status` 和 `preferredWorkerId` 查询参数
- `GET /api/smart-badges/:id` — 单个详情
- `POST /api/smart-badges/activations` — 激活
- `PATCH /api/smart-badges/:id` — 更新状态或常用人员
- `GET /api/smart-badges/:id/service-records` — 最近服务记录链接

### Fixture 更新

`deploy/site-operations-api-fixture.mjs` 中的 `smartBadges` 数组必须覆盖：

- 已激活可用工牌（有 `preferredWorkerId`，有 `recentServiceRecordIds`）
- 同步延迟工牌（`sync_delayed`，有电量）
- 待激活工牌（`pending_activation`，无电量、无同步时间）
- 离线工牌（`offline`）
- 低电量工牌（`low_battery`，`batteryPercent < 20`）
- 使用中工牌（`in_use`，正在录音）
- 已停用工牌（`disabled`）
- 丢失工牌（`lost`）

## 10. 响应式

### 桌面端（>767px）

- 搜索框 + 两个下拉框 + 激活按钮横向排列在 toolbar 内。
- Table 列表占主工作区。
- Modal 居中弹出，固定高度 92vh，overlay 模式 + scrim。

### 手机端（≤767px）

- 搜索框独占一行，下拉框和激活按钮换行排列。
- Table 转换为卡片列表，每张卡片：
  - 第一行：设备码（monospace tag 样式） + 状态 badge
  - 第二行：站点名
  - 第三行：电量 + 最近同步时间（用 `·` 分隔）
  - 第四行：常用人员 / 站点共享 + 服务记录数
- 整卡点击打开底部 Modal。
- 底部 Modal 最大高度 86vh，内部滚动。

## 11. 与业务流程的对应关系

| 业务流程 | 本 tab 承接 |
| --- | --- |
| F01 运营激活智能工牌 | 激活 Modal 完整流程 |
| F04 服务人员上门记录服务 | 工牌 `in_use` 状态实时展示 |
| F05 后台自动规整服务记录 | 最近服务记录链接 + 复核状态 badge |
| 首页"设备同步"提醒 | 列表筛选 sync_delayed / offline / low_battery |
| 站点日常运营监控 | 完整列表 + 状态筛选 + KPI 分布 |

### 跨 tab 导航

- 详情 Modal 内"最近服务记录"条目可点击 → 跳转到 `服务记录` tab
- 详情 Modal 内"常用服务人员"姓名 → 跳转到 `服务人员` tab（或打开服务人员 Modal）
- 首页"查看设备同步"推荐动作 → 跳转到本 tab

## 12. 验收

- 设备列表展示工牌设备码、站点归属、生命周期状态、电量、同步健康、常用人员和服务记录数。
- 设备码使用 monospace tag 样式，可点击打开 Modal。
- 状态使用 Status Badge，中文映射，6px 圆角，语义色。
- 生命周期动作（停用、丢失、恢复）只在 Modal 内，列表行不展示。
- 激活支持扫码或输入设备码，校验冲突，可选设置常用人员。
- 激活成功后设备出现在列表中。
- 设备详情 Modal 展示完整信息：基础信息、运行状态、常用人员、最近服务记录。
- 最近服务记录显示服务日期、服务对象和复核状态 badge。
- `in_use` 状态的工牌不能被停用或标记丢失。
- 筛选下拉默认显示字段名，非默认值时文字变为 `--accent` 色。
- 手机端 Table 转换为卡片列表，Modal 从底部滑出。
- 数据类型对齐 API contract，无旧字段残留。
- Fixture 覆盖全部状态组合。
