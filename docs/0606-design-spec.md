# 0606 增量设计规格 (Design Spec)

> 基于 `docs/0606原始需求.md` 的 7 条 input，替代 0604 版本所有设计。

**日期**: 2026-06-06
**状态**: Draft — 待 review
**前版偏差说明**: 0604 版本错误地废弃了排班系统。本版本恢复排班为核心管理工具，并引入"排班引导，执行灵活"的设计模式。

---

## 一、核心设计原则

### 1.1 两个超级重点

1. **服务人员真实性核查（证据链）**: 多维度交叉验证（GPS、信标、录音/声纹、雷达、视频飞检），确保每次服务的真实性
2. **老人失能等级核查**: 通过毫米波雷达观察老人行为，防止失能等级作弊。与服务人员核查**并列、同等重要**
3. **管理效率（排班优化）**: 护工时间最大化利用、老人额度最大化利用，直接影响医保拨付和机构净利率

### 1.2 排班与服务的关系："排班引导，执行灵活"

- 排班作为**默认计划**存在，护工打开 App 时看到的是"今天的排班"，一键进入服务流程
- 护工**可以偏离排班**——临时加服务、换老人、调时间都允许
- 服务结束后，系统自动比对**实际执行 vs 排班计划**，标记偏离
- 站点运营和总部可以看到**排班符合率**作为管理指标

**不采用强制 follow 模式的原因**:
- 老人状态可能临时变化（身体不适需要改期）
- 护工间代班是常态
- 强制模式下，护工可能为了"系统合规"而造假
- 护工群体文化程度偏低，操作流程要尽量简单

### 1.3 资质驱动（非角色驱动）

- 系统不硬编码"护工"/"护士" role
- 每个服务项目定义所需资质，每个服务人员持有资质标签
- "谁可以做什么服务"由资质匹配决定——这是硬约束
- "谁常用服务谁"是管理便利——这是软关联

---

## 二、数据模型设计

### 2.1 标准目录 (ServiceStandardCatalog)

```typescript
interface ServiceStandardCatalog {
  id: string;
  name: string;                    // "杭州市长护险标准" | "国家长护险标准"
  region: string;                  // "hangzhou" | "national"
  version: string;
  effectiveDate: string;
  status: "active" | "archived";
  categories: ServiceCategory[];
  totalItems: number;
  // 地区性医保隐性约束/规则
  policyConstraints: PolicyConstraint[];
}

interface PolicyConstraint {
  id: string;
  catalogId: string;
  name: string;                    // "单次工时约束" | "每周上门约束" | ...
  type: "duration_per_visit" | "visits_per_week" | "hours_per_month" |
        "max_elders_per_worker" | "custom";
  rule: {
    min?: number;
    max?: number;
    unit: "minutes" | "hours" | "count" | "days";
    period?: "per_visit" | "per_week" | "per_month";
  };
  description: string;             // 人类可读描述
  severity: "hard" | "soft";       // hard=违反时警告, soft=仅提示
}

interface ServiceCategory {
  id: string;
  catalogId: string;
  name: string;
  sortOrder: number;
}

interface ServiceStandardItem {
  id: string;
  catalogId: string;
  categoryId: string;
  itemCode?: string;               // 国家标准18位编码
  seq: number;
  name: string;
  categoryName: string;
  referenceMinutes: number;
  frequency: string;
  description?: string;
  serviceRequirements?: string;
  notes?: string;
  requiredQualifications: string[]; // 所需资质标签列表
}
```

### 2.2 资质主数据 (QualificationTag)

```typescript
interface QualificationTag {
  id: string;
  name: string;                    // "护士" | "养老护理员(初级)" | "急救证" | ...
  category: "medical" | "caregiving" | "other";
}
```

### 2.3 服务计划/服务包 (ServicePlan)

一个老人有一份服务计划，定义可享受的服务项目"套餐"。

```typescript
interface ServicePlan {
  id: string;
  serviceObjectId: string;         // 对应长者
  catalogId: string;               // 使用哪套标准目录
  preferredWorkerId?: string;      // 常用服务人员（软关联，非硬约束）
  status: "active" | "paused" | "archived";
  monthlyHoursQuota: number;       // 月度额度（小时），如25
  createdAt: string;
  updatedAt: string;
  items: ServicePlanItem[];
}

interface ServicePlanItem {
  id: string;
  planId: string;
  standardItemId: string;
  standardItemName: string;
  categoryName: string;
  referenceMinutes: number;
  frequency: string;
  requiredQualifications: string[];
  notes?: string;
}
```

### 2.4 服务排班 (ServiceSchedule)

排班是时间维度的规划。基于现有 `ServiceScheduleOccurrence` 模型扩展。

```typescript
interface ServiceSchedule {
  id: string;
  // 排班来源
  source: "manual" | "ai_generated" | "recurring";
  recurringRuleId?: string;        // 如果是周期性排班，关联到规则

  // 核心信息
  serviceObjectId: string;
  serviceObjectName: string;
  serviceObjectAddress: string;
  assignedWorkerId: string;
  assignedWorkerName: string;
  planId: string;                  // 关联服务计划

  // 时间
  serviceDate: string;             // YYYY-MM-DD
  startTime: string;               // HH:MM 预计开始
  endTime: string;                 // HH:MM 预计结束
  estimatedMinutes: number;

  // 预估服务项目
  plannedItems: PlannedServiceItem[];

  // 状态
  status: "scheduled" | "in_progress" | "completed" | "missed" | "cancelled";

  // 执行后回填
  actualSessionId?: string;        // 关联实际服务记录
  matchStatus?: "exact" | "partial" | "unplanned" | "missed";
  // exact: 按排班执行
  // partial: 执行了但有偏差（时间/项目/人员）
  // unplanned: 这次服务没有对应的排班（计划外服务）
  // missed: 排班存在但没有执行
}

interface PlannedServiceItem {
  standardItemId: string;
  name: string;
  referenceMinutes: number;
}

interface RecurringScheduleRule {
  id: string;
  serviceObjectId: string;
  assignedWorkerId: string;
  planId: string;
  cadence: string;                 // "weekly:mon,wed,fri" | "daily" | "biweekly:tue,thu"
  cadenceLabel: string;            // "每周一/三/五"
  startTime: string;               // "09:00"
  endTime: string;                 // "10:30"
  plannedItems: PlannedServiceItem[];
  effectiveFrom: string;
  effectiveUntil?: string;
  status: "active" | "paused" | "archived";
}
```

