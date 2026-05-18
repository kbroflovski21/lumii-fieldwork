# 服务记录 Tab Design

状态：设计规格
日期：2026-05-15
工作区 id：`service_records`
页面标题：`服务记录`

## 1. 目的和边界

本 tab 展示和复核已经发生的服务事实。

服务记录由后端自动生成：智能工牌录音上传后，后台进行语音转写、服务人员/对象/项目推断、SOP 检查、GPS 证据采集，最终形成一条结构化服务记录。运营人员在此确认归属、补充缺失信息、处理异常、审核凭证并导出结算材料。

### 本 tab 负责

- 服务事实记录的查看和筛选。
- 归属复核（确认推断的服务人员、服务对象和服务项目）。
- 缺失字段补充（结算字段等）。
- 服务异常处理（迟到、早退、服务不完整、安全风险等）。
- GPS 定位证据查看（签到/签退位置、地址匹配）。
- 原始音频播放（受权限控制）。
- 语音转写查看（含分段和说话人识别）。
- AI 生成的结构化服务摘要。
- 信息完整性检查和导出状态管理。
- 服务记录导出（凭证包生成，支撑结算、对账和留档）。

### 边界

- 创建未来服务排期 → `服务排期` tab / `服务对象` tab。
- 编辑服务对象周期计划 → `服务对象` tab。
- 激活或维护智能工牌生命周期 → `设备` tab。
- 家属端报告展示 → 不在 Fieldwork 范围内。

## 2. 用户要回答的问题

| 问题 | 对应用例 |
| --- | --- |
| 这条服务是谁服务了谁，什么时间，服务了什么项目？ | F05 后台自动规整 |
| 这条记录的归属推断是否可靠？需要人工确认吗？ | 4.11 站点运营处理复查 |
| 是否有 GPS 签到/签退位置？和服务对象地址匹配吗？ | 4.9 凭证采集 |
| 有没有原始录音？转写结果是什么？ | F04 工牌录音上传 |
| 服务是否按 SOP 完成？有没有遗漏必问项？ | 4.8 SOP 驱动服务 |
| 是否存在迟到、早退、安全风险等异常？ | 4.11 异常处理 |
| 哪些字段缺失，影响结算导出？ | 4.9 凭证包生成 |
| 哪些记录可以导出？有没有阻塞导出的问题？ | F08 运营导出服务日志 |
| 这条记录之前导出过吗？什么时候？ | F08 导出留痕 |

## 3. 自动生成流程（来自 agentic-flows F05）

```text
工牌录音上传
  → 语音转写（ASR）
  → 推断服务人员、服务对象和服务项目（assignmentConfidence）
  → SOP 检查（如有 SOP）
  → GPS 证据采集（签到/签退位置、地址匹配）
  → 标记异常（迟到、早退、服务不完整、SOP 漏项）
  → 标记缺失字段（结算字段等）
  → 生成结构化服务摘要
  → 形成服务记录 → 运营复核
```

低置信度推断（`assignmentConfidence < 0.7`）标记为 `reviewStatus: "needs_review"`。

## 4. 主界面布局

### 页头

```text
服务记录                                        [导出记录]
查看和复核已完成的服务事实，确认归属和导出结算材料
```

- page title：`服务记录`
- 简短说明：查看和复核已完成的服务事实，确认归属和导出结算材料
- 一个 primary button：`导出记录`

### Table container

Table 使用页面级别滚动（`overflow-y` 不设在 table container 上，table 自然高度增长），与全局 UI 规范一致。

```text
┌──────────────────────────────────────────────────────────────────────┐
│ [🔍搜索服务对象] [全部|今天|本周|本月] [复核状态 ▾] [导出状态 ▾]        │
├──────────────────────────────────────────────────────────────────────┤
│ 日期/时间    服务对象    服务人员    服务项目    工牌    复核状态  导出状态 │
├──────────────────────────────────────────────────────────────────────┤
│ 5/12 09:31   陈阿姨    王丽       助餐      FW-021  待复核   可导出   │
│ 5/11 14:00   李爷爷    张敏       助浴      FW-031  已确认   已导出   │
└──────────────────────────────────────────────────────────────────────┘
```

## 5. 筛选与搜索

### 搜索

