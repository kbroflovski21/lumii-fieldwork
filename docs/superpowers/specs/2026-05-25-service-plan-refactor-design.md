# Service Plan Refactor — Design Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor service plan creation to use LLM-powered scheduling with Outlook-style recurring plan semantics, SOP auto-matching, and simplified one-click confirmation UX.

**Architecture:** AI parses natural language into a recurring plan rule (stored once) + batch-generated schedule occurrences. SOP matching via LLM happens at plan creation/modification only. A dashboard-internal scheduler keeps a rolling 4-week window of concrete occurrences in DB; beyond that, views dynamically compute virtual occurrences from the plan rule.

**Tech Stack:** TypeScript (frontend + server), Prisma ORM, MySQL, Qwen3-max LLM (DashScope API)

---

## 1. Data Model Changes

### 1.1 ServicePlan — Add `description` field

```prisma
model ServicePlan {
  // ... existing fields ...
  description  String?  @map("description") @db.Text
  // ... existing fields ...
  sopLinks     ServicePlanSop[]
}
```

`description` stores the user's original natural language input (e.g., "每天上午11点上门进行助餐、测血糖血压"). Used when user modifies the plan to re-run LLM matching.

`serviceProject` field stays as-is (`"长护险"` default) — unchanged.

### 1.2 New: `service_plan_sops` (Plan-level SOP association)

```prisma
model ServicePlanSop {
  id        String   @id @default(uuid()) @db.VarChar(64)
  planId    String   @map("plan_id") @db.VarChar(64)
  sopId     String   @map("sop_id") @db.VarChar(64)
  sopName   String   @map("sop_name") @db.VarChar(255)
  createdAt DateTime @default(now()) @map("created_at")

  plan ServicePlan @relation(fields: [planId], references: [id], onDelete: Cascade)
  sop  Sop         @relation(fields: [sopId], references: [id], onDelete: Cascade)

  @@unique([planId, sopId])
  @@map("service_plan_sops")
}
```

Source of truth for SOP associations. New schedule occurrences (from scheduler or dynamic computation) inherit SOPs from here.

### 1.3 New: `service_schedule_sops` (Schedule-level SOP association)

```prisma
model ServiceScheduleSop {
  id         String   @id @default(uuid()) @db.VarChar(64)
  scheduleId String   @map("schedule_id") @db.VarChar(64)
  sopId      String   @map("sop_id") @db.VarChar(64)
  sopName    String   @map("sop_name") @db.VarChar(255)
  createdAt  DateTime @default(now()) @map("created_at")

  schedule ServiceSchedule @relation(fields: [scheduleId], references: [id], onDelete: Cascade)
  sop      Sop              @relation(fields: [sopId], references: [id], onDelete: Cascade)

  @@unique([scheduleId, sopId])
  @@map("service_schedule_sops")
}
```

Per-occurrence SOP list. Initially copied from plan-level SOPs; user can edit individual schedule's SOPs without affecting the plan.

### 1.4 Relation additions on existing models

Add to `Sop`:
```prisma
planLinks     ServicePlanSop[]
scheduleLinks ServiceScheduleSop[]
```

Add to `ServiceSchedule`:
```prisma
sopLinks ServiceScheduleSop[]
```

## 2. API Changes

### 2.1 `POST /api/ai/generate-schedule` — Enhance response

Current: returns `{ items: [...] }` with date/time/project per occurrence.

Change: also return plan-level metadata and matched SOPs.

**New response shape:**
```json
{
  "plan": {
    "description": "每天上午11点上门进行助餐、测血糖血压",
    "cadenceRule": "WEEKLY:1,2,3,4,5",
    "cadenceLabel": "每周一至周五",
    "timeWindow": { "start": "11:00", "end": "12:00" },
    "startDate": "2026-05-26",
    "isRecurring": true,
    "serviceProject": "助餐、健康检测"
  },
  "matchedSops": [
    { "id": "sop-service-001", "name": "助餐服务SOP" },
    { "id": "sop-service-003", "name": "健康检测SOP" }
  ],
  "preview": [
    { "date": "2026-05-26", "dayLabel": "周一", "timeLabel": "上午 11:00-12:00" },
    { "date": "2026-05-28", "dayLabel": "周三", "timeLabel": "上午 11:00-12:00" },
    { "date": "2026-05-30", "dayLabel": "周五", "timeLabel": "上午 11:00-12:00" }
  ]
}
```

