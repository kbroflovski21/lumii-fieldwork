# 服务排期 Tab Design

状态：设计规格
日期：2026-05-15
工作区 id：`service_schedules`
页面标题：`服务排期`

## 1. 目的和边界

本 tab 是所有服务对象服务计划的多视图聚合查看和管理页面，回答"谁在什么时间去哪里做什么服务"。

服务排期由两种来源生成：
- **周期服务计划**（`service_plan`）：在 `服务对象` tab 通过 AI 安排服务创建，自动按频次生成排期。
- **按次服务**（`one_time`）：在 `服务对象` tab 通过 AI 安排服务创建的单次服务。

本 tab 不承载服务创建——创建在 `服务对象` tab 的 AI 安排服务中完成。本 tab 专注于查看和调整已有排期。

### 本 tab 负责

- 三种视图聚合展示所有排期：**列表视图**、**日历视图**、**地图视图**。
- 按日期、状态、服务对象、服务人员筛选排期。
- 查看单条排期详情（服务对象、地址、时间、人员、状态）。
- 调整单条排期：改时间、改人员、取消。
- 已完成排期链接到服务记录。

### 边界

- 创建服务计划和安排服务 → `服务对象` tab 的 AI 安排服务。
- 周期服务计划的编辑/暂停/归档 → `服务对象` tab。
- 服务对象档案编辑 → `服务对象` tab。
- 服务记录复核、音频、GPS 证据和导出 → `服务记录` tab。

## 2. 用户要回答的问题

| 问题 | 对应用例 |
| --- | --- |
| 今天/本周有多少服务要执行？ | 4.7 排班派单 |
| 谁去、几点去、去哪里、服务什么项目？ | 4.7 排班派单 |
| 哪些排期还没分配服务人员？ | 4.7 排班派单 |
| 哪些排期受计划例外影响？ | 4.7 改约/取消 |
| 某个服务对象本周有几次服务？ | 日常运营监控 |
| 某个服务人员今天的行程是什么？ | 4.7 路线/时间安排 |
| 服务对象分布在哪些区域？ | 地图视图 |
| 某条排期需要改时间/改人员/取消？ | 4.7 排班调整 |
| 某条完成的排期对应哪条服务记录？ | F05 后台自动规整追溯 |

## 3. 主界面布局

### 页头

```text
服务排期                                    [列表 | 日历 | 地图]
查看和管理所有服务对象的服务安排
```

- page title：`服务排期`
- 简短说明：查看和管理所有服务对象的服务安排
- 右侧视图切换：`Segmented Control`（列表 / 日历 / 地图）

注意：没有"创建"按钮——创建在 `服务对象` tab 完成。

### 视图切换

使用 `Segmented Control` 切换三种视图：

| 视图 | 图标 | 说明 |
| --- | --- | --- |
| 列表 | List icon | 默认视图，Table 展示所有排期 |
| 日历 | Calendar icon | 按日/周视图展示排期分布 |
| 地图 | MapPin icon | 按地图显示服务对象地理分布 |

## 4. 筛选与搜索

### 搜索

按服务对象姓名或地址模糊搜索，本地过滤。

### 日期范围

日历视图和地图视图使用日历自带的导航（左右箭头 + "今天"按钮）控制日期范围，toolbar 中不再单独放置日期筛选按钮。列表视图通过搜索和状态/人员下拉框筛选。

### 排期状态下拉框

| 选项 | 过滤逻辑 |
| --- | --- |
| 排期状态（默认） | 不过滤 |
| 待执行 | `status === "scheduled"` |
| 已分配 | `status === "assigned"` |
| 已调整 | `status === "adjusted"` |
| 进行中 | `status === "in_progress"` |
| 已完成 | `status === "completed"` |
| 已取消 | `status === "cancelled"` |

### 服务人员下拉框

| 选项 | 过滤逻辑 |
| --- | --- |
| 服务人员（默认） | 不过滤 |
| 未分配 | `assignedSocialWorkerId === undefined` |
| 王丽 | `assignedSocialWorkerId === "worker-001"` |
| 张敏 | `assignedSocialWorkerId === "worker-002"` |
| ... | 动态从服务人员列表生成 |