按服务对象姓名或服务人员姓名模糊搜索。

### 日期范围（快速切换按钮组）

| 选项 | 过滤逻辑 |
| --- | --- |
| 全部 | 不过滤 |
| 今天 | `serviceDate === today` |
| 本周 | `serviceDate` 在本周范围内 |
| 本月 | `serviceDate` 在本月范围内 |

### 复核状态下拉框

| 选项 | 过滤逻辑 |
| --- | --- |
| 复核状态（默认） | 不过滤 |
| 待复核 | `reviewStatus === "needs_review"` |
| 已确认 | `reviewStatus === "confirmed"` |
| 信息不完整 | `reviewStatus === "info_incomplete"` |
| 异常未闭环 | `reviewStatus === "exception_open"` |

### 导出状态下拉框

| 选项 | 过滤逻辑 |
| --- | --- |
| 导出状态（默认） | 不过滤 |
| 可导出 | `exportStatus === "exportable"` |
| 暂不可导出 | `exportStatus === "not_ready"` |
| 已导出 | `exportStatus === "exported"` |
| 带标记导出 | `exportStatus === "exported_with_flags"` |

筛选规则：

- 日期范围使用按钮组（与排期 tab 一致），不使用下拉框。
- 下拉框默认显示字段名。
- 选中非默认值时文字变为 `--accent` 色。

## 6. Table 列定义

列布局：`grid-template-columns: 0.9fr 0.9fr 0.7fr 0.6fr 0.6fr 0.7fr 0.7fr`

| 列 | 内容 | 样式 |
| --- | --- | --- |
| 日期/时间 | `serviceDate` + `startTime-endTime` + `durationMinutes`分钟 | 日期 14px/600 + 时间 12px muted |
| 服务对象 | `serviceObjectName`，下方小字 `serviceProject` | avatar + name link |
| 服务人员 | `socialWorkerName` 或 "待确认" muted | body 13px |
| 服务内容 | `serviceProject` tag + 业务完成项统计（`serviceItems` 中 `category === "business"` 的 completed/total） | tag + 小字 |
| 工牌 | 关联工牌设备码（`badgeId` 转换为 `FW-` 前缀） | monospace tag |
| 复核状态 | `reviewStatus` Status Badge | 语义色 |
| 导出状态 | `exportStatus` Status Badge + `missingFields.length` 时显示缺失数量 | 语义色 |

### 复核状态映射

| reviewStatus | 中文 | tone |
| --- | --- | --- |
| `needs_review` | 待复核 | warning |
| `confirmed` | 已确认 | success |
| `info_incomplete` | 信息不完整 | warning |
| `exception_open` | 异常未闭环 | danger |

### 导出状态映射

| exportStatus | 中文 | tone |
| --- | --- | --- |
| `not_ready` | 暂不可导出 | muted |
| `exportable` | 可导出 | success |
| `exported` | 已导出 | success |
| `exported_with_flags` | 带标记导出 | warning |

### 行交互

| 平台 | 交互 | 行为 |
| --- | --- | --- |
| 桌面 | 单击行 | 选中行（高亮 + 左侧蓝色边条） |
| 桌面 | 双击行 | 打开记录详情 Modal |
| 手机 | 单击整行 | 直接打开底部 Modal |

注意：桌面端必须双击才能打开 Modal（单击仅选中），手机端保持单击打开。

行内标记：
- `assignmentConfidence < 0.7` 时服务人员名旁显示 warning 图标
- `exceptionTags.length > 0` 时行左侧显示橙色边条
- `missingFields.length > 0` 时导出状态旁显示缺失数量

禁止：
- 列表行展示复核通过、播放音频、导出等操作按钮。
- 音频、转写、GPS 证据在列表行内展开。

## 7. Modal 信息架构

### 记录详情 Modal（无底部操作栏）

使用 `so-modal rec-modal--no-footer` 样式。该 Modal 没有标准底部操作栏，复核操作放在 header 区。

RecordDrawer 组件由服务记录 tab 直接使用，也被服务对象 Modal 和设备 Modal 的服务记录 tab 通过内联替换方式复用。