The LLM prompt includes the list of published service-type SOPs (name + keywords) so it can match against user input. SOP matching happens server-side as part of this endpoint.

For non-recurring input (e.g., "今天下午2点上门服务"), `isRecurring=false` and `cadenceRule` is empty.

### 2.2 `POST /api/service-objects/:id/service-plans` — Enhance

Accept additional fields:
```json
{
  "description": "每天上午11点上门进行助餐、测血糖血压",
  "cadenceRule": "WEEKLY:1,2,3,4,5",
  "cadenceLabel": "每周一至周五",
  "preferredTimeWindow": { "start": "11:00", "end": "12:00" },
  "startDate": "2026-05-26",
  "serviceProject": "长护险",
  "sopIds": ["sop-service-001", "sop-service-003"]
}
```

Server-side on create:
1. Create `ServicePlan` record
2. Create `service_plan_sops` entries
3. Generate 4 weeks of `ServiceSchedule` from cadenceRule + timeWindow
4. For each schedule, copy `service_plan_sops` → `service_schedule_sops`
5. Return created plan with SOP names

### 2.3 `PATCH /api/service-plans/:id` — New: update plan description

When `description` changes:
1. Call LLM to re-match SOPs from new description
2. Update `service_plan_sops` (delete old, insert new)
3. Update all future `service_schedule_sops` (schedules where serviceDate >= today and status not "completed"/"cancelled")
4. If cadenceRule/timeWindow changed: cancel future schedules, regenerate

### 2.4 `POST /api/service-plans/:id/cancel` — Cancel plan

1. Set plan `status = "archived"`
2. Set all future schedules (serviceDate >= today, status not "completed") to `status = "suspended"`

> **Implementation note:** Final implementation uses `"suspended"` status (not `"cancelled"`) for schedules when a plan is cancelled/archived. This allows reactivation to restore the original schedules.

### 2.4b `POST /api/service-plans/:id/reactivate` — Reactivate plan

1. Set plan `status = "active"`
2. Restore all future `"suspended"` schedules to their appropriate status (`"scheduled"` if worker assigned, `"unassigned"` otherwise)
3. Generate any missing schedule occurrences for the next 4 weeks (skipping dates that already have non-cancelled schedules)
4. Copy plan-level SOPs to any newly generated schedules

### 2.4c `DELETE /api/service-plans/:id` — Delete plan

1. Find all future schedules (serviceDate >= today, status not "completed")
2. Delete associated `service_schedule_sops` for those schedules
3. Delete the future schedule records
4. Delete `service_plan_sops` and `service_plan_exceptions`
5. Delete the plan itself

> **Note:** Completed and past schedules are preserved as historical records. Only future non-completed schedules are removed.

### 2.5 `GET /api/service-objects/:id/service-plans` — Enhance

Include `sopLinks` in response:
```json
{
  "servicePlans": [{
    "id": "plan-001",
    "cadenceLabel": "每周一至周五",
    "description": "每天上午11点上门进行助餐、测血糖血压",
    "sops": [
      { "id": "sop-service-001", "name": "助餐服务SOP" },
      { "id": "sop-service-003", "name": "健康检测SOP" }
    ],
    ...
  }]
}
```

### 2.6 `GET /api/sops?type=service` — New: list service SOPs for picker

Return all published service-type SOPs for the SOP picker dropdown:
```json
{
  "sops": [
    { "id": "sop-service-001", "name": "助餐服务SOP" },
    { "id": "sop-service-002", "name": "助浴服务SOP" },
    ...
  ]
}
```

### 2.7 Schedule occurrence generation and display

**GET schedule endpoints** (`/api/service-schedule-occurrences`):
- Return DB records as-is for existing schedules
- Include `sopLinks` on each schedule for display

**Dynamic computation** (beyond 4-week DB window):
- Frontend computes virtual occurrences from active ServicePlan's `cadenceRule` + `preferredTimeWindow`
- Virtual occurrences display SOP from plan-level `sops` array
- Virtual occurrences are not editable (no DB record yet)

## 3. Dashboard-Internal Scheduler

A `setInterval` in the dashboard server process (not OS cron) runs daily:

```
Every 24 hours (at server startup + interval):
  For each ServicePlan where status = "active":
    Find latest generated ServiceSchedule date
    If latest < today + 28 days:
      Generate missing dates from cadenceRule
      Create ServiceSchedule records
      Copy service_plan_sops → service_schedule_sops for each new schedule
```

Edge cases:
- Plan exceptions (pause/skip): scheduler checks active exceptions before generating
- Plan was just created: skip if already has 4 weeks generated
- Server restart: runs immediately on startup, then every 24h

## 4. Frontend Changes

### 4.1 AI Input — Textarea

Replace `<input>` with `<textarea>`:
- Default: 3 rows visible
- Enter key: newline (not submit)
- Submit: click send button only
- Example prompts: click to fill textarea

### 4.2 AI Result — Plan Summary Card

After AI returns, display a summary card instead of individual schedule items:

**Recurring plan card:**
- Service description (editable)
- Frequency label (e.g., "每周一至周五")
- Time window (e.g., "上午 11:00-12:00")
- Start date (editable, date picker)
- Service projects checklist:
  - Each matched SOP shown as a checked item
  - Unchecked = removed from plan
  - "+ 添加服务项目" dropdown: shows all published service SOPs not already selected
- Preview: first 3 upcoming occurrences (read-only)
- Actions: [取消] [创建计划]

**One-time schedule card:**
- Date, time, service description
- Service projects checklist (same UX as above)
- Actions: [取消] [创建排期]

### 4.3 Existing Plans Display

Under "服务计划" tab:
- Each active plan: card with cadenceLabel, timeWindow, SOP list
- Click to expand: show upcoming schedules from this plan
- Actions: "暂停计划" / "取消计划" / "删除计划"
- Cancel plan: inline popover confirmation, then suspend all future schedules
- Delete plan: inline popover confirmation, deletes plan + future non-completed schedules
- Reactivate plan: restores suspended schedules and generates missing occurrences

**PlanEditModal:** Inline editing of plan fields (description, worker, cadence, SOPs) with changes propagated to future schedules via `PATCH /api/service-plans/:id`.

### 4.4 Schedule Views — Dynamic Computation (Server-Side)

Dynamic occurrence computation is done **server-side** in the schedule query API, not in each frontend client. This avoids duplicating cadenceRule parsing logic across site-operations frontend, careworker H5 page, and future clients.

> **Implementation note:** The `computeProjectedOccurrences` function correctly sets status to `"unassigned"` when no worker is assigned (not hardcoded `"scheduled"`). The `suspended` status is excluded from projection (suspended schedules remain as-is in DB).

**API change: `GET /api/service-schedule-occurrences`**

Accept optional `rangeStart` and `rangeEnd` query params (YYYY-MM-DD). When the requested range extends beyond existing DB records:

1. Query DB schedules in range as before
2. For each active `ServicePlan` whose `cadenceRule` covers dates in the requested range:
   - Compute virtual occurrences for dates not already in DB
   - Attach plan-level SOPs (`service_plan_sops`) to virtual occurrences
   - Mark virtual occurrences with `source: "projected"` (API-level flag, not shown in UI)
3. Merge DB + virtual occurrences, sorted by date
4. Return unified list — frontends render them identically

**Consumers (all use the same API, no client-side cadenceRule logic):**

- **Site Operations** — schedule list view + calendar view: pass the visible date range
- **Careworker H5** (`/careworker`) — calendar view: pass the selected month range, renders all occurrences (DB + projected) as normal calendar entries
- Dynamic occurrences are read-only (no edit/cancel — user must edit the plan from site operations)

### 4.5 Per-Schedule SOP Display

In schedule detail drawer/modal:
- Show "服务项目" section with checklist of associated SOPs
- User can add/remove SOPs on individual schedules (only for DB-backed schedules)
- Changes only affect that one schedule, not the plan

## 5. LLM Prompt Design

### 5.1 Schedule Generation + SOP Matching (combined)

The `/api/ai/generate-schedule` endpoint sends a single LLM call that:
1. Parses the natural language into structured schedule parameters
2. Matches against the provided list of service SOPs

System prompt includes:
- Current date for relative date resolution
- List of all published service-type SOPs (id, name, keywords)
- Instructions to output: plan metadata + matched SOP IDs + preview dates

Temperature: 0.1 (deterministic parsing)

