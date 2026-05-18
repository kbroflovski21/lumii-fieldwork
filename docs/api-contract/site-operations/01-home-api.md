# Home API Contract

状态：后端交接契约
日期：2026-05-15
Design spec：[`../../superpowers/specs/site-operations/01-home.md`](../../superpowers/specs/site-operations/01-home.md)

## 1. Scope

首页 API 提供当天运营摘要、关键 highlight、最近活动和推荐动作。首页 API 只服务首页态势入口，不承载业务 tab 的完整列表、详情和 mutation。

## 2. Response Shape

```ts
type HomeSummary = {
  date: string;
  totalScheduledServices: number;
  unassignedServices: number;
  activeSocialWorkers: number;
  onlineBadges: number;
  recordsNeedReview: number;
  exportableServiceRecords: number;
};

type HomeHighlight = {
  id: string;
  type:
    | "schedule_gap"
    | "record_review"
    | "badge_issue"
    | "service_object_risk"
    | "export_ready";
  title: string;
  description: string;
  severity: "info" | "warning" | "critical";
  relatedEntityType:
    | "social_worker"
    | "badge"
    | "service_schedule"
    | "service_record"
    | "service_object";
  relatedEntityId: string;
};

type HomeActivity = {
  id: string;
  occurredAt: string;
  title: string;
  description?: string;
  relatedEntityType?: HomeHighlight["relatedEntityType"];
  relatedEntityId?: string;
};

type HomeRecommendedAction = {
  id: string;
  label: string;
  targetWorkspace:
    | "social_workers"
    | "smart_badges"
    | "service_objects"
    | "service_schedules"
    | "service_records";
  relatedEntityId?: string;
};

// exported as SiteOperationsHomeResponse in contracts.ts
type HomeResponse = {
  summary: HomeSummary;
  highlights: HomeHighlight[];
  activities: HomeActivity[];
  recommendedActions: HomeRecommendedAction[];
  permissionState: SiteOperationsPermissionState;
};
```

`SiteOperationsPermissionState` is defined in [`00-global-api.md`](00-global-api.md).

## 3. Endpoints

- `GET /api/site-operations/home`

Query:

```ts
type HomeQuery = {
  date?: string;
  siteId?: string;
};
```

## 4. Permission And Error Cases

- `read_only`: summary and highlights are visible; action targets still navigate but mutation is checked in the destination tab.
- `restricted`: sensitive service-record details are not included in highlights.
- `not_found`: site not found.
- `permission_denied`: current operator cannot access the site.

## 5. Fixture Coverage

Examples must include:

- At least one schedule gap.
- At least one badge issue.
- At least one record review highlight.
- At least one export-ready highlight.
- Activities that link to schedules, records, service objects, and devices.