```text
┌──────────────────────────────────────────────┐
│ Header (rec-modal__header, 状态色背景)        │
│   行 1: avatar + 服务项目 · 服务对象（标题）    │
│   行 2: 日期 · 时间 · 时长 · 人员 · 工牌       │
│   行 3: 摘要标签 + 复核按钮                    │
├──────────────────────────────────────────────┤
│ Tab 导航 (so-modal__tabs)                     │
│   [SOP 检查] [录音 · 对话] [GPS 定位]          │
├──────────────────────────────────────────────┤
│ 内容区 (so-modal__content, scrollable)        │
│   tab 内容                                    │
└──────────────────────────────────────────────┘
```

**Header**

3 行结构，背景使用中性灰色调（`#F8FAFC → #F1F5F9`）：

- 行 1：avatar（彩色首字母）+ 标题 `服务项目 · 服务对象姓名` + 关闭按钮
- 行 2：副标题 `serviceDate` + `startTime-endTime` + `durationMinutes分钟` + 服务人员 `socialWorkerName` + 工牌 `badgeId`
- 行 3：摘要标签 + 复核操作
  - 标签 1：`流程 ✓X/Y`（通过数/总数），全通过 = 绿底，有异常 = 琥珀底
  - 标签 2：`服务 X项` 或 `服务 X项(Y异常)`，有异常 = 琥珀底
  - 复核按钮：`复核通过`（绿色 `#16A34A` 底 + 白字），2-step 确认
  - 已复核时：显示 `✓ 已复核` badge（绿底 `#DCFCE7` + `#16A34A` 字）

**复核通过 2-step 确认**：

1. 点击"复核通过" → 按钮变为"确认通过？"（绿色加深 `#15803D`）
2. 再次点击"确认通过？" → 执行复核操作 → 按钮替换为"✓ 已复核" badge
3. 3 秒内未点确认 → 自动恢复为"复核通过"按钮

**Tab 导航**：3 个 tab — `SOP 检查`、`录音 · 对话`、`GPS 定位`。

**Tab 1：SOP 检查**

分为两个 section：

流程规范 section（`serviceItems` 中 `category === "process"` 的条目）：

- section 标题：`流程规范`
- 右侧统计：`X通过` + `Y异常`（如有）+ `共Z项`
- 每项为可展开行（`rec-si`）：状态图标 + 序号 + 标题 + 展开箭头
- 展开后显示证据：
  - 转写文本（MessageSquare 图标 + 文字）
  - 音频证据：HTML5 原生 `<audio>` 播放器（`controls` + `preload="none"`），`src` 指向 `audioClipUrl`，显示时长
  - 异常原因（AlertTriangle 图标 + AI 生成的异常说明）

状态图标映射：
- `completed` → Check 图标（绿色）
- `abnormal` → XCircle 图标（红色）
- `skipped` → MinusCircle 图标（灰色）
- `pending` → Clock 图标（灰色）

服务内容 section（`serviceItems` 中 `category === "business"` 的条目）：

- section 标题：`服务内容`
- 右侧统计：`X完成` + `Y异常`（如有）+ `Z跳过`（如有）+ `共N项`
- 每项交互和展开逻辑同流程规范

**Tab 2：录音 · 对话**

完整录音播放器 + 对话记录：

- HTML5 原生 `<audio>` 播放器（`controls` + `preload="none"`），受权限控制
- 显示格式化时长 + 保留策略标签

对话记录（WeChat/飞书风格聊天气泡 `rec-chat`）：

- 服务人员（`speaker: "social_worker"`）：左侧对齐，白色气泡（`#FFFFFF`），蓝色 avatar（首字母 + 蓝底 `#3B82F6`）
- 服务对象（`speaker: "service_object"`）：右侧对齐，绿色气泡（`#DCF8C6`），绿色 avatar（首字母 + 绿底 `#22C55E`）
- 每条气泡显示：avatar + 说话人标签 `speakerLabel` + 时间戳（`startSecond` 格式化为 `MM:SS`）+ 对话文本
- 对话记录直接显示在 tab 内（不需要额外弹窗）

音频 + 转写下载按钮：内联按钮，可下载录音文件和完整对话文本(.txt)。

**Tab 3：GPS 定位**

GPS 位置信息 + 自动展开地图：

