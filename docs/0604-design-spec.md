# 0604 增量设计规格 (Design Spec)

> 基于 `docs/0604版本调整原始需求输入.md` 的 10 条 input，结合现有代码库分析和前提验证，定义本次增量改动的需求、数据模型、UI 原型和功能特性。

**日期**: 2026-06-04
**状态**: Draft — 待 review
**开发模式**: 设计先行，实施待定（架构师 review 后再启动实施）

---

## 一、改动总览

本次改动分为 **5 个工作流**，按优先级排列：

| # | 工作流 | 影响范围 | 复杂度 |
|---|--------|---------|--------|
| W1 | 标准目录体系 + 服务计划重构 | 数据模型、mock、多个页面 | 高 |
| W2 | 服务人员角色体系扩展 | 数据模型、权限、App | 中 |
| W3 | 站点运营 Dashboard Tab 重组 | 站点运营布局、新增4个Tab | 高 |
| W4 | 护工/护士 App 重构 | careworker H5 页面 | 高 |
| W5 | 医保局审计入口（全新） | 新 layout、routing、2个页面 | 中 |

---

## 二、数据模型变更

### 2.1 新增：标准目录 (ServiceStandardCatalog)

系统需要维护多套长护险标准目录（国家标准、地方标准）。

```typescript
interface ServiceStandardCatalog {
  id: string;
  name: string;                    // "杭州市长护险标准" | "国家长护险标准"
  region: string;                  // "hangzhou" | "national"
  version: string;                 // "2024-v1"
  effectiveDate: string;
  status: "active" | "archived";
  categories: ServiceCategory[];
  totalItems: number;              // 41 | 36
}

interface ServiceCategory {
  id: string;
  catalogId: string;
  name: string;                    // "清洁卫生类" | "营养摄取类" | ...
  sortOrder: number;
}

interface ServiceStandardItem {
  id: string;
  catalogId: string;
  categoryId: string;
  itemCode?: string;               // 国家标准18位编码（如有）
  seq: number;                     // 项目编号 1-41
  name: string;                    // "整理床单位" | "面部清洁" | ...
  categoryName: string;            // 大类名称（冗余方便显示）
  referenceMinutes: number;        // 单次服务参考时间（分钟）
  frequency: string;               // "1-2次/日" | "必要时" | "1次/周"
  description?: string;            // 项目内涵
  serviceRequirements?: string;    // 基本服务要求
  notes?: string;                  // 注意事项
  requiredQualification: "caregiver" | "nurse" | "any";  // 资质要求
}
```

**Mock 数据要求**: 需要完整录入杭州41项 + 国家36项标准数据。

### 2.2 重构：服务计划 (ServicePlan)

原有的 ServicePlan 基于自由定义的排班逻辑（cadenceRule/cadenceLabel），需改为**基于标准目录的约束型服务计划**。

```typescript
interface ServicePlan {
  id: string;
  serviceObjectId: string;         // 对应长者
  catalogId: string;               // 使用哪套标准目录
  preferredWorkerId?: string;      // 常用服务人员（仅供参考，非硬约束）
  status: "active" | "paused" | "archived";
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;             // 审批人
  items: ServicePlanItem[];        // 计划中的服务项目
}

interface ServicePlanItem {
  id: string;
  planId: string;
  standardItemId: string;          // 关联标准目录项
  standardItemName: string;        // 冗余：项目名称
  categoryName: string;            // 冗余：大类名称
  referenceMinutes: number;        // 参考工时
  frequency: string;               // 计划频次（可能与标准不同）
  requiredQualifications: string[];// 所需资质标签列表（如 ["护士"]）
  notes?: string;                  // 个性化备注
}
```

**与旧模型的差异**:
- 去掉 `cadenceRule`、`cadenceLabel`、`preferredTimeWindow`（不再做时间排班）
- 去掉 `sopLinks`（SOP 概念被标准目录替代）
- 新增 `catalogId` 关联标准目录
- 新增 `items[]` 关联具体服务项目
- `primaryCaregiverId` / `primaryNurseId` → `preferredWorkerId`（常用服务人员，可选，非硬约束）
- 资质要求从固定枚举改为资质标签列表 `requiredQualifications: string[]`

---

#### 架构师参考：ServicePlan 新旧模型对比

> 本节供架构师评估数据模型迁移方案。

**旧模型 (当前代码中的 ServicePlan)**

```typescript
// 来源: src/features/siteOperations/contracts.ts + mock/data.ts
interface ServicePlan_OLD {
  id: string;
  serviceObjectId: string;
  serviceProject: string;              // 单个服务项目名称（自由文本）
  cadenceRule: string;                 // 排班规则，如 "weekly:mon,wed,fri"
  cadenceLabel: string;                // 排班描述，如 "每周一/三/五"
  preferredTimeWindow: {               // 偏好时间窗口
    start: string;                     // "09:00"
    end: string;                       // "10:30"
    label?: string;                    // "上午"
  };
  startDate: string;
  endDate?: string;
  description?: string;
  primarySocialWorkerId?: string;      // 固定服务人员
  status: "active" | "paused" | "archived";
  exceptions: ServicePlanException[];  // 排期例外
  sopLinks?: SopLink[];                // 关联SOP
}
```

**新模型 (本次设计)**

```typescript
interface ServicePlan_NEW {
  id: string;
  serviceObjectId: string;
  catalogId: string;                   // 关联标准目录（国家/杭州）
  preferredWorkerId?: string;          // 常用服务人员（软关联，非硬约束）
  status: "active" | "paused" | "archived";
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
  items: ServicePlanItem[];            // 多个标准服务项目
}
```