### 2.5 服务记录 (ServiceRecord)

一次实际发生的上门服务的完整记录。

```typescript
interface ServiceRecord {
  id: string;

  // 基本信息
  serviceDate: string;
  serviceObjectId: string;
  serviceObjectName: string;
  serviceObjectAddress: string;
  workerId: string;
  workerName: string;
  workerQualifications: string[];  // 执行时的资质快照
  planId: string;

  // 排班关联
  scheduleId?: string;             // 关联排班（如有）
  scheduleMatchStatus: "exact" | "partial" | "unplanned";

  // 服务项目（开始时预估 + 结束时确认）
  plannedItems: ServiceItemEntry[];    // 开始前预估
  confirmedItems: ServiceItemEntry[];  // 结束后确认
  itemsDiff: "match" | "added" | "removed" | "changed";

  // 时间
  startedAt: string;
  completedAt: string;
  actualMinutes: number;
  durationStatus: "normal" | "too_short" | "too_long";  // 基于医保约束校验

  // 多维度证据链
  evidence: {
    gps: {
      status: "pass" | "fail" | "partial" | "missing";
      startMatch: boolean;         // 开始时GPS匹配
      endMatch: boolean;           // 结束时GPS匹配
      trackingPoints: number;      // 全程打点数
      midwayDeparture: boolean;    // 是否中途离开
      distanceFromAddress?: number;// 距离（米）
    };
    beacon: {
      status: "pass" | "fail" | "missing";
      connectedAt?: string;
      beaconId?: string;
    };
    audio: {
      status: "pass" | "fail" | "missing";
      durationSeconds: number;
      asrSummary?: string;
      voiceprintMatch: "pass" | "fail" | "not_checked";
      voiceprintConfidence?: number;
      audioAssetId?: string;
      transcriptId?: string;
    };
    radar: {
      status: "pass" | "fail" | "missing" | "not_required";
      deviceId?: string;
      dataAvailable: boolean;
      aiAnalysisSummary?: string;
    };
    photo: {
      status: "pass" | "missing";
      uploadedAt?: string;
      photoUrl?: string;
    };
    inspection: {
      status: "not_done" | "pass" | "fail";
      inspectedAt?: string;
      inspectorName?: string;
      inspectionType?: "video" | "in_person";
      notes?: string;
    };
  };

  // 老人失能等级核查（与服务人员证据链并列，同等重要）
  elderVerification: {
    status: "pass" | "fail" | "inconclusive" | "missing";
    mobilityDetected: boolean;             // 是否检测到老人自主移动
    mobilityLevel: "none" | "minimal" | "moderate" | "normal";  // 活动能力评估
    declaredDisabilityLevel: string;       // 申报的失能等级
    consistentWithDeclaration: boolean;    // 是否与申报一致
    radarDataAvailable: boolean;
    // 雷达可视化数据
    heatmapUrl?: string;                   // 热力图（老人+护工活动区域）
    timelineDataUrl?: string;              // 动态位置回放数据（可拖动进度条）
    aiAnalysisSummary?: string;            // AI对老人行为的分析结论
  };

  // 证据链综合（服务人员维度）
  evidenceScore: number;           // 0-6，有几个维度通过
  evidenceStatus: "all_pass" | "has_warning" | "has_failure";

  // 老人核查综合
  elderVerificationStatus: "pass" | "fail" | "inconclusive" | "missing";

  // AI 评估（服务完成后生成）
  aiAssessment?: {
    qualityScore: number;
    summary: string;
    anomalies: string[];
    recommendations: string[];
    // 新增：老人行为评估
    elderBehaviorSummary?: string;
    disabilityConsistency?: "consistent" | "suspicious" | "inconsistent";
  };

  // 实时数据存档
  transcriptLog?: TranscriptEntry[];
  aiGuidanceLog?: AIGuidanceEntry[];

  // 状态
  status: "in_progress" | "completed" | "cancelled";
  submittedAt?: string;
}

interface ServiceItemEntry {
  standardItemId: string;
  name: string;
  categoryName: string;
  referenceMinutes: number;
  checked: boolean;
}

interface TranscriptEntry {
  timestamp: string;
  speaker: "worker" | "elder" | "unknown";
  text: string;
}

interface AIGuidanceEntry {
  timestamp: string;
  type: "reminder" | "warning" | "guidance";
  message: string;
  triggeredBy: "radar" | "audio" | "timer" | "system";
  ttsPlayed: boolean;
}
```

### 2.6 设备管理 (Device)

设备分为两大类：
- **绑定服务人员的设备**: 毫米波雷达、智能工牌、手机App（手机App是抽象设备，管理的是登录账号密码）
- **绑定老人/家庭的设备**: 蓝牙信标（安装在老人家中）