筛选规则：

- 下拉框默认显示字段名。
- 选中非默认值时文字变为 `--accent` 色。
- 多个下拉框可组合使用，和搜索可叠加。

## 5. 列表视图

### Table 列定义

列表视图 6 列：

| 列 | 内容 | 样式 |
| --- | --- | --- |
| 日期 / 时间段 | `serviceDate` 格式化为 `MM/DD 周X`（14px/600）+ 下方 `timeWindow.label` 或 `startTime-endTime`（12px muted） | 两行布局 |
| 服务对象 | 色彩 avatar（28px 圆角 8）+ `serviceObjectName`，有 `riskTags` 时名旁显示 warning 小图标 | avatar + name |
| 服务人员 | `assignedSocialWorkerName` 或 "未分配" muted | body 13px |
| 服务项目 | `serviceProject` | tag 样式 |
| 地址 | `addressSnapshot` 截断一行 | body 13px, ellipsis |
| 状态 | `status` Status Badge | 语义色 |

### 状态映射

| status | 中文 | tone | 颜色说明 |
| --- | --- | --- | --- |
| `scheduled` | 待执行 | muted | 灰色（`--muted-bg/text`） |
| `assigned` | 已分配 | accent | 蓝色（`--accent`） |
| `adjusted` | 已调整 | warning | 橙色（`--warning-bg/text`） |
| `in_progress` | 进行中 | info | 青色（`--info-bg` #ECFEFF / `--info-text` #0891B2） |
| `completed` | 已完成 | success | 绿色（`--success-bg/text`） |
| `cancelled` | 已取消 | muted | 灰色（`--muted-bg/text`） |

### 行交互

| 平台 | 交互 | 行为 |
| --- | --- | --- |
| 桌面 | 单击行 | 选中行（高亮 + 左侧蓝色边条） |
| 桌面 | 双击行 | 打开排期详情 Modal |
| 手机 | 单击整行 | 直接打开底部 Modal |

行内标记：
- `planExceptionApplied === true` 时行左侧显示橙色边条（计划例外已影响）
- `riskTags.length > 0` 时在服务对象名旁显示 warning 小图标

## 6. 日历视图

日历视图使用 Outlook 风格，支持三种模式切换（日 / 周 / 月），通过顶部 mode 按钮组切换。

### 导航栏

- 左右箭头（ChevronLeft / ChevronRight）按当前模式步进
- 中间显示当前范围标题
- "今天"按钮跳回当前日期

### 日视图

单列时间网格（07:00-18:00），排期条目按时间定位，高度按时长计算。日历使用页面级别滚动（不使用内部 scrollbar）。

每个排期条目：
- 整个条目背景使用状态 tone 对应的浅色（如 assigned=accent 浅蓝、completed=success 浅绿、in_progress=info 浅青），左侧色条使用 tone 深色
- 服务对象（strong）+ 服务人员名 + 服务项目 · 时间段
- 点击打开排期详情 Modal

### 周视图

7 列网格（周一到周日），顶部表头显示日期和星期，当天高亮。左侧时间刻度列（07:00-18:00）。排期条目按时间定位（top = 从 07:00 起的分钟偏移，height = 时长分钟数）。每个条目显示服务人员名（`assignedSocialWorkerName`），颜色使用状态 tone 对应色，交互同日视图。页面级别滚动。

### 月视图

7 列 5 行日历网格，每天显示日期数字和最多 3 条排期事件（点击展开），超过 3 条显示 `+N`。非当月日期灰显。每条排期事件显示服务人员名 + 服务对象名，使用左侧色条（对应状态 tone），点击打开详情 Modal。

## 7. 地图视图

地图视图使用 Leaflet + 高德瓦片（`webrd0{1-4}.is.autonavi.com`），展示服务对象的地理分布和排期。

布局：左右分栏（`grid-template-columns: 1fr 320px`）。