**核心差异分析**:

| 维度 | 旧模型 | 新模型 | 变更原因 |
|------|--------|--------|---------|
| **服务项目** | 单个自由文本 `serviceProject` | 多个标准目录项 `items[]` | 长护险服务计划是"套餐"——从标准目录中选择多个项目 |
| **时间排班** | `cadenceRule` + `preferredTimeWindow`（系统预排班） | **无** | 实际业务中护工和老人自行约定时间，系统不做预排班 |
| **排期例外** | `exceptions[]`（排班的临时调整） | **无** | 无排班则无例外 |
| **SOP关联** | `sopLinks[]` | 通过 `standardItemId` 隐式关联标准目录的服务规范 | SOP 被标准目录的服务要求/注意事项替代 |
| **人员绑定** | `primarySocialWorkerId`（固定绑定） | `preferredWorkerId`（软关联，仅供参考） | 实际服务权限由资质匹配决定，固定绑定只是管理便利 |
| **1:1 vs 1:N** | 一个 Plan = 一个服务项目 | 一个 Plan = 多个服务项目 | 一个老人有一份服务计划，包含多个可选项目 |

**迁移影响**:
- 旧模型中一个老人可能有多条 ServicePlan（每个项目一条），新模型中一个老人只有一条 ServicePlan（包含多个 items）
- 旧模型的 `ServiceScheduleOccurrence`（排班实例）在新模型中不再需要
- 旧模型的 `ServicePlanException` 在新模型中不再需要
- 前端所有读取 ServicePlan 的页面都需要适配新结构

### 2.3 调整：服务人员 (SocialWorker) — 资质驱动，非角色驱动

> **设计原则 (来自 Review 修正 R1)**：不修改 worker 的底层数据结构和系统定义。通过"资质标签"作为中间层解耦人员和服务权限。"谁可以服务谁"由资质匹配决定，不由硬编码角色决定。

现有 `qualificationLabels` 字段已存在，只需强化其用途，新增少量字段。

```typescript
interface SocialWorker {
  // ... 保留所有现有字段（id, name, phone, siteId, workerType, status, etc.）...
  qualificationLabels: string[];    // 现有字段，强化用途。如 ["养老护理员(初级)", "护士", "急救证"]
  voiceprintRegistered: boolean;    // 新增：是否已录入声纹
  favoriteElderIds?: string[];      // 新增：常用服务对象列表（App侧快捷入口，非硬约束）
}
```

**资质匹配逻辑**（替代硬编码角色权限）:
- 服务项目定义所需资质标签（如 "药物管理" → `requiredQualifications: ["护士"]`）
- Worker 持有资质标签（如 `qualificationLabels: ["护士", "养老护理员(中级)"]`）
- 匹配规则：Worker 的 `qualificationLabels` 包含项目的 `requiredQualifications` 中至少一个 → 可以执行该项目
- 无资质要求的项目（`requiredQualifications: []`）→ 所有 worker 可执行

**"常用服务对象"机制**（替代硬编码人员绑定，来自 Review 修正 R2）:
- `favoriteElderIds` 是 App 侧的快捷列表，护工自行管理
- 服务计划的 `preferredWorkerId` 是管理侧的建议人选
- 两者均为软关联，不构成硬约束
- 实际服务时，只要资质匹配，护工可以搜索并选择任何老人（应对请假替换等场景）

### 2.4 泛化：设备管理 (Device)

现有 SmartBadge 概念保留，但需要泛化为**多类型设备**统一管理。

```typescript
type DeviceType = "smart_badge" | "mmwave_radar" | "ble_beacon" | "smart_watch";

interface Device {
  id: string;
  deviceCode: string;              // 设备编码 "GY-B001" | "GY-R001" | "GY-S001"
  deviceType: DeviceType;
  orgId: string;
  siteId: string;
  siteName: string;
  status: "pending_activation" | "available" | "in_use" | "offline" |
          "low_battery" | "sync_delayed" | "lost" | "disabled";
  batteryPercent?: number;
  activatedAt?: string;
  lastSyncAt?: string;

  // 绑定关系：不同设备类型绑定不同实体
  boundToType?: "worker" | "elder_home";
  boundToId?: string;              // 护工ID 或 长者ID
  boundToName?: string;

  // 设备能力标记
  capabilities: DeviceCapability[];
}

type DeviceCapability =
  | "audio_recording"    // 录音
  | "audio_playback"     // 喇叭/TTS播放
  | "mmwave_sensing"     // 毫米波感知
  | "ble_proximity"      // 蓝牙近场
  | "network_call"       // 网络通话
  | "gps_location";      // GPS定位
```

**设备类型说明**:

| 类型 | 绑定对象 | 核心能力 | 用途 |
|------|---------|---------|------|
| smart_badge | 护工 | 录音、GPS | 服务录音证据 |
| mmwave_radar | 护工 | 毫米波感知、录音、喇叭、网络通话 | 实时监控、AI督导 |
| ble_beacon | 老人家中 | 蓝牙近场 | 到场验证 |
| smart_watch | 护工（未来） | 录音、GPS | 轻量化录音设备 |

### 2.5 新增：服务会话 (ServiceSession)

一次上门服务的完整会话记录。替代原有的排班思路。