```typescript
type DeviceType = "mmwave_radar" | "ble_beacon" | "smart_badge" | "phone_app";

interface Device {
  id: string;
  deviceCode: string;              // 硬件设备编码，或手机号/账号
  deviceType: DeviceType;
  orgId: string;
  siteId: string;
  status: "available" | "in_use" | "offline" | "low_battery" | "disabled";
  batteryPercent?: number;          // 硬件设备电量
  activatedAt?: string;
  lastSyncAt?: string;
  boundToType?: "worker" | "elder_home";
  boundToId?: string;
  boundToName?: string;
  // phone_app 专属字段
  appAccount?: { username: string; passwordSet: boolean; lastLoginAt?: string; };
  capabilities: string[];
}
```

### 2.7 服务人员扩展

基于现有 SocialWorker 模型，新增字段（非 breaking change）：

```typescript
// 新增字段
interface SocialWorkerExtension {
  qualificationLabels: string[];    // 已有，强化用途
  voiceprintRegistered: boolean;    // 新增
  favoriteElderIds?: string[];      // 常用服务对象（App快捷入口）
  maxElders?: number;               // 最大服务老人数（默认8）
}
```

---

## 三、页面设计

### 3.1 站点运营 Dashboard (operator) — Tab 结构

**现有 Tab**: 首页 | 服务人员 | 设备 | 长者 | 服务排期 | 服务记录

**新 Tab (9个)**:

| Tab | 路由 | 说明 | 状态 |
|-----|------|------|------|
| 首页总览 | `/` | 运营数据 + 异常高亮 + 额度使用概览 | 改造 |
| 服务人员 | `/workers` | 资质管理、声纹、常用服务对象 | 改造 |
| 设备管理 | `/devices` | 多类型设备（雷达/信标/工牌） | 改造 |
| 长者管理 | `/elders` | 长者信息 + 服务计划/服务包管理 | 改造 |
| 服务排班 | `/schedules` | 排班日历 + AI排班 + 医保约束校验 | **重大改造** |
| 进行中服务 | `/live` | 实时监控所有正在进行的服务 | **新增** |
| 已完成服务 | `/completed` | 服务记录 + 证据链 + 排班匹配分析 | **新增** |
| 回访管理 | `/followups` | 上门/电话/AI回访记录 | **新增** |
| 家属反馈 | `/feedback` | 反馈收集与处理 | **新增** |
| 培训管理 | `/training` | 服务人员培训与考核记录 | **新增** |

#### 3.1.1 首页总览

**运营数据 — "运营效率如何？"**（4 张 KPI 卡片）：
1. 本月总服务次数 — 值+次，显示环比变化百分比
2. 出动服务人员数量 — 值+人，显示环比变化百分比
3. 平均人效 — 值："X小时/人"（totalServices * 1.2 / workerCount），副标题："平均每位护工服务小时数"
4. 排班匹配率 — 值："X%"，副标题："实际服务与排班匹配度"

**质量数据 — "服务质量与合规程度如何？"**（4 张 KPI 卡片）：
1. 本月平均服务质量总分 — 值，副标题："满分 40"
2. 服务异常率 — 值："X%"，副标题："证据不匹配、缺失、违规的比例"
3. 进行中服务 — 纯数字无单位，副标题："目前进行中的服务有几项"
4. 表现最佳员工 — 员工名称，副标题："S 均分 X"

- **异常/待关注项置顶高亮**：证据链异常、排班偏离、额度即将到期
- **额度使用概览**：各老人本月额度使用进度条（25小时中已用N小时）
- 本周排班完成率
- 质量评分趋势

#### 3.1.2 服务人员

保留现有功能，新增：
- 资质标签管理（从主数据中选取）
- 声纹录入状态与入口
- 常用服务对象列表（软关联）
- **列表中显示绑定设备类型**（图标：雷达/工牌/手机App，快速扫览每人有哪些设备）
- **详情 drawer 新增「设备」tab**：显示该服务人员绑定的所有设备详情
  - 毫米波雷达：设备编码、状态、电量、最后同步时间
  - 智能工牌：设备编码、状态、电量
  - 手机App：账号、密码设置状态、最后登录时间
  - 每个设备可操作：解绑/绑定新设备

#### 3.1.3 设备管理

**统一管理所有设备类型的中心页面**：
- 设备类型筛选：全部 | 毫米波雷达 | 智能工牌 | 手机App | 信标
- 列表显示：设备编码、类型图标、状态、绑定对象（服务人员名 / 老人家中）、最后同步/登录时间
- **绑定关系**：
  - 雷达/工牌/手机App → 绑定服务人员
  - 信标 → 绑定老人家庭
- **手机App 特殊处理**：手机App 是抽象设备，管理的是登录账号密码（创建/重置密码/禁用）
- 设备状态监控（电量、在线/离线）
- 新增设备、绑定/解绑操作

#### 3.1.4 长者管理

长者详情 drawer 包含 4 个 Tab：**档案概览 | 服务计划 | 服务排班 | 服务历史**

**资格**固定显示"长护险"（目前仅支持一种）。

**头部操作**:
- ~~归档按钮~~：已移除
- "安排服务"按钮：点击后切换至"服务排班"tab（不再打开服务计划tab）

**档案概览 tab**: 保留现有长者基本信息 + 信标绑定信息（信标编码、状态、安装时间）。
- "照护重点"区域改名为"健康档案"，内容不变（风险标签、照护备注）