- 左侧：Leaflet 地图，使用 `L.map` + 高德 tileLayer，默认中心为站点区域（如 `[31.29, 121.52]` zoom 13）。
- 右侧：320px 宽按地址分组的排期列表。
- 同一地址（`mapDisplayPoint` 经纬度相同）的多条排期合并为一个 marker。
- 点击 marker 弹出 Leaflet popup，展示该地址的排期列表（服务对象 · 服务项目 + 日期 · 时间段）。
- popup 中每条排期可点击打开详情 Modal。
- 右侧列表每组显示地址名称（带定位图标）+ 排期数量 + 各条排期（点击打开 Modal）。
- 地址组图标可点击，点击后地图平移并缩放到该地址位置（panTo + setZoom）。
- 地图支持全屏展开/收起切换（Maximize2 / Minimize2 图标）。
- 地址/地图点修正通过 `服务对象` tab 完成，不在地图视图中修改。

## 8. Modal 信息架构

### 排期详情 Modal（事件卡片式）

点击列表行、日历条目或地图 pin 内排期打开。使用 `so-modal sch-event-modal` 样式，采用事件卡片设计（类似 Google Calendar 事件详情），不使用通用 tab 模式。

```text
┌──────────────────────────────────────────────┐
│ 状态色 Banner (sch-event__banner)             │
│   状态 badge + 服务项目标题                    │
│   日期 · 时间 · 来源 badge · 例外/风险标签     │
├──────────────────────────────────────────────┤
│ 三信息卡 (sch-event__cards)                   │
│   [服务对象卡] [服务人员卡] [服务地点卡]       │
├──────────────────────────────────────────────┤
│ 快捷操作栏 (sch-event__action-bar, 条件显示)  │
│   [调整时间] [改派人员] [查看记录]             │
├──────────────────────────────────────────────┤
│ 排期详情 (scrollable)                         │
│   3×3 字段网格                                │
│   调整历史（如有）                             │
├──────────────────────────────────────────────┤
│ 底部操作栏 (so-modal__footer)                  │
│   [取消排期]（danger ghost）                   │
└──────────────────────────────────────────────┘
```

**状态色 Banner**

顶部色彩条，颜色根据状态映射：

| 状态 | 色调 | 背景色 |
| --- | --- | --- |
| `completed` | success（绿） | `#E0F4EC → #D1FAE5` |
| `assigned` / `in_progress` | accent（蓝） | `#EFF6FF → #DBEAFE` |
| `adjusted` | warning（琥珀） | `#FFF1D6 → #FEF3C7` |
| `scheduled` / `cancelled` | muted（灰） | `#F8FAFC → #F1F5F9` |

Banner 内容：状态 badge + 服务项目标题（18px/700）+ 日期时间 + 来源 badge（周期计划/按次服务）+ 例外标记 + 风险标签。padding 14px。

**三信息卡**

3 列并排卡片：

| 卡片 | 内容 |
| --- | --- |
| 服务对象 | avatar（彩色首字母）+ 姓名 + 风险标签 |
| 服务人员 | 已分配：人员姓名；未分配："待分配"muted |
| 服务地点 | MapPin 图标 + 地址 |

**快捷操作栏**（仅非完成/非取消状态显示）

- [调整时间]：点击展开内嵌表单（日期输入 + 时间段预设下拉）
- [改派人员]：点击展开内嵌表单（服务人员下拉）
- [查看记录]：仅已完成状态 + 有 `serviceRecordId` 时显示

时间段预设下拉选项：`上午 09:00-11:00` / `上午 10:00-12:00` / `下午 14:00-16:00` / `傍晚 16:00-18:00`

**排期详情**

3×3 字段网格（`so-modal__overview`，`grid-template-columns: 1fr 1fr 1fr`）：

| 行 | 列 1 | 列 2 | 列 3 |
| --- | --- | --- | --- |
| 行 1 | 服务日期 `serviceDate` | 时间段 `timeWindow` | 服务项目 `serviceProject`（tag） |
| 行 2 | 来源 `source` | 状态 `status`（badge） | 服务人员/计划例外 |
| 行 3 | 服务对象 `serviceObjectName` | 地址 `addressSnapshot` | 备注/关联记录 |

**调整历史**（如有历史调整记录）：每条显示操作类型 + 详情 + 操作员 + 时间戳。