```typescript
interface ServiceSession {
  id: string;
  serviceDate: string;
  serviceObjectId: string;
  serviceObjectName: string;
  serviceObjectAddress: string;
  workerId: string;
  workerName: string;
  workerQualifications: string[];   // 执行服务时该 worker 持有的资质快照
  planId: string;                   // 关联服务计划

  // 任务项（从服务计划中勾选）
  selectedItems: SelectedServiceItem[];
  estimatedMinutes: number;         // 预估工时

  // 生命周期状态
  status: "items_selected" | "verifying" | "in_progress" | "completed" | "cancelled";

  // 验证环节
  verification: {
    gpsMatch: boolean | null;
    gpsWorkerLat?: number;
    gpsWorkerLng?: number;
    gpsElderLat?: number;
    gpsElderLng?: number;
    bleBeaconMatch: boolean | null;
    bleBeaconId?: string;
    voiceprintMatch?: boolean | null;
    verifiedAt?: string;
  };

  // 时间戳
  startedAt?: string;              // 开始服务
  completedAt?: string;            // 结束服务
  submittedAt?: string;            // 提交（含拍照）

  // 实时数据（服务进行中）
  realtimeData?: {
    audioStatus: "recording" | "paused" | "error";
    radarStatus: "connected" | "disconnected";
    radarDeviceId?: string;
    transcriptLog: TranscriptEntry[];     // 实时ASR日志
    aiGuidanceLog: AIGuidanceEntry[];     // AI督导提示
  };

  // 结束后数据
  completionPhoto?: string;        // 拍照URL
  actualMinutes?: number;          // 实际工时

  // 证据链
  evidenceChain: {
    gps: boolean;
    bleBeacon: boolean;
    voiceprint: boolean;
    audioRecording: boolean;
    radarData: boolean;
    photo: boolean;
  };

  // AI评估（服务完成后生成）
  aiAssessment?: {
    qualityScore: number;          // 0-100
    summary: string;
    itemCompletionRate: number;    // 项目完成率
    anomalies: string[];
    recommendations: string[];
  };
}

interface SelectedServiceItem {
  standardItemId: string;
  name: string;
  categoryName: string;
  referenceMinutes: number;
  frequency: string;
  checked: boolean;                // 护工勾选
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

---

#### 架构师参考：ServiceSession 新旧模型对比

> 本节供架构师评估。ServiceSession 是本次最大的新增概念，它替代了旧模型中 ServiceScheduleOccurrence + ServiceRecord 的组合。

**旧模型：排班实例 (ServiceScheduleOccurrence) + 服务记录 (ServiceRecord)**

旧模型将一次服务拆成两个阶段性实体：

```typescript
// 阶段1: 排班实例 — 系统预排班生成，服务发生前就存在
interface ServiceScheduleOccurrence_OLD {
  id: string;
  source: "service_plan" | "one_time";
  servicePlanId?: string;
  serviceObjectId: string;
  serviceObjectName: string;
  serviceProject: string;               // 单个服务项目
  addressSnapshot: string;
  serviceDate: string;                  // 预排的日期
  timeWindow: { start, end, label? };   // 预排的时间窗口
  assignedSocialWorkerId?: string;      // 预排的服务人员
  status: "unassigned" | "scheduled" | "in_progress" | "cancelled" | "completed";
  serviceRecordId?: string;             // 完成后关联到记录
  riskTags: string[];
}