| 字段 | 来源 | 说明 |
| --- | --- | --- |
| 签到位置 | `locationEvidence.startPoint` | 经纬度 + 精度（`±Xm`） |
| 签退位置 | `locationEvidence.endPoint` | 经纬度 |
| 地址匹配 | `locationEvidence.addressMatched` | true=已匹配（success badge），false=需核实（warning badge） |

Leaflet 地图在 tab 打开时自动初始化和展开（`rec-gps-map--always`，无需手动点击展开按钮）：
- 使用 Leaflet `L.map` + OpenStreetMap tileLayer，zoom 16
- 签到位置标记 marker + popup "签到位置"
- 签退位置标记 marker + popup "签退位置"

无定位数据时显示"暂无定位" muted。

## 8. 导出流程

点击页头"导出记录"按钮打开导出 Drawer：

1. **选择范围**：当前筛选条件下的记录，显示记录数量
2. **检查阻塞**：
   - 存在 `reviewStatus: "needs_review"` 的记录 → 警告提示
   - 存在 `reviewStatus: "info_incomplete"` 的记录 → 警告提示
   - 存在 `reviewStatus: "exception_open"` 的记录 → 警告提示
   - 用户可选择"带标记导出"或"仅导出无问题记录"
3. **确认导出**：显示导出记录数、筛选条件摘要、操作员
4. **导出结果**：生成凭证包，记录留痕

导出留痕：
- 记录操作员、导出时间、文件版本和筛选摘要
- `exportStatus` 更新为 `exported` 或 `exported_with_flags`

## 9. 动作归属

| 动作 | 归属 | 对应用例 |
| --- | --- | --- |
| 查看记录详情 | 列表行 → 详情 Modal | F05 |
| 复核通过 | 详情 Modal 操作 | 4.11 复核 |
| 播放原始音频 | 详情 Modal，受权限控制 | F04 |
| 查看转写 | 详情 Modal | F05 |
| 导出记录 | 页头 primary button → 导出 Drawer | F08 |

动作实现约束：
- 复核动作（复核通过）只在 Modal 内。
- 导出动作在导出 Drawer 内，需展示阻塞检查结果。
- 音频播放受权限路由控制，restricted 模式下不暴露 URL。

## 10. 家属边界

- 家属侧只接收脱敏服务摘要和订阅报告。
- 原始录音、转写、内部审核备注、归属置信度和机构内部处理记录不面向家属。
- `restricted` 权限模式下家属电话脱敏，音频不可播放。

## 11. 状态

### 复核状态

| reviewStatus | 中文 | tone | 说明 |
| --- | --- | --- | --- |
| `needs_review` | 待复核 | warning | 归属推断低置信度，需人工确认 |
| `confirmed` | 已确认 | success | 归属已人工确认 |
| `info_incomplete` | 信息不完整 | warning | 缺少结算必要字段 |
| `exception_open` | 异常未闭环 | danger | 有未处理的服务异常 |

### 导出状态

| exportStatus | 中文 | tone | 说明 |
| --- | --- | --- | --- |
| `not_ready` | 暂不可导出 | muted | 存在阻塞问题 |
| `exportable` | 可导出 | success | 满足导出条件 |
| `exported` | 已导出 | success | 已成功导出 |
| `exported_with_flags` | 带标记导出 | warning | 含未解决标记但已导出 |

## 12. 数据契约

### 核心类型