**底部操作栏**（仅非完成/非取消状态）：

- [取消排期]（danger ghost），点击弹 2-step 确认 → 确认后状态变为 `cancelled`

## 9. 动作归属

| 动作 | 归属 | 对应用例 |
| --- | --- | --- |
| 查看排期详情 | 列表/日历/地图单项入口 → 详情 Modal | 4.7 排班派单 |
| 调整排期时间 | 详情 Modal 操作 | 4.7 改约 |
| 改派服务人员 | 详情 Modal 操作 | 4.7 改派 |
| 取消单条排期 | 详情 Modal danger action + 确认 | 4.7 取消 |
| 切换视图 | 页头 Segmented Control | 多视图查看 |
| 编辑周期规则 | 跳转 `服务对象` tab | 4.7 |
| 查看服务记录 | 跳转 `服务记录` tab | F05 |

动作实现约束：

- 列表行不展示任何操作按钮。
- 日历和地图视图的排期条目只开 Modal，不直接操作。
- 本 tab 不承载创建功能（创建在服务对象 tab 的 AI 安排服务中完成）。
- 单条排期调整不修改周期服务计划。

## 10. 状态

### 排期状态

| status | 中文 | tone | 说明 |
| --- | --- | --- | --- |
| `scheduled` | 待执行 | muted | 排期已生成，尚未分配人员或时间未到 |
| `assigned` | 已分配 | accent | 已分配服务人员（蓝色） |
| `adjusted` | 已调整 | warning | 受计划例外影响或手动调整过（橙色） |
| `in_progress` | 进行中 | info | 服务人员已开始服务（青色 #ECFEFF/#0891B2） |
| `completed` | 已完成 | success | 服务完成，已关联服务记录（绿色） |
| `cancelled` | 已取消 | muted | 已取消 |

### 页面数据状态

- 无排期：显示"暂无服务排期"。
- 筛选无结果：显示"没有匹配的排期"。
- 加载中：显示"服务排期数据加载中..."。
- 加载失败：显示错误信息。
- `read_only`：只读模式，调整和取消操作禁用。

## 11. 数据契约

### 核心类型

```ts
type ServiceScheduleOccurrence = {
  id: string;
  source: "service_plan" | "one_time";
  servicePlanId?: string;
  serviceObjectId: string;
  serviceObjectName: string;
  serviceProject: string;
  addressSnapshot: string;
  address?: string;
  mapDisplayPoint?: MapDisplayPoint;
  serviceDate: string;
  startTime?: string;
  endTime?: string;
  timeWindow: TimeWindow;
  assignedSocialWorkerId?: string;
  assignedSocialWorkerName?: string;
  status: "scheduled" | "assigned" | "adjusted" | "in_progress" | "completed" | "cancelled";
  notes?: string;
  serviceRecordId?: string;
  planExceptionApplied?: boolean;
  mapQueryText?: string;
  latitude?: number;
  longitude?: number;
  riskTags: string[];
};

type CreateOneTimeServiceScheduleRequest = {
  serviceObjectId?: string;
  minimalProfile?: Pick<CreateServiceObjectRequest, "name" | "age" | "address" | "mapDisplayPoint">;
  serviceProject: string;
  serviceDate: string;
  timeWindow: TimeWindow;
  assignedSocialWorkerId?: string;
};

type UpdateServiceScheduleOccurrenceRequest = {
  serviceDate?: string;
  timeWindow?: TimeWindow;
  assignedSocialWorkerId?: string;
  status?: ServiceScheduleOccurrence["status"];
  notes?: string;
  serviceRecordId?: string;
};

type ServiceSchedulesResponse = {
  serviceSchedules: ServiceScheduleOccurrence[];
  operationalState: WorkAreaOperationalState;
};
```

### API Endpoints

- `GET /api/service-schedule-occurrences` — 列表，支持 `dateFrom`/`dateTo`/`status`/`serviceObjectId`/`assignedSocialWorkerId` 查询
- `POST /api/service-schedule-occurrences` — 创建按次服务（由服务对象 tab 调用）
- `GET /api/service-schedule-occurrences/:id` — 单条详情
- `PATCH /api/service-schedule-occurrences/:id` — 调整单条排期