// 阶段2: 服务记录 — 服务完成后由录音设备+后台处理生成
interface ServiceRecord_OLD {
  id: string;
  serviceDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  socialWorkerId?: string;
  serviceObjectId?: string;
  badgeId: string;                      // 录音设备编码
  smartBadgeId?: string;
  serviceProject?: string;              // 单个服务项目
  assignmentConfidence: number;         // 录音-排班匹配置信度
  reviewStatus: "confirmed" | "needs_review" | "info_incomplete" | "exception_open";
  exportStatus: "not_ready" | "exportable" | "exported" | "exported_with_flags";
  serviceExceptions: ServiceException[];
  serviceItems?: ServiceItem[];         // SOP检查项
  sopGroups?: SopGroup[];
  expectedSops?: Array<{ sopId, sopName }>;
  audioAssetId: string;
  transcriptId: string;
  structuredSummary: string;
  generatedSummary?: string;
  exportHistory: ServiceRecordExportHistory[];
}
```

**旧模型的核心假设（已被业务验证为不正确）**:
1. 系统预排班 → 护工按排班执行 → 录音自动匹配到排班实例
2. 排班和服务记录是两个独立实体，通过 `serviceRecordId` 事后关联
3. 录音设备是唯一的服务证据来源，需要"匹配置信度" (`assignmentConfidence`)
4. 服务项目是单个的（一次排班 = 一个项目）

**新模型：ServiceSession — 一次完整的上门服务会话**

```typescript
interface ServiceSession_NEW {
  // （完整定义见 2.5 节）
  // 核心变化：
  id: string;
  planId: string;                       // 关联服务计划（不是排班）
  selectedItems: SelectedServiceItem[]; // 多个勾选的服务项目（不是单个）
  status: "items_selected" | "verifying" | "in_progress" | "completed" | "cancelled";
  verification: { gps, bleBeacon, voiceprint };  // 多维验证（不是事后匹配）
  realtimeData?: { audio, radar, transcript, aiGuidance };  // 实时数据（不是事后处理）
  evidenceChain: { gps, ble, voiceprint, audio, radar, photo };  // 六重证据链
  aiAssessment?: { qualityScore, summary, anomalies };  // AI质量评估
}
```

**核心差异分析**:

| 维度 | 旧模型 | 新模型 | 变更原因 |
|------|--------|--------|---------|
| **生命周期** | 两个实体：排班(预) + 记录(后) | 一个实体：会话，覆盖全生命周期 | 实际业务中护工自主安排时间，不存在"预排班"环节 |
| **触发方式** | 系统根据排班规则自动生成排班实例 | 护工在 App 中主动选择老人并发起 | 服务时间由护工和老人商量决定，系统不预排 |
| **服务项目** | 单个 `serviceProject`（每次排班对应一个项目） | 多个 `selectedItems[]`（从服务计划中勾选多项） | 长护险一次上门通常执行多个项目 |
| **人员匹配** | 事后通过录音设备匹配 (`assignmentConfidence`) | 事前由护工主动选择老人，资质校验即时完成 | App 流程中护工先选老人再开始，无需事后猜测 |
| **到场验证** | 无（依赖录音设备是否在场推断） | GPS + 蓝牙星标 + 声纹，三重验证 | 医保局合规要求，防止虚假服务 |
| **证据来源** | 单一来源：SmartBadge 录音 | 多来源：手机录音、雷达、工牌等多种设备 | 设备类型多样化，需要统一管理 |
| **实时性** | 无实时数据，全部事后处理 | 服务进行中有实时 ASR 日志、雷达数据、AI 督导 | 站点运营需要实时监控能力 |
| **质量评估** | `reviewStatus` 人工复核 | `aiAssessment` AI 自动评估 + 六重证据链 | AI 评估替代大部分人工复核 |
| **导出** | `exportStatus` + `exportHistory`（针对医保报销导出） | 暂未定义导出机制（待后端设计） | 导出逻辑属于后端，前端先不处理 |

**迁移影响**:
- `ServiceScheduleOccurrence` 整个模型废弃（连带 SchedulesArea 页面废弃）
- `ServiceRecord` 被 ServiceSession 的完成态替代
- 原有的 `RecordsArea`（服务记录 + 录音记录）拆分为「进行中服务」+「已完成服务」
- 原有的录音匹配逻辑（`assignmentConfidence`、`matchedServiceRecordId`）不再需要
- `Recordings` 概念不再独立存在，录音作为 ServiceSession 的子数据
- 前端需要适配的页面：HomeArea（首页统计）、所有列表/详情页

**架构师需决策的问题**:
1. ServiceSession 是否需要拆分为多张表（基本信息/验证数据/实时数据/AI评估），还是一个大文档？
2. 实时数据（ASR日志、雷达数据）的存储策略——嵌入 session 还是独立存储通过 sessionId 关联？
3. 旧数据（已有的 ServiceRecord）是否需要迁移到新模型，还是保留只读？
4. 导出逻辑（医保报销所需的数据格式）如何适配新模型？

---

### 2.6 新增：回访记录 (FollowUpRecord)

```typescript
interface FollowUpRecord {
  id: string;
  serviceSessionId?: string;       // 关联的服务会话（如有）
  serviceObjectId: string;
  serviceObjectName: string;
  type: "in_person" | "phone_manual" | "phone_ai";
  conductedBy: string;             // 执行人ID
  conductedByName: string;
  conductedAt: string;
  location?: string;               // 上门回访的地址
  conclusion: string;              // 回访结论
  notes?: string;
  status: "scheduled" | "completed" | "cancelled";
}
```

### 2.7 新增：家属反馈 (FamilyFeedback)

```typescript
interface FamilyFeedback {
  id: string;
  serviceObjectId: string;
  serviceObjectName: string;
  familyContactId: string;
  familyContactName: string;
  familyRelation: string;
  workerId?: string;
  workerName?: string;
  feedbackAt: string;
  channel: "phone" | "wechat" | "in_person" | "app" | "other";
  content: string;
  sentiment: "positive" | "neutral" | "negative";
  actionTaken?: string;            // 针对反馈的措施
  actionTakenAt?: string;
  status: "pending" | "acknowledged" | "resolved";
}
```

### 2.8 新增：医保局视图相关模型

```typescript
interface Institution {
  id: string;
  name: string;                    // "金色年华" | ...
  licenseNumber: string;
  address: string;
  siteCount: number;
  workerCount: number;
  elderCount: number;
  qualityRating: "A" | "B" | "C" | "D";
  qualityScore: number;            // 0-100
  complianceRate: number;          // 0-100%
  lastAuditDate?: string;
}