**服务计划 tab（静态套餐）**: 按杭州附件2标准格式展示，不含AI安排或排期信息：
- 基本信息区：姓名、性别、身份证号、现住地址、重度失能等级、联系人、定点长护服务机构、月度额度（25小时）、常用服务人员（建议，非硬约束）
- 服务项目表格：编号、服务项目、大类、参考时长(分钟)、服务频次、资质要求
- **数据来源**：从 `/api/standard-catalogs/hz-2024/items` 获取杭州市41项标准目录，根据长者 `serviceProjects` 匹配。如API不可用则使用前端内置的杭州41项静态数据
- 每位长者显示 5-8 项（匹配 + 补充常见项目如整理床单位、面部清洁、协助进食/水、协助如厕、失禁护理、翻身叩背排痰、关节活动练习等）
- 编辑按钮（可修改服务项目选择）

**服务排班 tab（完整日历视图）**: 显示该长者的排班日历，支持多视图：
- **视图切换**：日 | 周 | 月 三个按钮切换
- **导航栏**：< 今天 > 按钮在时间段间导航，显示当前时间段标签
- **周视图（默认）**：7列周日历，每格显示排班卡片（时间、服务人员、项目），卡片按状态着色，今日高亮
- **日视图**：单日时间线列表，显示所有排班详情（时间、项目、服务人员、状态标签）
- **月视图**：传统月历格子，有排班的日期显示蓝色圆点指示器，点击某天在下方展示该日排班详情
- **AI 安排服务区域**（可折叠）：
  - 文本输入区，placeholder "输入服务安排指令，如：每周一三五上午9点到11点上门"
  - 示例提示词芯片（可点击填入输入框）
  - "AI 生成排班"按钮：点击后显示 toast "AI正在生成..."，1.5s 后调用AI接口生成排班建议
  - 生成结果显示确认/取消操作
- 数据来源：从 `/api/service-schedule-occurrences` 获取，按长者ID过滤

**服务历史 tab**: 保留，显示已完成服务记录列表。

~~AI洞察 tab~~：已移除。

#### 3.1.5 服务排班（重大改造）

**这是本次改造的核心页面之一。**

**视图模式（三种）**:
- **列表视图（默认）**: 按时间排序的所有排班
- **日历视图**: 周日历，每列一天，时间格中显示排班卡片
- **地图视图**: 预留占位（"地图视图开发中"）

**筛选**:
- 工具栏包含两个筛选下拉框："按服务人员"和"按长者"
- 每个下拉框列出所有唯一值 + "全部"选项
- 两个筛选可同时生效，对所有视图统一过滤

**核心功能**:
- **AI 排班助手**: 基于所有老人的服务包和额度，自动生成推荐排班
- **周期性排班**: 创建重复规则（如每周一/三/五上午9点服务王奶奶）
- **单次排班**: 手动添加单次上门计划
- **排班编辑**: 拖拽调整时间、更换人员
- **医保约束校验**: 排班时自动检查地区性约束（单次工时、每周上门要求等），违反时显示警告

**排班卡片信息**:
- 老人姓名 + 地址
- 服务人员姓名
- 时间段
- 预估服务项目（可折叠）
- 状态标签（已排班/进行中/已完成/缺失）

#### 3.1.6 进行中服务（新增）

实时监控所有正在进行的服务。使用 `svc-table-*` CSS类（`svc-table__head--live` / `svc-table__row--live` 7列override）。

**工具栏**: 搜索（长者/服务人员）、站点筛选（admin可见）、日期范围筛选、服务人员筛选

**表格列**:

| # | 列标题 | 数据来源 | 说明 |
|---|--------|---------|------|
| 1 | 服务开始 | startedAt | HH:MM 格式 |
| 2 | 站点 | siteName | 站点名称 |
| 3 | 长者 | serviceObjectName（带头像） | — |
| 4 | 服务人员 | workerName | — |
| 5 | 证据链完整度 | evidenceChain | m/n 格式（pass数/总维度数） |
| 6 | AI异常提示 | evidenceChain + aiAssessment + elderVerification | 彩色标签（9种类型，见下方） |
| 7 | 发起飞检 | — | Video 图标按钮（lucide-react），点击 toast"飞检请求已发送" |

**AI异常提示标签规则（9种类型）**:

| 标签 | 颜色 | 触发条件 |
|------|------|----------|
| GPS不匹配 | 红色 | evidence.gps status = fail |
| GPS缺失 | 橙色 | evidence.gps status = missing |
| 信标缺失 | 橙色 | evidence.beacon status = missing |
| 语音缺失 | 橙色 | evidence.audio status = missing |
| 雷达缺失 | 橙色 | evidence.radar status = missing |
| 视觉缺失 | 橙色 | evidence.photo status = missing |
| 声纹不匹配 | 红色 | evidence.audio.voiceprintMatch = fail |
| 失能程度可疑 | 红色 | elderVerification.status = fail |
| 疑似违规行为 | 深红色 | aiAssessment 存在 anomalies |
| 正常 | 绿色 | 以上均无异常时显示 |

**详情视图（面包屑二级页面，非 popup）**:

- 点击表格行进入**全屏详情页**（条件渲染，非路由跳转，非 popup drawer）
- 顶部面包屑：`进行中服务 > {长者姓名} - 服务详情`，"进行中服务"可点击返回列表
- 面包屑样式：`.svc-breadcrumb` / `.svc-breadcrumb__link` / `.svc-breadcrumb__sep` / `.svc-breadcrumb__current`
- 面包屑下方：**7 Tab 详情内容**（`cs-tab-bar` + `SessionDetailPanel`）：

  1. **实时感知总揽**:
     - Part 1: 基本信息（3列网格）-- 所属机构"金色年华"、长者（参保人）、服务人员、服务日期、服务开始时间(HH:MM)、已进行时长（setInterval每秒自动更新）、服务地址（占满整行）
     - Part 2: 三个实时监控信号流（3等分列）-- 视觉信号（已接入:彩色div模拟视频/未接入:提示+飞检建议）、语音信号（已接入:CSS动画波形/未接入:同上）、雷达信号（已接入:脉冲雷达可视化/未接入:同上）。Mock: 3个信号中2个已接入
     - Part 3: 多维证据链（复用Tab 2的EvidenceChainCards组件）

  2. **多维证据链**:
     - 顶部摘要徽标："多维证据链完整度：m/n"
     - 6张证据卡片（3列网格，左边框颜色标识状态pass/fail/missing）:
       - GPS证据: 服务地址、开始打卡时间+地点、结束打卡"服务进行中..."
       - 信标证据: 信标设备ID(GY-S001)、信标打卡时间+ID
       - 视觉证据: 三态(绿/橙/灰) + "查看视觉信号->"跳转Tab 3
       - 音频证据: 三态 + "查看语音信号->"跳转Tab 4
       - 毫米波雷达证据: 三态 + "查看雷达信号->"跳转Tab 5
       - 服务照片证据: 照片数量或"当前未上传" + "查看照片详情->"跳转Tab 6

  3. **视觉证据详情**: 已接入:大面积视频占位(Play图标)+已录制时长; 未接入:"当前信号未接入"

  4. **语音证据详情**: 已接入:CSS动画波形+已录制时长; 未接入:"当前信号未接入"; AI识别模式(声纹匹配/脏话辱骂/激烈争吵)

  5. **雷达证据详情**: 已接入:左右双面板(实时人员位置+活动热力图); 未接入:"当前信号未接入"; AI识别模式(失能程度识别/运动轨迹识别)

  6. **照片证据详情**: 有照片:3张占位缩略图网格+上传时间; 无照片:"当前未上传照片"

  7. **飞行检查**: 未飞检:"发起飞检"大按钮+AI提醒(基于证据缺失自动生成文本); 已飞检:飞检记录(时间、形式人工/AI发起)

- Tab间支持互相跳转（证据卡片链接按钮触发setActiveTab）
- CSS类名前缀：`ls-detail-*`（新增约300行CSS到siteOperations.css）
- 信号连接状态由 session.evidenceChain 字段决定

#### 3.1.7 已完成服务（新增）

**表格布局与进行中服务完全一致**（共享 `svc-table-*` CSS类和 `serviceTableUtils.ts` 工具函数）。

**统一表格列**（与3.1.6相同）:

| # | 列标题 | 数据来源 | 已完成特殊处理 |
|---|--------|---------|--------------|
| 1 | 日期 | serviceDate | — |
| 2 | 长者 | serviceObjectName（带头像） | — |
| 3 | 服务人员 | workerName | — |
| 4 | 时长 | actualMinutes | 显示 N + "分钟" |
| 5 | 证据完整度 | evidenceChain → N/6 | 颜色：6/6绿、4-5黄、<4红 |
| 6 | 质量评分 | aiAssessment.qualityScore | 0-100分 + StatusBadge颜色 |
| 7 | 异常提示 | evidenceChain + aiAssessment + elderVerification | 彩色标签（规则同3.1.6） |

- 筛选：日期范围、证据状态（全通过/有异常）、服务人员、排班匹配（按排班/偏离/计划外）

**详情视图（面包屑二级页面，非 popup）**:

- 点击表格行进入**全屏详情页**（条件渲染，非路由跳转，非 popup drawer）
- 顶部面包屑：`已完成服务 > {长者姓名} - 服务详情`，"已完成服务"可点击返回列表
- 面包屑样式：复用 `.svc-breadcrumb` / `.svc-breadcrumb__link` / `.svc-breadcrumb__sep` / `.svc-breadcrumb__current`
- 面包屑下方：**7 Tab 详情内容**（`cs-tab-bar` + `CompletedDetailPanel`）：

  Tab类型：`"tab_summary" | "tab_evidence" | "tab_visual" | "tab_audio" | "tab_radar" | "tab_photos" | "tab_inspection"`

  1. **服务总结**: 基本信息（6列紧凑网格：所属机构/长者/服务人员/服务日期/开始时间/服务时长/服务地址）+ 六维证据链卡片（完成态："已获取 XX分钟"/"缺失"，无实时信号）+ AI服务总结（高亮框摘要文本）+ 排班对比（计划时间vs实际时间、匹配状态、时间偏差）+ 服务项目对比（预估vs确认、标记差异）+ 工时分析（实际vs参考、医保约束60-120分钟、合规状态）
  2. **六维证据链**: 与进行中服务Tab 2结构一致，所有状态为最终态（"已获取 XX分钟"/"缺失"），跨Tab跳转按钮保留
  3. **视觉证据详情**: 有数据:录像回放占位+录制总时长; 无数据:"本次服务未获取视觉数据"
  4. **语音证据详情**: 有数据:录音回放占位+完整ASR文字日志（带搜索框过滤）+AI识别结果（声纹匹配/脏话辱骂/激烈争吵，绿/红终态）; 无数据:"本次服务未获取语音数据"
  5. **雷达证据详情**: 有数据:左右双面板（全程轨迹回放含进度条+活动热力图）+AI识别结果（失能程度/运动轨迹，绿/红终态）; 无数据:"本次服务未获取雷达数据"
  6. **照片证据详情**: 有照片:3张占位缩略图网格+上传时间; 无照片:"未上传照片"
  7. **飞行检查**: 无"发起飞检"按钮（服务已完成）; 有飞检:记录（时间、形式、结果）; 无飞检:"本次服务未进行飞检"; AI事后总结（基于证据完整度生成摘要文本）

