# Service Objects API Contract

状态：后端交接契约
日期：2026-05-15
Design spec：[`../../superpowers/specs/site-operations/04-service-objects.md`](../../superpowers/specs/site-operations/04-service-objects.md)

## 1. Scope

服务对象 API 管理服务对象档案（基础信息、性别、地址、地图显示点）、服务资格、照护重点（风险标签、照护备注）、服务计划（周期/频次/时间窗/半固定人员）、计划例外（暂停/时间调整/人员替换/跳过）、AI 洞察摘要、家属联系人和订阅状态。

已完成服务事实和导出属于 [`06-service-records-api.md`](06-service-records-api.md)。已经生成的单条排期调整属于 [`05-service-schedules-api.md`](05-service-schedules-api.md)。

## 2. Entity Shape

### ServiceObject

```ts
type ServiceEligibilityType = "insurance" | "government" | "institution" | "self_paid";

type ServiceObjectState =
  | "normal"
  | "family_binding_pending"
  | "subscribed"
  | "risk_tagged"
  | "service_ineligible"
  | "plan_active"
  | "plan_paused"
  | "plan_exception_active";

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
```

### Eligibility Type Mapping

| eligibilityType | 中文 |
| --- | --- |
| `insurance` | 养护险 |
| `government` | 政府购买 |
| `institution` | 机构服务 |
| `self_paid` | 自费 |

### ServicePlan & Exceptions

```ts
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
```

### Exception Kind Mapping

| kind | 中文 | 所需额外字段 |
| --- | --- | --- |
| `pause` | 暂停 | `effectiveFrom`, `effectiveTo`, `note` |
| `time_change` | 时间调整 | `effectiveFrom`, `timeWindow` |
| `worker_change` | 人员替换 | `effectiveFrom`, `replacementSocialWorkerId` |
| `skip` | 跳过服务 | `effectiveFrom`, `note` |

### FamilyContact

```ts
type FamilyContact = {
  id: string;
  name: string;
  relation: string;
  phone: string;
  subscriptionStatus: "none" | "daily" | "weekly" | "monthly" | "exception_only";
  lastPushedAt?: string;
};
```

### Subscription Status Mapping

| subscriptionStatus | 中文 | tone |
| --- | --- | --- |
| `none` | 未订阅 | muted |
| `daily` | 日报 | success |
| `weekly` | 周报 | success |
| `monthly` | 月报 | success |
| `exception_only` | 仅异常 | warning |

### Request Types

```ts
type CreateServiceObjectRequest = {
  name: string;
  age?: number;
  address: string;
  mapDisplayPoint?: MapDisplayPoint;
  eligibilityType: ServiceEligibilityType;
  serviceProjects: string[];
  careNotes?: string[];
  riskTags?: string[];
};

type UpdateServiceObjectRequest = Partial<CreateServiceObjectRequest>;

type UpdateFamilySubscriptionsRequest = {
  familyContacts: FamilyContact[];
  familySubscriptionSummary: ServiceObject["familySubscriptionSummary"];
};

// Omit<ServicePlan, "id" | "exceptions" | "nextScheduleAt">
type CreateServicePlanRequest = {
  serviceObjectId: string;
  serviceProject: string;
  cadenceRule: string;
  cadenceLabel: string;
  preferredTimeWindow: TimeWindow;
  startDate: string;
  endDate?: string;
  primarySocialWorkerId?: string;
  status: "active" | "paused" | "archived";
};

type UpdateServicePlanRequest = Partial<CreateServicePlanRequest>;

// Omit<ServicePlanException, "id" | "servicePlanId">
type CreateServicePlanExceptionRequest = {
  kind: ServicePlanException["kind"];
  effectiveFrom: string;
  effectiveTo?: string;
  timeWindow?: TimeWindow;
  replacementSocialWorkerId?: string;
  note?: string;
};

type UpdateServicePlanExceptionRequest = Partial<CreateServicePlanExceptionRequest>;
```

安排服务说明：

- 从服务对象档案 Drawer 内的 AI 安排服务（自然语言输入）发起，不跳转页面。
- AI 解析自然语言生成多条服务项，用户逐条确认/取消/延期/修改。
- 确认后排期自动出现在 `服务排期` tab 的日历/列表中。
- 创建排期调用 `POST /api/service-schedule-occurrences`（属于排期 API）。

### Response Types

```ts
type ServiceObjectsResponse = {
  serviceObjects: ServiceObject[];
  servicePlans: ServicePlan[];
  operationalState: WorkAreaOperationalState;
};

type ServiceObjectMutationResult = {
  ok: boolean;
  id: string;
  message: string;
  serviceObject: ServiceObject;
};
```

## 3. Endpoints

| Method | Path | 说明 |
| --- | --- | --- |
| GET | `/api/service-objects` | 列表 |
| POST | `/api/service-objects` | 新增 |
| GET | `/api/service-objects/:id` | 单个详情 |
| PATCH | `/api/service-objects/:id` | 更新档案 |
| POST | `/api/service-objects/:id/archive` | 归档 |
| GET | `/api/service-objects/:id/insights` | 洞察详情 |
| PUT | `/api/service-objects/:id/family-subscriptions` | 更新家属订阅 |
| GET | `/api/service-objects/:id/service-plans` | 服务计划列表 |
| POST | `/api/service-objects/:id/service-plans` | 新增计划 |
| GET | `/api/service-plans/:id` | 单个计划详情 |
| PATCH | `/api/service-plans/:id` | 更新计划 |
| POST | `/api/service-plans/:id/archive` | 归档计划 |
| POST | `/api/service-plans/:id/exceptions` | 新增计划例外 |
| PATCH | `/api/service-plan-exceptions/:id` | 更新计划例外 |

## 4. Permission and Error Cases

- `full`: 完整权限，所有操作可用。
- `read_only`: 档案、计划、洞察和家属可见；新增、编辑、归档禁用。
- `restricted`: 家属电话脱敏显示。
- `validation_error`: 地址、地图点、资格类型、频次规则或时间窗无效。
- `conflict`: 计划例外与已有例外时间冲突。
- `not_found`: 服务对象、计划或例外 ID 不存在。

## 5. Fixture Coverage

| 场景 | 字段要求 |
| --- | --- |
| 有活跃服务计划 | `servicePlanSummaries` 含 `status: "active"`，有 `primarySocialWorkerName` |
| 有暂停计划 | `status: "paused"` |
| 有活跃计划例外 | 含 pause/time_change/worker_change/skip 四种 |
| 有风险标签 | `riskTags` 非空 |
| 有照护备注 | `careNotes` 非空 |
| 有 AI 洞察 | `insightSummaries` 含 info/warning severity |
| 有家属订阅 | daily/weekly/monthly/exception_only |
| 无家属订阅 | `familySubscriptionSummary: "none"` |
| 养护险资格 | `eligibilityType: "insurance"` |
| 政府购买资格 | `eligibilityType: "government"` |
| 已归档 | 归档状态 |
