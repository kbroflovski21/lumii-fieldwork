# Service Schedules API Contract

状态：后端交接契约
日期：2026-05-15
Design spec：[`../../superpowers/specs/site-operations/05-service-schedules.md`](../../superpowers/specs/site-operations/05-service-schedules.md)

## 1. Scope

服务排期 API 管理由服务计划和按次请求生成的具体上门服务排期。支持列表、日历和地图三种视图，以及单条排期的调整（改时间、改人员、取消）。

创建服务通过 `服务对象` tab 的 AI 安排服务触发，调用本 API 的 POST 端点生成排期。本 tab UI 本身不展示创建入口。

周期服务计划编辑属于 [`04-service-objects-api.md`](04-service-objects-api.md)。已完成服务事实属于 [`06-service-records-api.md`](06-service-records-api.md)。

## 2. Entity Shape

### ServiceScheduleOccurrence

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
  status: ScheduleStatus;
  notes?: string;
  serviceRecordId?: string;
  planExceptionApplied?: boolean;
  mapQueryText?: string;
  latitude?: number;
  longitude?: number;
  riskTags: string[];
};

type ScheduleStatus =
  | "scheduled"
  | "assigned"
  | "adjusted"
  | "in_progress"
  | "completed"
  | "cancelled";
```

### Status Mapping

| status | 中文 | tone | 说明 |
| --- | --- | --- | --- |
| `scheduled` | 待执行 | muted | 排期已生成，尚未分配 |
| `assigned` | 已分配 | accent | 已分配服务人员（蓝色） |
| `adjusted` | 已调整 | warning | 受计划例外影响或手动调整（橙色） |
| `in_progress` | 进行中 | info | 服务人员已开始（青色 #ECFEFF/#0891B2） |
| `completed` | 已完成 | success | 已关联服务记录（绿色） |
| `cancelled` | 已取消 | muted | 已取消 |

### Source Mapping

| source | 中文 |
| --- | --- |
| `service_plan` | 周期计划 |
| `one_time` | 按次服务 |

### Request Types

```ts
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
```

### Response Types

```ts
type ServiceSchedulesResponse = {
  serviceSchedules: ServiceScheduleOccurrence[];
  operationalState: WorkAreaOperationalState;
};

type OneTimeScheduleResult = MutationResult & {
  serviceSchedule: ServiceScheduleOccurrence;
};

type ScheduleAdjustmentResult = MutationResult & {
  serviceSchedule: ServiceScheduleOccurrence;
};
```

## 3. Endpoints

| Method | Path | 说明 |
| --- | --- | --- |
| GET | `/api/service-schedule-occurrences` | 列表查询 |
| POST | `/api/service-schedule-occurrences` | 创建按次服务（由服务对象 tab 调用） |
| GET | `/api/service-schedule-occurrences/:id` | 单条详情 |
| PATCH | `/api/service-schedule-occurrences/:id` | 调整单条排期 |

### PATCH Behavior

当 PATCH 请求包含 `assignedSocialWorkerId` 时，后端自动从 `social_workers` 表查找对应的 `name` 字段，将其写入 `assignedSocialWorkerName`。前端无需在请求中传递 `assignedSocialWorkerName`。

### List Query

```ts
type ServiceScheduleListQuery = {
  dateFrom?: string;
  dateTo?: string;
  status?: ScheduleStatus;
  serviceObjectId?: string;
  assignedSocialWorkerId?: string;
  source?: "service_plan" | "one_time";
  search?: string;
};
```

## 4. Permission and Error Cases

- `full`: 完整权限，查看和调整均可用。
- `read_only`: 列表和详情可见；调整和取消操作禁用。
- `validation_error`: 日期、时间窗、服务人员无效。
- `conflict`: 调整后时间与计划例外或人员可用性冲突。
- `not_found`: 排期 ID 不存在。

## 5. Fixture Coverage

| 场景 | 字段要求 |
| --- | --- |
| 周期计划排期 | `source: "service_plan"`，有 `servicePlanId` |
| 按次服务排期 | `source: "one_time"` |
| 已分配 | `status: "assigned"`，有 `assignedSocialWorkerName` |
| 已调整（例外影响） | `status: "adjusted"`，`planExceptionApplied: true` |
| 已完成 | `status: "completed"`，有 `serviceRecordId` |
| 待执行 | `status: "scheduled"`，无 `assignedSocialWorkerId` |
| 已取消 | `status: "cancelled"` |
| 有风险标签 | `riskTags` 非空 |
| 有地图点 | `mapDisplayPoint` 非空 |