- Tab间支持互相跳转（证据卡片链接按钮触发setActiveTab）
- CSS类名复用：`ls-detail-*` + `svc-detail-page` + `svc-breadcrumb` + `cs-tab-bar`
- 与进行中服务视觉风格一致，仅内容为完成后分析视角

#### 3.1.8 回访管理（新增）

- 三种类型：上门回访 | 人工电话回访 | AI电话回访
- 列表：时间、类型、执行人、对应长者、结论摘要、状态
- 新建/编辑回访

#### 3.1.9 家属反馈（新增）

- 数据来源：Family H5 页面已有反馈提交入口
- 列表：时间、家属、长者、服务人员、渠道、情感、状态
- 详情：反馈内容 + 措施记录

#### 3.1.10 培训管理（新增）

记录每个服务人员完成的培训和考核记录。

**列表页**:
- 表格列：服务人员 | 培训项目（哪个服务项目）| 子模式（引导/督导/考核）| 完成时间 | 状态（已完成/进行中/未通过）| 得分（仅考核模式，AI评判的SOP遵守程度分数）
- 筛选：按服务人员 | 按服务项目 | 按模式类型（引导/督导/考核）
- 考核记录的得分用颜色编码（≥80绿，60-79橙，<60红）

**统计摘要**（页面顶部）:
- 总培训完成次数
- 考核平均得分
- 考核通过率（≥60分视为通过）
- 最活跃培训人员

---

### 3.2 集团总部 (admin) — 设计思路

**集团总部关注什么**: 跨站点的运营效率、质量一致性、合规风险、财务健康度

**现有 Tab**: 质量总览 | 规范管理 | 站点管理 | 用户管理 | 飞书管理

**建议调整**:

| Tab | 路由 | 说明 | 状态 |
|-----|------|------|------|
| 运营总览 | `/admin` | 跨站点 KPI：服务总量、额度使用率、排班符合率、证据通过率、质量评分 | 改造（原质量总览） |
| 服务目录管理 | `/admin/catalog` | 标准目录维护 + 医保约束规则管理 | **新增** |
| 进行中服务 | `/admin/live` | 复用站点运营的 LiveServicesArea，增加站点筛选下拉 | **新增** |
| 已完成服务 | `/admin/completed` | 复用站点运营的 CompletedServicesArea，增加站点筛选下拉 | **新增** |
| 服务标准管理 | `/admin/sop` | SOP/督导/引导/报告策略 + 培训模式配置（原规范管理重命名重组织） | 改造 |
| 站点管理 | `/admin/sites` | 保留 | 保留 |
| 用户管理 | `/admin/users` | 保留 | 保留 |

**服务标准管理 — 培训模式（第四种 AI 配置）**:

现有三种 AI 辅助配置（SOP/督导/引导）基础上，新增第四种"培训模式"配置。每个服务项目可配置三种培训子模式：
- **培训引导配置**：定义详细的语音引导话术和步骤序列
- **培训督导配置**：定义督导评判标准（哪些关键步骤必须提到、哪些操作必须完成）
- **考试模式配置**：定义评分标准（各步骤权重、通过分数线、扣分规则）

**运营总览 KPI 卡片**:

运营数据 — "运营效率如何？"（4 张卡片）：
1. 本月总服务次数 — 值+次，显示环比变化百分比
2. 出动服务人员数量 — 值+人，显示环比变化百分比
3. 平均人效 — 值："X小时/人"（totalServices * 1.2 / workerCount），副标题："平均每位护工服务小时数"
4. 排班匹配率 — 值："X%"，副标题："实际服务与排班匹配度"

质量数据 — "服务质量与合规程度如何？"（4 张卡片）：
1. 本月平均服务质量总分 — 值，副标题："满分 40"
2. 服务异常率 — 值："X%"，副标题："证据不匹配、缺失、违规的比例"
3. 进行中服务 — 纯数字无单位，副标题："目前进行中的服务有几项"
4. 表现最佳站点 — 站点名称，副标题："S 均分 X"

**运营总览详细展示**:
- 各站点额度使用率对比（哪个站点浪费最多）
- 各站点排班符合率对比
- 各站点证据链通过率对比
- 异常服务汇总（跨站点）
- 服务人员效率排名（利用率）

**服务目录管理**:
- 维护多套标准目录（国家/地方）
- 每套目录下管理医保隐性约束规则
- 服务项目列表（按大类分组）
- 资质主数据维护

---

### 3.3 服务审计入口 (auditor)

**定位**: 跨站点/跨机构的审计监管入口，聚焦服务真实性验证 + 合规评级 + 不同实体间的差异对比

**前提假设**: 可能存在多个站点、多个机构、或机构下的加盟合作机构，都需要纳入管理。

**3 个 Tab**: 审计总揽 | 机构与站点 | 服务审计

#### 3.3.1 审计总揽 (`/gov`)

**Header**: 标题"审计总揽"，右侧两个全局筛选下拉（时间：今日/本周/本月/全部；机构：全部机构/金色年华/康乐居家/夕阳红），影响页面所有数据。

**Section 1 — 服务数据**（4 张 KPI 卡片一行）:
1. 已完成服务 — 数值+时间段副标题
2. 服务参保人数量 — 数值
3. 六维度交叉核查通过率 — 百分比，颜色规则：>85%绿色、>70%橙色、其他红色
4. 异常服务数量 — 数值，红色

