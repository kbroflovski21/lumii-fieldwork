# Service Records API Contract

状态：后端交接契约
日期：2026-05-15
Design spec：[`../../superpowers/specs/site-operations/06-service-records.md`](../../superpowers/specs/site-operations/06-service-records.md)

## 1. Scope

服务记录 API 管理已发生的服务事实：GPS 证据、原始音频资产、语音转写、结构化摘要、关联服务对象/人员/工牌/家属、复核状态、服务异常、信息完整性和导出状态。

未来排期属于 [`05-service-schedules-api.md`](05-service-schedules-api.md)。工牌生命周期属于 [`03-devices-api.md`](03-devices-api.md)。

## 2. Entity Shape

### ServiceRecord

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
  reviewStatus: ReviewStatus;
  exportStatus: ExportStatus;
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

type ReviewStatus = "confirmed" | "needs_review" | "info_incomplete" | "exception_open";
type ExportStatus = "not_ready" | "exportable" | "exported" | "exported_with_flags";

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
```

### Review Status Mapping

| reviewStatus | 中文 | tone | 说明 |
| --- | --- | --- | --- |
| `needs_review` | 待复核 | warning | 归属推断低置信度 |
| `confirmed` | 已确认 | success | 归属已人工确认 |
| `info_incomplete` | 信息不完整 | warning | 缺少结算必要字段 |
| `exception_open` | 异常未闭环 | danger | 有未处理的服务异常 |

### Export Status Mapping

| exportStatus | 中文 | tone | 说明 |
| --- | --- | --- | --- |
| `not_ready` | 暂不可导出 | muted | 存在阻塞问题 |
| `exportable` | 可导出 | success | 满足导出条件 |
| `exported` | 已导出 | success | 已成功导出 |
| `exported_with_flags` | 带标记导出 | warning | 含未解决标记 |

### Supporting Types

```ts
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
    speakerLabel?: string;   // 说话人显示名（如"服务人员 王丽"、"服务对象 陈阿姨"）
    text: string;
  }>;
};

// Transcript segments 用于 Full Transcript Dialog（聊天气泡式对话记录）：
// - speaker="social_worker" → 蓝色气泡靠右
// - speaker="service_object" → 绿色气泡靠左
// - startSecond 格式化为 MM:SS 作为时间戳显示
```

### Exception Type Mapping

| type | 中文 |
| --- | --- |
| `late_arrival` | 迟到 |
| `early_leave` | 早退 |
| `service_incomplete` | 服务不完整 |
| `safety_risk` | 安全风险 |
| `other` | 其他 |

### Request Types

```ts
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
```

### Response Types

```ts
type ServiceRecordsResponse = {
  serviceRecords: ServiceRecord[];
  audioAssets: ServiceAudioAsset[];
  transcripts: ServiceTranscript[];
  serviceObjects: ServiceObject[];
  smartBadges: SmartBadge[];
  operationalState: WorkAreaOperationalState;
};

type ServiceRecordReviewResult = MutationResult & {
  serviceRecord: ServiceRecord;
};

type ServiceRecordExportResult = MutationResult & {
  exportId: string;
  fileVersion: string;
  exportedAt: string;
};
```

## 3. Endpoints

| Method | Path | 说明 |
| --- | --- | --- |
| GET | `/api/service-records` | 列表查询 |
| GET | `/api/service-records/:id` | 单条详情 |
| GET | `/api/service-records/:id/audio` | 音频资产（受权限控制） |
| GET | `/api/service-records/:id/transcript` | 转写文本 |
| PATCH | `/api/service-records/:id/review` | 复核操作 |
| POST | `/api/service-records/export` | 导出凭证包 |

### List Query

```ts
type ServiceRecordListQuery = {
  dateFrom?: string;
  dateTo?: string;
  socialWorkerId?: string;
  serviceObjectId?: string;
  badgeId?: string;
  reviewStatus?: ReviewStatus;
  exportStatus?: ExportStatus;
  search?: string;
};
```

## 4. Permission and Error Cases

- `full`: 完整权限，查看、复核和导出均可用。
- `read_only`: 列表和详情可见；复核和导出操作禁用。
- `restricted`: 原始音频不可播放，家属电话脱敏。
- `validation_error`: 无效的复核操作或导出筛选。
- `conflict`: 导出时存在未解决的复核阻塞且未选择带标记导出。

## 5. Fixture Coverage

| 场景 | 字段要求 |
| --- | --- |
| 待复核记录 | `reviewStatus: "needs_review"`，`assignmentConfidence < 0.7` |
| 已确认记录 | `reviewStatus: "confirmed"` |
| 信息不完整 | `reviewStatus: "info_incomplete"`，`missingFields` 非空 |
| 异常未闭环 | `reviewStatus: "exception_open"`，`serviceExceptions` 含 open |
| GPS 已匹配 | `locationEvidence.addressMatched: true` |
| GPS 需核实 | `locationEvidence.addressMatched: false` |
| 可导出 | `exportStatus: "exportable"` |
| 已导出 | `exportStatus: "exported"`，`exportHistory` 非空 |
| 带标记导出 | `exportStatus: "exported_with_flags"` |
| 有音频和转写 | `audioAssetId` + `transcriptId` 非空 |
| 有家属联系人 | `familyContactIds` 非空 |
| 有服务项（含流程和业务） | `serviceItems` 含 `category: "business"` 和 `category: "process"` 的条目 |
| 服务项含异常 | `serviceItems` 含 `status: "abnormal"` + `abnormalReason` |
| 服务项含跳过 | `serviceItems` 含 `status: "skipped"` |
| 服务项含音频证据 | `serviceItems` 含 `audioDurationSeconds` |
| 服务项含转写 | `serviceItems` 含 `transcript` |
| transcript 含多说话人 | `segments` 含 `speaker: "social_worker"` 和 `speaker: "service_object"` 条目，带 `speakerLabel` |
