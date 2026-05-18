# Devices API Contract

状态：后端交接契约
日期：2026-05-15
Design spec：[`../../superpowers/specs/site-operations/03-devices.md`](../../superpowers/specs/site-operations/03-devices.md)

## 1. Scope

设备 API 管理站点智能工牌的完整生命周期：激活、站点归属、生命周期状态管理、电量和同步健康监控、常用服务人员关系维护、最近服务记录链接。

服务人员档案维护属于 [`02-service-personnel-api.md`](02-service-personnel-api.md)。服务记录复核、音频、转写和导出属于 [`06-service-records-api.md`](06-service-records-api.md)。

## 2. Entity Shape

### SmartBadge

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
```

### Request Types

```ts
type ActivateSmartBadgeRequest = {
  deviceCode: string;
  siteId: string;
  preferredWorkerId?: string;
};

type UpdateSmartBadgeRequest = {
  status?: SmartBadgeStatus;
  preferredWorkerId?: string | null;
};
```

### Response Types

```ts
type SmartBadgesResponse = {
  smartBadges: SmartBadge[];
  operationalState: WorkAreaOperationalState;
};

type ActivationResult = {
  ok: boolean;
  id: string;
  message: string;
  smartBadge: SmartBadge;
};
```

### Service Record Link

```ts
type SmartBadgeServiceRecordLink = {
  serviceRecordId: string;
  serviceDate: string;
  serviceObjectName?: string;
  serviceProject?: string;
  reviewStatus: "confirmed" | "needs_review" | "info_incomplete" | "exception_open";
};
```

### Status Mapping

| status | 中文 | UI tone | 说明 |
| --- | --- | --- | --- |
| `pending_activation` | 待激活 | muted | 尚未绑定站点 |
| `available` | 可用 | success | 已激活，可记录 |
| `in_use` | 使用中 | accent | 正在录音或上传服务证据 |
| `offline` | 离线 | warning | 需要连接关注 |
| `low_battery` | 低电量 | warning | `batteryPercent < 20`，需要充电 |
| `sync_delayed` | 同步延迟 | warning | `lastSyncAt` 超过 12 小时 |
| `lost` | 丢失 | danger | 已标记丢失 |
| `disabled` | 已停用 | muted | 已停用 |

### Lifecycle State Transitions

| 当前状态 | 可执行动作 | 目标状态 |
| --- | --- | --- |
| `pending_activation` | 激活 | `available` |
| `available` | 停用 | `disabled` |
| `available` | 标记丢失 | `lost` |
| `offline` | 停用 | `disabled` |
| `offline` | 标记丢失 | `lost` |
| `sync_delayed` | 停用 | `disabled` |
| `sync_delayed` | 标记丢失 | `lost` |
| `low_battery` | 停用 | `disabled` |
| `low_battery` | 标记丢失 | `lost` |
| `disabled` | 恢复 | `available` |
| `lost` | 恢复 | `available` |
| `in_use` | （不可执行任何状态变更） | — |

## 3. Endpoints

### GET /api/smart-badges

列表查询。

```ts
type SmartBadgeListQuery = {
  status?: SmartBadgeStatus;
  preferredWorkerId?: string;
  search?: string;
};
```

Response: `SmartBadgesResponse`

### GET /api/smart-badges/:id

单个设备详情。

Response: `SmartBadge`

### POST /api/smart-badges/activations

激活新工牌。

Request: `ActivateSmartBadgeRequest`
Response: `ActivationResult`

Error cases:
- `404`: 设备码不存在
- `409 conflict`: 设备码已绑定其他机构
- `409 already_activated`: 设备码已在当前站点激活
- `400 validation_error`: 设备码格式无效

### PATCH /api/smart-badges/:id

更新设备状态或常用人员。

Request: `UpdateSmartBadgeRequest`
Response: `SmartBadge`

Error cases:
- `404`: 设备不存在
- `409 invalid_transition`: 当前状态不允许该变更（如 `in_use` 状态不可停用）
- `400 validation_error`: 无效的状态值

### GET /api/smart-badges/:id/service-records

查询设备最近服务记录链接。

Response: `SmartBadgeServiceRecordLink[]`

## 4. Permission and Error Cases

- `full`: 完整权限，所有操作可用。
- `read_only`: 列表和详情可见；激活和生命周期动作禁用。
- `restricted`: 敏感信息隐藏，部分操作不可用。
- `conflict`: 设备码已绑定其他站点或机构，无法激活。
- `validation_error`: 设备码格式无效或不存在。
- `invalid_transition`: 当前状态不允许请求的状态变更。
- `not_found`: 设备 ID 或设备码不存在。

## 5. Fixture Coverage

`deploy/site-operations-api-fixture.mjs` 中的 `smartBadges` 数组必须覆盖：

| 场景 | 字段要求 |
| --- | --- |
| 已激活可用工牌 | `status: "available"`，有 `preferredWorkerId`/`preferredWorkerName`，有 `batteryPercent`，有 `recentServiceRecordIds` |
| 同步延迟工牌 | `status: "sync_delayed"`，有 `batteryPercent`，`lastSyncAt` 超过 12 小时 |
| 待激活工牌 | `status: "pending_activation"`，无 `batteryPercent`、无 `lastSyncAt`、无 `activatedAt` |
| 离线工牌 | `status: "offline"`，有 `batteryPercent` |
| 低电量工牌 | `status: "low_battery"`，`batteryPercent < 20` |
| 使用中工牌 | `status: "in_use"`，有 `lastRecordingAt`（接近当前时间） |
| 已停用工牌 | `status: "disabled"` |
| 丢失工牌 | `status: "lost"` |