interface AnomalyAlert {
  id: string;
  institutionId: string;
  institutionName: string;
  sessionId: string;
  type: "gps_mismatch" | "voiceprint_mismatch" | "duration_abnormal" |
        "missing_evidence" | "pattern_detected" | "quality_low";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  detectedAt: string;
  status: "pending" | "verified" | "resolved" | "dismissed";
  resolvedBy?: string;
  resolvedAt?: string;
  resolution?: string;
}
```

---

## 三、UI/页面设计

### 3.1 站点运营 Dashboard — Tab 重组

**现有 Tab (6个)**:
首页 | 服务人员 | 设备 | 长者 | 服务排期 | 服务记录

**新 Tab (8个)**:
首页总览 | 服务人员管理 | 设备管理 | 长者与服务计划 | 进行中服务 | 已完成服务 | 回访管理 | 家属反馈

**变更详情**:

| 变更 | 说明 |
|------|------|
| 首页 → 首页总览 | 增加质量数据维度 |
| 服务人员 → 服务人员管理 | 新增 role 管理、声纹、对应长者显示 |
| 设备 → 设备管理 | 从单一 SmartBadge 扩展为多设备类型 |
| 长者 → 长者与服务计划 | 重构服务计划管理（基于标准目录） |
| 服务排期 → **删除** | 排班逻辑不再适用 |
| 服务记录 → 拆分为「进行中」+「已完成」 | 实时监控 vs 历史记录 |
| **新增** 回访管理 | 三种回访类型 |
| **新增** 家属反馈 | 反馈收集与处理 |

#### 3.1.1 首页总览

保留现有结构，**强化异常/待关注项和进行中服务的显示权重**（Design Review 决策）：
- 运营数据面板中，异常预警和进行中服务置顶/高亮
- 质量评分趋势
- 按资质统计服务人员
- 设备分类统计（雷达N台、星标N个、工牌N个）

#### 3.1.2 服务人员管理

在现有基础上增加：
- **资质筛选**: 按资质标签筛选（如"护士"、"养老护理员"等）
- **列表新增列**: 资质标签、常用服务对象数、声纹状态
- **详情 drawer 新增**:
  - 资质标签管理（可编辑）
  - 常用服务对象列表（软关联，非硬绑定）
  - 声纹录入状态与操作入口（声纹在录入员工时采集，用于服务中身份匹配）
  - App 账号管理

#### 3.1.3 设备管理

重构为多设备类型：
- **设备类型筛选**: 全部 | 毫米波雷达 | 蓝牙星标 | 智能工牌
- **列表新增列**: 设备类型图标、绑定对象（护工名/老人家中）、设备能力标签
- **详情 drawer**: 设备信息 + 绑定操作 + 最近数据记录

#### 3.1.4 长者与服务计划

重构核心交互：
- **长者列表**: 保留现有，增加「负责护工」列和「服务计划状态」列
- **详情 drawer tabs**: 档案概览 | **服务计划** | 服务历史 | 家属信息
- **服务计划 tab（重点）**:
  - 显示当前使用的标准目录（如"杭州市41项标准"）
  - 服务项目列表（从标准目录中已选择的项目），按大类分组
  - 每个项目显示：项目名称、参考工时、频次、资质要求、负责人
  - 「编辑计划」操作：打开标准目录选择器，勾选/取消项目
  - 分配负责护工/护士

#### 3.1.5 进行中服务（新增）

全新页面，显示**实时进行中的服务会话**：
- 卡片列表，每张卡片一个进行中的服务
- 卡片信息：老人名 + 护工名 + 开始时间 + 已进行时长 + 已选项目数
- **异常标记**：GPS不符合（红色标签）、声纹不符合、雷达离线
- 点击卡片展开**实时监控面板**：
  - 实时语音转文字日志（滚动）
  - 毫米波雷达位置热力图
  - AI 督导提示日志
  - 「发起飞检」按钮（语音/视频通话）

#### 3.1.6 已完成服务（重构）

替代原有「服务记录」，增强为完整的服务审计视图：
- 列表：日期、老人、护工、时长、项目数、质量评分、证据完整度
- **详情 drawer（六重证据链视图）**:
  - 基本信息（时间、地点、人员、服务项目勾选）
  - 服务质量评估（AI 生成的总结+评分）
  - 语音记录（原始音频播放 + ASR 文字日志 + AI 解析标注）
  - 雷达记录（原始数据 + 统计图表 + AI 解析）
  - 飞检信息（如有：飞检时间、方式、结果）
  - 回访信息（如有：关联的回访记录）

#### 3.1.7 回访管理（新增）

- 回访列表：时间、类型标签（上门/人工电话/AI电话）、执行人、对应长者、结论摘要
- 筛选：类型 | 时间范围 | 执行人
- 「新建回访」操作
- 详情 drawer：完整回访信息

#### 3.1.8 家属反馈（新增）

- 反馈列表：时间、家属名、对应长者、对应服务人员、渠道、情感标签、状态
- 筛选：渠道 | 情感 | 状态（待处理/已确认/已解决）
- 详情 drawer：反馈内容 + 措施记录（可编辑）

---

### 3.2 护工/护士 App (Careworker H5) — 重构

**现有结构**: 简易任务列表 + 服务记录查看

**新结构 — 4个 Tab**:

#### Tab 1: 我的长者（首页）

- 登录后显示当前分配给该护工/护士的老人列表
- 每张卡片：老人头像/姓名、地址、服务计划摘要（N个项目）、上次服务时间
- 点击老人 → 进入**任务详情页**

#### Tab 2: 服务流程

**任务详情页**（参考泰照护截图）:
1. **老人基本信息**: 姓名、地址、电话
2. **服务项目勾选列表**: 按大类分组，每项显示名称 + 参考工时 + 频次
3. 底部统计：已选项目 N 项 | 合计工时 N 分钟
4. 「接受任务」按钮

**验证页**:
1. GPS 定位核对（地图 + 状态标签）
2. 蓝牙星标检测（设备连接状态）
3. 两项通过 → 「开始服务」按钮

**服务模式页**:
1. 本次服务基本信息（老人、项目列表、预估工时）
2. 计时器（已服务时长）
3. 实时监控区域：
   - 录音状态指示（绿色圆点 + "正在录音"）
   - ASR 实时文字日志（滚动）
   - 毫米波雷达连接状态
   - AI 督导提示区（触发时弹出，同时 TTS 播放）
4. 「结束服务」按钮

**结束确认页**:
1. 服务摘要（时长、完成项目）
2. 拍照上传（老人照片）
3. 「提交」按钮

#### Tab 3: 今日服务

- 已完成服务历史列表（当日）
- 可查看每次服务的摘要

#### Tab 4: 学习中心

- **通用标准**: 通用行为规范文档
- **长护险项目规范**: 按服务项目分类的 SOP，只显示该护工/护士有权限的项目
- **培训 Copilot**: AI 陪伴训练模式（功能待定，预留入口）

---

### 3.3 医保局审计入口（全新 — 简化版）

**定位**: 审计核查入口（非管理平台）。医保局审计人员用来核查金色年华所有已完成服务的入口，聚焦六维度证据链的交叉检查。

**新增 role**: `gov_auditor`
**独立 layout**: `GovAuditLayout`
**路由前缀**: `/gov`
**Tab 数量**: 2 个 — 服务总览 + 服务核查（从原设计的 6 个大幅简化）

#### 3.3.1 服务总览 (`/gov`)

- **核心指标卡片**: 今日完成服务数、本周完成数、六维度全通过率、异常服务数
- **异常与预警列表**（最近 N 条）: 基于六维度审计发现的不匹配项，分类显示：
  - GPS 不匹配
  - 星标未检测
  - 声纹不匹配
  - 录音缺失/异常
  - 雷达数据缺失
  - 照片未上传
- **质量趋势折线图**: 按周/月，显示六维度全通过率变化趋势
- 点击任意异常项 → 跳转到服务核查 Tab 对应服务的核查详情

#### 3.3.2 服务核查 (`/gov/audit`)

**列表视图**:
- 已完成服务全量列表，可检索
- 每行显示：日期、长者、服务人员、时长、项目数、**六维度状态图标**（6个 ✓/✗）
- 筛选：日期范围 | 通过/异常 | 按具体维度筛选（如"GPS不匹配"）| 服务人员 | 长者
- 「随机抽查」按钮：随机选取 N 条服务进入审计

**审计详情 drawer**（点击某条服务展开）:
- 服务基本信息（时间、人员、地点、服务项目清单）
- **六维度证据链逐项展示**:
  1. **GPS**: 护工定位 vs 老人地址，距离，匹配状态
  2. **蓝牙星标**: 是否检测到，检测时间
  3. **声纹**: 是否匹配，置信度
  4. **录音**: 时长，ASR 摘要，AI 质量评估
  5. **雷达**: 是否有数据，AI 解析摘要
  6. **照片**: 是否上传，上传时间
- 每个维度标注：✓ 通过 / ✗ 未通过 / — 缺失
- **AI 综合评估**: 质量评分 + 异常标注 + 建议
- **关联回访信息**（如有）
- **关联家属反馈**（如有）

#### ~~3.3.3-3.3.6 已移除~~

原设计的「机构管理」「异常与预警」「标准与合规」「质量趋势」4 个独立 Tab 已移除。异常预警和质量趋势的核心信息已整合到「审计总览」中。

---

## 四、路由变更

```typescript
// 新增路由
const routes = [
  // ... 保留现有 auth、family 路由 ...

  // 站点运营（重组）
  { path: "/", element: <HomeArea /> },
  { path: "/workers", element: <WorkersArea /> },
  { path: "/devices", element: <DevicesArea /> },          // 原 /badges → /devices
  { path: "/elders", element: <EldersAndPlansArea /> },     // 重构
  { path: "/live", element: <LiveServicesArea /> },          // 新增：进行中服务
  { path: "/completed", element: <CompletedServicesArea /> },// 新增：已完成服务
  { path: "/followups", element: <FollowUpsArea /> },       // 新增：回访管理
  { path: "/feedback", element: <FamilyFeedbackArea /> },   // 新增：家属反馈
  // 删除: /schedules, /records, /recordings

  // 护工/护士 App（重构）
  { path: "/careworker/*", element: <CareworkerApp /> },

  // 医保局审计入口（简化版：2个页面）
  { path: "/gov", element: <GovOverview /> },              // 服务总览
  { path: "/gov/audit", element: <GovAudit /> },            // 服务核查

  // Admin（保留）
  { path: "/admin/*", element: <QualityLayout /> },
];
```

---

## 五、Mock API 变更

需要新增/修改的 mock 端点：

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/standard-catalogs` | GET | 标准目录列表 |
| `/api/standard-catalogs/:id/items` | GET | 某目录下的服务项目 |
| `/api/service-plans` (重构) | GET/POST/PATCH | 基于标准目录的服务计划 |
| `/api/devices` | GET/POST/PATCH | 多类型设备管理（替代 /api/smart-badges） |
| `/api/service-sessions` | GET/POST/PATCH | 服务会话（替代排班+记录） |
| `/api/service-sessions/:id/realtime` | GET | 实时数据（ASR/雷达/AI） |
| `/api/follow-ups` | GET/POST/PATCH | 回访记录 |
| `/api/family-feedback` | GET/POST/PATCH | 家属反馈 |
| `/api/gov/overview` | GET | 审计总览（指标卡片+异常列表+趋势数据） |
| `/api/gov/audit/search` | GET | 服务审计检索（全量已完成服务，支持筛选） |
| `/api/gov/audit/random` | GET | 随机抽查（返回N条随机服务） |
| `/api/gov/audit/:sessionId` | GET | 单条服务的六维度审计详情 |

