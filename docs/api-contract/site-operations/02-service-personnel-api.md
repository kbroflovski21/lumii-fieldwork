# Service Personnel API Contract

状态：后端交接契约
日期：2026-05-15
Design spec：[`../../superpowers/specs/site-operations/02-service-personnel.md`](../../superpowers/specs/site-operations/02-service-personnel.md)

## 1. Scope

服务人员 API 管理站点服务人员目录、联系方式、人员类型/资质、可选常用工牌关系和正向反馈摘要。

智能工牌生命周期动作属于 [`03-devices-api.md`](03-devices-api.md)。排期分配和工作量属于 [`05-service-schedules-api.md`](05-service-schedules-api.md)。

## 2. Entity Shape

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
  status:
    | "pending_activation"
    | "available"
    | "in_use"
    | "offline"
    | "low_battery"
    | "sync_delayed"
    | "lost"
    | "disabled";
  lastSyncAt?: string;
};

type WorkerPraiseSummary = {
  praiseCount: number;
  latestPraiseAt?: string;
  latestPraiseExcerpt?: string;
};

type CreateSocialWorkerRequest = {
  name: string;
  phone: string;
  workerType: "service_personnel";
  qualificationLabels?: string[];
  preferredBadgeId?: string;
};

type UpdateSocialWorkerRequest = {
  name?: string;
  phone?: string;
  qualificationLabels?: string[];
  status?: SocialWorker["status"];
};

type UpdateWorkerBadgeBindingRequest = {
  preferredBadgeId?: string;
};
```

## 3. Endpoints

- `GET /api/social-workers`
- `POST /api/social-workers`
- `GET /api/social-workers/:id`
- `PATCH /api/social-workers/:id`
- `POST /api/social-workers/:id/archive`
- `PUT /api/social-workers/:id/badge-binding`

List query:

```ts
type SocialWorkerListQuery = ListQuery & {
  status?: SocialWorker["status"];
  qualification?: string;
  hasPreferredBadge?: boolean;
};
```

`ListQuery` is defined in [`00-global-api.md`](00-global-api.md).

## 4. Permission And Error Cases

- `read_only`: list and detail visible; create/update/archive/badge-binding disabled.
- `restricted`: phone may be masked if operator lacks contact permission.
- `conflict`: preferred badge is disabled, lost, or unavailable for the current site.
- `validation_error`: phone, name, or qualification input invalid.

## 5. Fixture Coverage

Examples must include:

- Active service personnel with a preferred badge.
- Active service personnel without a preferred badge.
- Disabled service personnel.
- Incomplete profile state.
- Praise count and latest praise signal.