**Section 2 — 异常与预警 - 服务**:
- 表格列：异常服务流水号 | 服务机构 | 服务人员 | 参保人(长者) | 异常类型 | AI总结异常信息
- 异常类型彩色徽标：证据缺失(橙)、证据异常(红)、证据可疑(黄)、违规行为(深红)
- 点击行 -> 弹出抽屉(sw-scrim + sw-drawer cs-drawer--wide)，从 `/api/gov/audit/:sessionId` 获取数据，显示 AuditDetail 组件

**Section 3 — 异常与预警 - 参保人**:
- 表格列同 Section 2，异常类型固定为"失能等级可疑"(红色徽标)
- AI 总结示例：雷达数据显示参保人活动能力与申报失能等级不符
- 点击行 -> 同样打开 AuditDetail 弹出抽屉

#### 3.3.2 机构与站点 (`/gov/institutions`)

- 机构/站点列表：名称、所属关系（总部/加盟）、服务规模、证据通过率、异常率、质量评分
- 点击下钻到单个机构/站点：
  - 基本信息
  - 服务人员列表及资质概况
  - 服务量统计（月度/周度）
  - 证据通过率趋势
  - 该机构/站点的异常服务列表
- 跨机构横向对比：选择多个实体对比同一指标

#### 3.3.3 服务审计 (`/gov/audit`)

**KPI 摘要卡片（4 张一行，填满屏幕宽度）**:
1. 证据链异常率 — 证据链有缺失/不匹配的比例，>10%标红
2. 失能核查异常率 — 老人失能核查可疑的比例
3. 人员配比违规数 — 护工服务老人数超过1:8上限的人数，副标题"护工超过1:8上限"
4. 时长合规率 — 服务时长在60-120分钟范围内的比例，副标题"符合60-120分钟要求"

**筛选栏**:
- 日期范围（起止日期）
- 机构筛选
- 站点筛选
- 风险等级下拉：全部 | 高风险 | 关注 | 正常
- 合规评级下拉：全部 | A | B | C | D
- 配比违规复选框："仅显示超标人员"
- 随机抽查按钮

**表格列（9列，使用 svc-table 同构模式）**:
1. 日期 — serviceDate
2. 机构/站点 — 机构名+站点名（如"金色年华/阳光社区"）
3. 长者 — serviceObjectName
4. 服务人员 — workerName + "(N/8)"显示当前护工服务老人数/上限，N>8标红
5. 时长 — actualMinutes + "分钟"，<60或>120标红
6. 证据链 — N/6 通过数/总数，颜色编码（全通过绿色、部分黄色、严重不足红色）
7. 失能核查 — 通过(✓)/可疑(✗)/数据不足(—) 独立列
8. 合规评级 — A/B/C/D 徽章。A(绿)=全部通过+时长合规+配比合规；B(蓝)=轻微问题；C(橙)=证据缺失；D(红)=严重违规
9. 风险标记 — 高风险(红，多项异常)/关注(黄，单项问题)/正常(绿)

**详情弹窗（popup drawer，6 tab 结构）**:
1. 服务总揽 — 基本信息 + 核查摘要（4列卡片：服务人员核查/失能核查/AI评分/风险识别）+ 排班对比
2. 服务人员多维核查 — GPS/信标/声纹/录音/雷达/照片 六维度详情卡片
3. 长者失能核查 — 失能等级申报 vs 雷达观测 + 热力图 + 动态回放
4. 录音与对话 — ASR 文字日志 + 音频播放器
5. 服务质量 — AI 评分 + 项目对比 + 违规识别
6. 检查信息 — 飞检记录（如有）

注：不含回访/家属反馈 tab（审计员不需要查看）。

---

### 3.4 护工/护士 App (Careworker H5) — 重构

**4 个 Tab**:

#### Tab 1: 今日排班（首页）

- 登录后首页显示**今天的排班列表**（来自排班系统）
- 每张卡片：时间段 + 老人姓名 + 地址 + 预估项目 + 状态
- 一键点击排班卡片 → 进入服务流程
- 底部「计划外服务」入口 → 可手动选择老人开始服务（偏离排班场景）
- 周日历条：左右滑动查看本周排班概览

#### Tab 2: 服务流程

**任务预估页**（参考泰照护截图）:
1. 老人基本信息：姓名、地址、电话
2. 服务项目预估列表（从服务包中勾选，按大类分组）
3. 底部统计：已选 N 项 | 合计工时 N 分钟
4. 「接受服务」按钮
5. **注意**：这里是"预估"，服务结束时可以再确认

**验证页**:
1. GPS 定位核对（地图 + 状态标签），手动触发
2. 蓝牙信标检测，手动触发
3. 两项通过 → 「开始服务」按钮亮起
4. 验证失败 → 允许跳过但标记异常

**服务模式页**（分层折叠布局）:
1. **核心层（始终可见）**：计时器 + 录音状态（绿色圆点）+ 证据状态图标组 + AI督导提示区
2. **详情层（可展开）**：ASR实时文字日志 + 雷达连接状态 + GPS打点状态
3. 「结束服务」按钮

**结束确认页**:
1. 服务项目再确认（可调整：新增/移除项目）
2. 实际工时展示，与项目参考工时对比
3. 工时偏差时显示警告（但允许提交）
4. 拍照上传（老人照片）
5. 「提交」按钮

#### Tab 3: 服务记录

- 已完成服务历史列表
- 按日期分组
- 每条显示：老人、时间、工时、项目数、证据评分

#### Tab 4: 学习中心

- **通用标准**：行为规范文档
- **长护险服务项目清单**：按大类分组显示所有服务项目（只显示自己有资质的项目），每项显示 SOP 内容
- **培训入口**：点击某个服务项目后，可选择三种培训子模式：
  - **培训引导**：AI 详细语音引导服务流程，一步一步带着做
  - **培训督导**：服务人员边做边说，AI 给出实时督导反馈
  - **培训考核**：服务人员口头说明流程步骤，AI 进行打分