### 5.2 Output format

```json
{
  "plan": {
    "cadenceRule": "WEEKLY:1,3,5",
    "cadenceLabel": "每周一、三、五",
    "timeWindow": { "start": "11:00", "end": "12:00" },
    "startDate": "2026-05-26",
    "isRecurring": true,
    "serviceContent": "助餐、测血糖血压"
  },
  "matchedSopIds": ["sop-service-001", "sop-service-003"],
  "preview": [...]
}
```

## 6. Files to Create/Modify

### New files:
- `server/scheduler/planScheduler.ts` — rolling 4-week schedule generator

### Modified files:
- `prisma/schema.prisma` — new models + relations
- `prisma/seed.ts` — seed data for new relations
- `server/routes/ai.ts` — enhanced generate-schedule endpoint
- `server/routes/serviceObjects.ts` — plan create/update with SOPs
- `server/routes/serviceSchedules.ts` — include sopLinks in responses
- `server/routes/sops.ts` — add service SOP list endpoint
- `server/index.ts` — start scheduler on boot
- `src/features/siteOperations/ServiceObjectsArea.tsx` — textarea, summary card, plan display
- `src/features/siteOperations/SchedulesArea.tsx` — dynamic occurrence computation
- `src/features/siteOperations/contracts.ts` — updated types
- `src/careworker/CareworkerPage.tsx` — careworker calendar passes date range to API, renders projected occurrences identically

## 7. Implementation Notes

### 7.1 Schedule statuses

The full set of schedule statuses in the implementation:

| Status | Meaning |
|---|---|
| `unassigned` | No worker assigned yet |
| `scheduled` | Worker assigned, awaiting execution |
| `completed` | Service record created |
| `cancelled` | Manually cancelled or replaced by cadence change |
| `suspended` | Plan was archived/cancelled; can be reactivated |

### 7.2 `useSiteOperationsData` eager fetching

The frontend data hook (`useSiteOperationsData.ts`) was updated to eagerly fetch data without waiting for idle status checks. The `siteId` change no longer triggers a `resetAll` — instead, the fetch effects depend on `[siteId, refetchKey]` and execute immediately when either changes. This fixes the "首页数据加载中" stuck state for admin users who have no default site selection.

### 7.3 Worker propagation on plan edit

When `PATCH /api/service-plans/:id` receives a `primarySocialWorkerId` change, the handler propagates the new worker to all future schedules (serviceDate >= today, status not completed/cancelled/suspended). Schedule status is updated to `"scheduled"` if a worker is assigned, or `"unassigned"` if the worker is removed.

## 8. Post-Implementation Updates (2026-05-26)

### 8.1 Date filter: simple button group

The schedule/record list views use a simple button group for date filtering: **全部 / 今天 / 本周 / 本月**. This matches the `RecordsArea` pattern. `react-datepicker` was evaluated and briefly integrated, but removed in favor of the simpler button group approach — it introduced unnecessary dependency weight and UX complexity for the common filtering use case.

### 8.2 Status filter: multi-select checkbox dropdown with position:fixed

The status filter uses a multi-select checkbox dropdown allowing operators to filter by multiple statuses simultaneously (e.g., show both "待分配" and "已排期"). The dropdown uses `position: fixed` with `getBoundingClientRect()` to avoid clipping by parent containers with `overflow` constraints. A chevron SVG `background-image` provides the visual dropdown indicator.

### 8.3 AI worker matching from description

When the AI generates a schedule from a natural language description, it now attempts to match an appropriate worker based on the description content (service type, location, skills). This is a best-effort matching step — operators can always override the assignment.

### 8.4 react-datepicker removal

`react-datepicker` was tried for the date filter but removed because:
- The button group (全部/今天/本周/本月) covers the dominant use cases
- It added ~40KB gzipped to the bundle
- The calendar picker UX was overkill for simple range presets
- Consistency with `RecordsArea` which already uses the button group pattern

### 8.5 mapDisplayPoint removed from ServiceObject

The `mapDisplayPoint` field (storing static lat/lng coordinates) was removed from the `ServiceObject` model. It was unreliable — hardcoded Shanghai coordinates were used as defaults, causing incorrect map centering for Hangzhou-based elders. The map now uses address-based geocoding to resolve coordinates dynamically, which is more accurate and does not require manual coordinate entry.