```ts
type ServiceRecord = {
  id: string;
  serviceDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  socialWorkerId?: string;
  socialWorkerName?: string;
  serviceObjectId?: string;
  serviceObjectName?: string;
  familyContactIds: string[];
  badgeId: string;
  smartBadgeId?: string;
  serviceProject?: string;
  assignmentConfidence: number;
  reviewStatus: "confirmed" | "needs_review" | "info_incomplete" | "exception_open";
  exportStatus: "not_ready" | "exportable" | "exported" | "exported_with_flags";
  locationEvidence?: ServiceLocationEvidence;
  serviceExceptions: ServiceException[];
  serviceItems?: ServiceItem[];
  exceptionTags: string[];
  missingFields: string[];
  audioAssetId: string;
  transcriptId: string;
  structuredSummary: string;
  generatedSummary?: string;
  exportHistory: ServiceRecordExportHistory[];
};

type ServiceItemStatus = "completed" | "skipped" | "abnormal" | "pending";

type ServiceItem = {
  id: string;
  seq: number;
  title: string;
  category: "business" | "process";
  status: ServiceItemStatus;
  audioClipUrl?: string;
  audioDurationSeconds?: number;
  transcript?: string;
  abnormalReason?: string;
};

type ServiceLocationEvidence = {
  startPoint?: GpsPoint;
  endPoint?: GpsPoint;
  routePoints?: GpsPoint[];
  addressMatched?: boolean;
};

type GpsPoint = {
  latitude: number;
  longitude: number;
  capturedAt?: string;
  accuracyMeters?: number;
};

type ServiceException = {
  id: string;
  type: "late_arrival" | "early_leave" | "service_incomplete" | "safety_risk" | "other";
  title: string;
  description: string;
  status: "open" | "resolved";
  resolvedAt?: string;
};

type ServiceRecordExportHistory = {
  id: string;
  exportedAt: string;
  operatorName: string;
  fileVersion: string;
  filterSummary: string;
  exceptionFlags?: string[];
  unresolvedItems?: string[];
};

type ServiceAudioAsset = {
  id: string;
  recordId: string;
  playbackUrl?: string;
  durationSeconds: number;
  capturedByBadgeId: string;
  uploadedAt: string;
  retentionLabel?: string;
};

type ServiceTranscript = {
  id: string;
  recordId: string;
  language: "zh-CN";
  text: string;
  confidence?: number;
  segments: Array<{
    startSecond: number;
    endSecond: number;
    speaker: "social_worker" | "service_object" | "family" | "unknown";
    text: string;
  }>;
};

type UpdateServiceRecordReviewRequest = {
  action: "confirm_assignment" | "complete_information" | "resolve_exception";
  socialWorkerId?: string;
  serviceObjectId?: string;
  completedFields?: Record<string, string>;
  resolvedExceptionIds?: string[];
  note?: string;
};

type ExportServiceRecordsRequest = {
  recordIds: string[];
  filters?: Record<string, string | boolean>;
  fields: string[];
  includeExceptionFlags: boolean;
};

type ServiceRecordsResponse = {
  serviceRecords: ServiceRecord[];
  audioAssets: ServiceAudioAsset[];
  transcripts: ServiceTranscript[];
  serviceObjects: ServiceObject[];
  smartBadges: SmartBadge[];
  operationalState: WorkAreaOperationalState;
};
```

### API Endpoints

- `GET /api/service-records` — 列表，支持 dateFrom/dateTo/socialWorkerId/serviceObjectId/badgeId/reviewStatus/exportStatus 查询
- `GET /api/service-records/:id` — 单条详情
- `GET /api/service-records/:id/audio` — 音频资产（受权限控制）
- `GET /api/service-records/:id/transcript` — 转写文本
- `PATCH /api/service-records/:id/review` — 复核操作（确认归属/补充信息/处理异常）
- `POST /api/service-records/export` — 导出凭证包

### Fixture 覆盖

| 场景 | 字段要求 |
| --- | --- |
| 待复核记录 | `reviewStatus: "needs_review"`，`assignmentConfidence < 0.7` |
| 已确认记录 | `reviewStatus: "confirmed"` |
| 信息不完整 | `reviewStatus: "info_incomplete"`，`missingFields` 非空 |
| 异常未闭环 | `reviewStatus: "exception_open"`，`serviceExceptions` 含 open 状态 |
| GPS 已匹配 | `locationEvidence.addressMatched: true` |
| GPS 需核实 | `locationEvidence.addressMatched: false` |
| 可导出 | `exportStatus: "exportable"` |
| 已导出 | `exportStatus: "exported"`，`exportHistory` 非空 |
| 带标记导出 | `exportStatus: "exported_with_flags"`，`exceptionFlags` 非空 |
| 有音频和转写 | `audioAssetId` + `transcriptId` 非空 |
| 有家属联系人 | `familyContactIds` 非空 |
| 有服务项（含流程和业务） | `serviceItems` 含 `category: "business"` 和 `category: "process"` |
| 服务项含异常 | `serviceItems` 含 `status: "abnormal"` + `abnormalReason` |
| 服务项含跳过 | `serviceItems` 含 `status: "skipped"` |