- 完成任何一种模式后，记录自动上报到 operator dashboard
- 考核模式额外生成 AI 评分（SOP 遵守程度）
- 护工 App 本身不保存培训记录，方便反复训练

---

## 四、路由变更

```typescript
const routes = [
  // Auth
  { path: "/login", element: <LoginPage /> },

  // 站点运营 (operator + org_admin)
  { path: "/", element: <HomeArea /> },
  { path: "/workers", element: <WorkersArea /> },
  { path: "/devices", element: <DevicesArea /> },
  { path: "/elders", element: <EldersAndPlansArea /> },
  { path: "/schedules", element: <SchedulesArea /> },      // 保留但重大改造
  { path: "/live", element: <LiveServicesArea /> },          // 新增
  { path: "/completed", element: <CompletedServicesArea /> },// 新增
  { path: "/followups", element: <FollowUpsArea /> },        // 新增
  { path: "/feedback", element: <FamilyFeedbackArea /> },    // 新增

  // 护工 App
  { path: "/careworker/*", element: <CareworkerApp /> },

  // 集团总部 (admin)
  { path: "/admin", element: <QualityLayout /> },
  { path: "/admin/catalog", element: <CatalogManagement /> },// 新增
  { path: "/admin/sop", element: <SopManagement /> },        // 改造
  { path: "/admin/sites", element: <SiteManagement /> },
  { path: "/admin/users", element: <UserManagement /> },

  // 服务审计入口 (gov_auditor)
  { path: "/gov", element: <GovOverview /> },
  { path: "/gov/institutions", element: <GovInstitutions /> }, // 新增：机构与站点
  { path: "/gov/audit", element: <GovAudit /> },

  // Family H5
  { path: "/family/*", element: <FamilyPage /> },
];
```

---

## 五、三个视角的设计对比

| 维度 | 站点运营 (operator) | 集团总部 (admin) | 服务审计 (auditor) |
|------|-------------------|-----------------|-------------------|
| **核心关注** | 日常运营效率 | 跨站点管理 + 标准制定 | 服务真实性验证 + 跨机构/站点差异监管 |
| **排班** | 排班管理（创建/编辑/AI优化） | 排班符合率统计 | 不直接看排班 |
| **服务监控** | 实时监控 + 飞检 | 异常服务汇总 | 不实时监控 |
| **服务记录** | 完整记录 + 操作 | 跨站点统计 | 六维度证据链核查（可按机构/站点筛选） |
| **证据链** | 实时状态 + 异常处理 | 通过率统计 | 逐条逐维度审核 + 跨实体对比 |
| **额度** | 每个老人的额度管理 | 各站点额度使用率对比 | 不关注额度 |
| **质量** | 单次服务质量 | 跨站点质量对比 | 跨机构质量对比 + 趋势 + 抽查 |
| **机构/站点** | 本站点数据 | 管理所有站点 | 跨机构/站点横向对比、下钻到单个实体 |
| **数据深度** | 最细粒度（单次服务） | 聚合统计 | 按机构→站点→单次服务逐级下钻 |

---

## 六、与现有代码的关系

### 6.1 保留并改造

| 现有模块 | 改造内容 |
|---------|---------|
| `ServiceScheduleOccurrence` 模型 | 扩展为 `ServiceSchedule`，增加排班来源、周期性规则、执行回填 |
| `SchedulesArea` 页面 | 重大改造：新增 AI 排班、医保约束校验、额度监控 |
| `ServiceRecord` 模型 | 扩展证据链字段、排班关联、项目确认机制 |
| `SocialWorker` 模型 | 新增资质、声纹、常用服务对象字段 |
| `SmartBadge` | 泛化为 `Device`（多类型） |
| `CareworkerPage` | 重构为 4 Tab + 完整服务流程 |

### 6.2 新增

| 新模块 | 说明 |
|--------|------|
| `ServiceStandardCatalog` + 相关模型 | 标准目录体系 |
| `QualificationTag` | 资质主数据 |
| `PolicyConstraint` | 医保约束规则 |
| `RecurringScheduleRule` | 周期性排班规则 |
| `LiveServicesArea` | 进行中服务实时监控 |
| `CompletedServicesArea` | 已完成服务 + 证据链 |
| `FollowUpsArea` | 回访管理 |
| `FamilyFeedbackArea` | 家属反馈 |
| `GovAuditLayout` + 页面 | 服务审计入口 |
| `CatalogManagement` | 服务目录管理 |

### 6.3 废弃

| 废弃项 | 原因 |
|--------|------|
| 原 RecordsArea 的 "recordings" viewMode | 录音作为服务记录的子数据 |

---

## 七、待决策项

| # | 决策项 | 上下文 |
|---|--------|--------|
| D1 | ServiceRecord 的实时数据（ASR/雷达）存储策略 | 嵌入记录 vs 独立存储关联？需架构师评估 |
| D2 | AI 排班助手的实现方式 | 后端 AI 生成 vs 前端调用 LLM API？ |
| D3 | AI 督导策略需要支持多源信号 | GPS+雷达+录音的融合决策，当前架构待评估 |
| D4 | 声纹采集时机和方式 | 录入服务人员时采集，具体 UI/硬件方案待定 |
| D5 | 医保导出格式 | 服务记录导出为医保报销格式，具体字段待定 |
| D6 | 培训 Copilot 功能定义 | App 学习中心的 AI 陪练功能，scope 待定 |