---

## 六、识别的缺失环节与待决策项

### 6.1 缺失环节（已确认）

| # | 缺失点 | 决策 |
|---|--------|------|
| G1 | 标准目录的管理入口在哪？ | **已确认**: admin 下新增「服务目录管理」tab，配合「服务标准管理」tab（原标准规范管理） |
| G2 | 销售角色在 Dashboard 和 App 中具体能做什么？ | **已确认**: 不再定义销售/护士/护工硬角色，改为资质驱动模型，此问题不再适用 |
| G3 | 护士的 App 流程和护工是否完全一致？ | **已确认**: App 首页逻辑完全一致。所有 worker 通过资质匹配决定可服务的老人和项目 |
| G4 | 服务计划的审批流程？ | **已确认**: 站点运营创建和确认即可，不搞复杂流程（站点运营可能就是护士） |
| G5 | 录音来源如何识别？ | **已确认**: ServiceSession 中标记 `audioSource`，初期只考虑手机，留口子支持雷达/工牌等 |
| G6 | AI 督导策略从哪里配置？ | **已确认**: admin 页面「服务标准管理」tab 已有督导策略配置。新逻辑下先有「服务目录管理」定义目录，再到「服务标准管理」定义对应服务的 SOP/引导策略/督导策略/报告策略。**待定事项（架构师）**: 原有 AI 策略配置仅基于录音，未来需要将 GPS、雷达数据等多源信号纳入 AI 督导决策，当前架构不支持，需架构师评估扩展方案 |
| G7 | 医保局用户如何登录？ | **已确认**: 先共用 auth，新增 role 判断跳转到对应 Dashboard |
| G8 | 声纹如何采集和验证？ | **已确认**: 声纹在录入员工/worker 信息时采集（不是在服务中采集），目的是身份匹配基线。服务中如果录音声纹与基线不匹配，则显示预警/异常 |