## 13. 响应式

### 桌面端（>767px）

- 搜索框 + 日期按钮组 + 两个下拉框 + 导出按钮横向排列在 toolbar。
- Table 列表占主工作区。
- Modal 居中弹出，固定高度 92vh，overlay 模式。

### 手机端（≤767px）

- 搜索框独占一行，日期按钮组和下拉框换行排列。
- Table 转为卡片列表：
  - 第一行：日期 + 时间 + 复核状态 badge
  - 第二行：服务对象 · 服务项目
  - 第三行：服务人员 · 工牌设备码
  - 第四行：导出状态 badge + 时长
- Modal 使用底部模式，最大高度 86vh。
- 音频播放器、转写、GPS 保持分节展示。

## 14. 与业务流程的对应关系

| 业务流程 | 本 tab 承接 |
| --- | --- |
| 4.8 SOP 驱动的上门服务 | 结构化摘要展示 SOP 完成情况 |
| 4.9 生成并导出服务凭证包 | 导出 Drawer 完整流程 |
| 4.10 质检人员审核服务凭证 | 复核状态 + 确认归属/补充信息/处理异常 |
| 4.11 处理服务异常与记录复查 | serviceExceptions + missingFields + reviewStatus |
| F04 服务人员上门记录服务 | 音频 + GPS + 时间事实 |
| F05 后台自动规整服务记录 | 自动生成的记录 + assignmentConfidence |
| F06 周期性生成洞察报告 | 服务记录作为洞察数据源 |
| F08 运营导出服务日志用于结算 | 导出流程 + 留痕 + 阻塞检查 |

### 跨 tab 导航

- 详情 Modal 内 `serviceObjectName` 可点击 → 跳转 `服务对象` tab
- 详情 Modal 内 `socialWorkerName` 可点击 → 跳转 `服务人员` tab
- 详情 Modal 内工牌设备码 → 跳转 `设备` tab
- `服务排期` tab 的已完成排期 → 跳转到本 tab 的对应记录
- `服务对象` tab 的服务历史 tab → 通过 `RecordDrawer`（从本 tab 导出）以内联替换模式打开记录详情（替换服务对象 Modal，不叠加）
- 首页"复核服务记录"推荐动作 → 跳转本 tab 并筛选 needs_review

## 15. 验收

- 服务记录列表展示日期/时间、服务对象、服务人员、服务项目、工牌、复核状态和导出状态。
- 日期范围使用按钮组（全部/今天/本周/本月），复核和导出使用下拉框筛选。
- 列表行不展示任何操作按钮。
- 详情 Modal 展示服务概要 bar + 流程规范（process items）+ 服务内容（business items）+ GPS 证据 + 完整录音 + 缺失字段 + 导出历史。
- 流程规范和服务内容按 `serviceItems` 的 `category` 字段分组展示，各自独立 section + 统计。
- 每个服务项可展开查看证据（转写文本、音频时长、异常原因）。
- 服务项状态图标：completed=Check（绿）、abnormal=XCircle（红）、skipped=MinusCircle（灰）、pending=Clock（灰）。
- 复核操作（确认归属/补充信息/处理异常）在 Modal 内完成。
- GPS 证据展示签到/签退位置和地址匹配状态，支持展开 Leaflet 地图弹窗。
- 完整录音使用 HTML5 原生 `<audio>` 播放器，受权限控制，restricted 模式不渲染。下方有"查看完整对话记录"按钮，打开聊天气泡式 transcript dialog（服务人员=蓝、服务对象=绿，含时间戳）。
- 服务项展开后的音频证据使用真实 `<audio>` 播放器（`audioClipUrl` → `/mock-audio.wav`）。
- Modal 内容区 `overflow-x: hidden`（无水平滚动条）。
- 桌面端双击打开 Modal（单击仅选中行），手机端单击打开。
- 导出流程展示阻塞检查 + 范围确认 + 留痕。
- `assignmentConfidence < 0.7` 的记录显示 warning 标记。
- `missingFields` 非空时显示缺失字段 warning tags。
- 手机端 Table 转卡片列表，Modal 从底部滑出。
- 数据类型对齐 API contract。
- Fixture 覆盖全部复核状态、导出状态和证据组合。