### Fixture 覆盖

| 场景 | 字段要求 |
| --- | --- |
| 周期计划排期 | `source: "service_plan"`，有 `servicePlanId` |
| 按次服务排期 | `source: "one_time"` |
| 已分配 | `status: "assigned"`，有 `assignedSocialWorkerName` |
| 已调整（例外影响） | `status: "adjusted"`，`planExceptionApplied: true` |
| 已完成 | `status: "completed"`，有 `serviceRecordId` |
| 待执行 | `status: "scheduled"` |
| 已取消 | `status: "cancelled"` |
| 有风险标签 | `riskTags` 非空 |
| 有地图点 | `mapDisplayPoint` 非空 |

## 12. 响应式

### 桌面端（>767px）

- 搜索框 + 状态下拉 + 人员下拉 横向排列在 toolbar 内（日期范围通过日历自带导航控制，toolbar 中不再放置日期筛选按钮）。
- 视图切换 Segmented Control 在页头右侧。
- 列表视图使用 Table；日历和地图占满主工作区。
- Modal 居中弹出，固定高度 92vh，overlay 模式。

### 手机端（≤767px）

- 搜索框独占一行，下拉框换行排列。
- 列表视图转为卡片列表：
  - 第一行：日期 + 状态 badge
  - 第二行：服务对象 · 服务项目
  - 第三行：时间段 · 服务人员
  - 第四行：地址（截断）
- 日历视图简化为日视图列表。
- 地图视图保留，pin 点击弹出底部 Modal。
- Modal 使用底部模式，最大高度 86vh。

## 13. 与业务流程的对应关系

| 业务流程 | 本 tab 承接 |
| --- | --- |
| 4.7 排班并派发上门任务 | 列表/日历/地图查看排期 + 调整/改派/取消 |
| 4.7 改约/取消 | 详情 Modal 内调整操作 |
| F04 服务人员上门记录服务 | `in_progress` 状态实时展示 |
| F05 后台自动规整 | `completed` 状态 + 关联 `serviceRecordId` |
| 首页"去补排今日缺口" | 跳转到本 tab 并筛选未分配 |

### 跨 tab 导航

- 详情 Modal 内 `serviceObjectName` 可点击 → 跳转 `服务对象` tab
- 详情 Modal 内 `serviceRecordId` 可点击 → 跳转 `服务记录` tab
- 详情 Modal 内"编辑周期规则" → 跳转 `服务对象` tab
- 首页推荐动作"去补排今日缺口" → 跳转本 tab

## 14. 验收

- 三种视图（列表/日历/地图）通过 Segmented Control 切换。
- 列表视图展示日期、服务对象（带 avatar）、服务项目 tag、时间段、地址、服务人员、状态 badge。
- 日历视图按日/周展示排期条目，颜色使用状态 tone（completed=success 绿、assigned=accent 蓝、adjusted=warning 橙、in_progress=info 青、scheduled/cancelled=muted 灰），条目显示服务人员名。月视图条目显示服务人员名和服务对象名。
- 日历使用页面级别滚动（无内部 scrollbar）。
- 地图视图使用 Leaflet + 高德瓦片，左右分栏（地图 1fr + 列表 320px），地址组图标可点击定位。
- 筛选下拉（状态/人员）默认显示字段名，非默认值 accent 色。日期范围通过日历自带导航控制，toolbar 无日期筛选按钮。
- 列表行不展示任何操作按钮。
- 详情 Modal 展示完整排期信息 + 服务对象 + 服务人员 + 关联记录。
- 调整操作（改时间/改人员/取消）在 Modal 内完成，不修改周期计划。
- `planExceptionApplied` 排期行显示橙色边条。
- `completed` 排期展示关联服务记录跳转入口。
- 本 tab 不展示创建按钮（创建在服务对象 tab 完成）。
- 手机端列表转卡片，地图 pin 弹出底部 Modal。
- 数据类型对齐 API contract。
- Fixture 覆盖全部状态和来源组合。