### 6.2 新增发现的缺失环节（基于代码审查）

| # | 缺失点 | 现有代码情况 | 影响 |
|---|--------|------------|------|
| G9 | 护工 App 当前无登录机制 | CareworkerPage 是公开路由（`/careworker/*`），无需认证，使用 mockWorker 选择 | 需要新增护工登录流程，用户名密码在站点运营 Dashboard 管理 |
| G10 | Admin 页面需新增两个 tab | 现有 admin 5个tab：质量总览/规范管理/站点管理/用户管理/飞书管理 | 需新增「服务目录管理」tab，并将现有「规范管理」重命名为「服务标准管理」 |
| G11 | 现有 SOP 模型与新标准目录的关系 | 现有 SOP 是一个单一实体，含4种内容（SOP/督导/引导/报告），通过 `sopLinks` 关联到服务计划 | 新设计中，先有「服务目录」定义服务项目，再有「服务标准」定义每个项目的 SOP/督导/引导/报告。现有 SOP 模型需要重构为两层：目录层 + 标准层 |
| G12 | Copilot 命令集需要扩展 | 现有命令覆盖：worker/badge/elder/schedule/record/quality/site/user/sop/feishu | 新增页面（进行中服务、已完成服务、回访、家属反馈、医保局）需要对应的 copilot 命令 |
| G13 | 医保导出功能缺失 | 当前 `/service-records/export` 是空 stub，无实际导出逻辑，无医保格式定义 | 医保局审计入口的「服务审计」需要能查看完整服务数据，导出格式需架构师定义 |
| G14 | Family 页面与「家属反馈」的关系 | 现有 FamilyPage 只做绑定+推送消息，无反馈收集功能 | 「家属反馈」是站点运营侧的管理视图，但反馈数据从何而来？需要在 Family H5 页面新增反馈提交入口，或通过其他渠道（电话/微信）人工录入 |
| G15 | AI 督导策略需要支持多源信号 | 现有 AI 策略配置仅基于录音（SOP 的 supervisionContent） | 未来需要将 GPS、雷达数据、声纹匹配等多源信号纳入 AI 督导决策。**待架构师评估**：当前架构不支持，需设计多源信号融合的策略配置方案 |
| G16 | Prisma schema 中 UserRole 需扩展 | 现有 enum：`org_admin`, `site_operator`, `careworker` | 需新增 `gov_auditor`。注意：`careworker` 角色已存在于 Prisma 但未在 AuthContext 中使用 |

### 6.3 逻辑冲突（更新版）

| # | 冲突点 | 现有代码 | 新设计 | 分析与建议 |
|---|--------|---------|--------|-----------|
| C1 | 服务排期 vs 护工自主安排 | `ServiceScheduleOccurrence` 模型 + `SchedulesArea` 页面 + 日历/地图视图（39,610 bytes） | ServiceSession 由护工在 App 中主动发起 | **整个 SchedulesArea 废弃**。SchedulesArea.tsx（含日历/列表/地图三种视图）全部删除，路由 `/schedules` 移除 |
| C2 | SOP 管理 vs 服务目录+标准 | 单一 SOP 实体含 4 种内容，SupervisorPage.tsx 管理 SOP 文档（sopContent/supervisionContent/guidanceContent/reportContent） | 两层结构：「服务目录」定义项目 →「服务标准」定义项目的 SOP/督导/引导/报告 | **重构而非删除**：现有 SOP 的 4 种内容（SOP/督导/引导/报告）保留，但挂载到标准目录项下而非独立存在。SupervisorPage 的文档编辑 UI 可复用，但需要改为"先选目录项，再编辑对应标准" |
| C3 | 录音记录 tab vs 设备模型 | `RecordsArea` 有两种 viewMode："records" + "recordings"，录音通过 `matchedServiceRecordId` 关联到服务记录 | 录音作为 ServiceSession 的子数据，不独立存在 | **"recordings" viewMode 废弃**。录音数据嵌入 ServiceSession，在「已完成服务」详情中查看 |
| C4 | 现有服务记录 vs ServiceSession | `ServiceRecord` 由后台处理生成（录音设备上传 → ASR → 匹配排班 → 生成记录），`assignmentConfidence` 做事后匹配 | ServiceSession 由护工 App 主动创建，全生命周期跟踪 | **ServiceRecord 模型废弃，被 ServiceSession 替代**。RecordsArea.tsx（60,202 bytes）需要重写为两个新页面：LiveServicesArea + CompletedServicesArea |
| C5 | 现有 Copilot 的 schedule/record 命令 | 命令集包含 `/schedule-create`、`/schedule-query`、`/record-query`、`/record-review`、`/record-export` | 排班和旧记录概念不再存在 | **命令集需要重写**：移除 schedule 相关命令，record 命令改为 session 命令，新增进行中服务/回访/反馈相关命令 |
| C6 | AuthGuard 路由逻辑 | `org_admin` → `/admin`，`site_operator` → `/`，互斥跳转 | 新增 `gov_auditor` → `/gov` | **AuthGuard 需要扩展**：三路跳转逻辑，且 org_admin 可能需要同时访问 admin 和站点运营页面 |

---

## 七、实施优先级建议

### Phase 1: 基础数据层（先改 mock + 数据模型）
1. 录入杭州41项 + 国家36项标准数据到 mock
2. 新增 ServiceStandardCatalog / Device / ServiceSession 等类型定义
3. 更新 mock server 端点

### Phase 2: 站点运营 Dashboard 重组
1. 修改导航 Tab 结构
2. 重构「长者与服务计划」页面
3. 新增「进行中服务」页面
4. 重构「已完成服务」页面
5. 新增「回访管理」+「家属反馈」页面
6. 更新「服务人员」和「设备」页面

### Phase 3: 护工 App 重构
1. 重构登录后首页（我的长者）
2. 实现完整服务流程（任务详情 → 验证 → 服务模式 → 结束）
3. 新增学习中心 Tab

### Phase 4: 医保局审计入口
1. 新增 GovAuditLayout + routing
2. 实现 6 个页面（mock 数据驱动）

---

## 八、Review 决策记录

### 8.1 CEO Review (SELECTIVE EXPANSION 模式)

| # | 决策点 | 结果 |
|---|--------|------|
| 1-1 | 前端架构 | 保持单一 SPA，React Router + lazy loading 区分三个视图 |
| 1-2 | 实时数据 mock 策略 | 静态 mock + setInterval 模拟，先验证 UI |
| 1-3 | 服务计划版本控制 | **延后**，初期不做 |
| 11-1 | 护工 App 服务模式页布局 | 分层折叠（核心信息默认显示，ASR/雷达详情可展开） |
| 11-2 | 医保局大屏投影模式 | **延后** |
| 11-3 | 护工 App 离线能力 | **延后** |

### 8.2 Design Review (7 维度评分)

| 维度 | 初始 | 修正后 | 关键决策 |
|------|------|--------|---------|
| Pass 1: 信息架构 | 6 | **7** | App 首页=长者卡片列表；Dashboard 首页=运营数据面板中强化异常+进行中服务 |
| Pass 2: 交互状态 | 3 | **7** | GPS/星标验证失败→允许跳过但标记异常；所有列表页需 loading/empty/error 状态 |
| Pass 3: 用户旅程 | 5 | **6** | 服务提交后 toast 提示直接返回首页，不做完成反馈页 |
| Pass 4: AI Slop | 7 | **7** | 医保局页面需在实施时避免通用后台模板 |
| Pass 5: 设计系统 | 6 | **7** | 医保局审计入口统一现有设计系统（sw-* CSS） |
| Pass 6: 响应式 | 4 | **6** | 护工App=手机端，两个Dashboard=桌面端 |
| Pass 7: 未决项 | 4项 | 1项解决/2项延后/1项待架构师 | 家属反馈来源=Family H5 已有反馈入口 |

### 8.3 Eng Review

| # | 决策点 | 结果 |
|---|--------|------|
| E1 | 开发模式 | **设计先行，实施待定**（非前端先行） |
| E2 | 资质标签一致性 | 需要新增**资质主数据表 (QualificationTag)**，所有资质引用从此表选取，确保匹配一致性 |
| E3 | SOP 与标准目录关系 | 现有「规范管理」**重命名为「服务标准管理」**，改为先选目录项再编辑对应标准（SOP/督导/引导/报告）。新增「服务目录管理」作为独立 tab |
| E4 | org_admin 路由权限 | org_admin 可同时访问 admin 和站点运营视图（非互斥）。gov_auditor 只访问 /gov。site_operator 只访问 / |
| E5 | 类型定义位置 | 所有新增类型继续放 contracts.ts |
| E6 | 测试策略 | 设计阶段不定义测试计划，实施时再处理 |
| E7 | 并发规模 | 单站点 10-30 个同时服务。「进行中服务」页面需列表虚拟化 + 实时数据按需加载（展开时才拉取） |

### 8.4 待架构师决策项汇总

| # | 决策项 | 上下文 |
|---|--------|--------|
| A1 | ServiceSession 是否拆分多张表 | 基本信息/验证/实时数据/AI评估 — 一个大文档还是分表关联？ |
| A2 | 实时数据存储策略 | ASR日志/雷达数据嵌入 session 还是独立存储？ |
| A3 | 旧数据迁移策略 | 已有 ServiceRecord 迁移到新模型还是保留只读？ |
| A4 | 医保导出格式 | 新模型下的医保报销数据导出格式 |
| A5 | AI 督导多源信号融合 | GPS/雷达/声纹等多源信号如何纳入 AI 决策，当前架构不支持 |

---

## 附录

### 参考文档
- `docs/0604版本调整原始需求输入.md` — 原始需求 input
- `docs/goldenyears-yibao.html` — 医保介绍页
- 杭州市长护险要求 PDF（15页）
- 国家医保局长护服务项目目录（试行）

### 参考截图
- 泰照护 App "任务详情"页面 — 服务项目勾选 UI 参考
