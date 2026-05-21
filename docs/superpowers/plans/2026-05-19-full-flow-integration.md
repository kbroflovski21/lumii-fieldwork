# Full Flow Integration: Task Assignment → Recording → Review

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the complete business flow: careworker sees real assigned tasks from DB, selects one to start service in the simulator with full context (elderly person info, service type, SOP), processor uses that context for AI analysis, service record is linked back to the elderly person and task, and the quality dashboard shows real aggregated data.

**Architecture:** CareworkerPage fetches tasks from `/api/service-schedule-occurrences?workerId=X` instead of using hardcoded MOCK_TASKS. "Start service" navigates to `/careworker/hardware?scheduleId=X` which passes task context to the simulator. The simulator sends serviceObjectId, serviceProject, and clientContext in the WebSocket start message. The processor reads these from the start message instead of hardcoding. The internal API links the service record to the service object. QualityPage DashboardView fetches real service record stats.

**Tech Stack:** React 19, TypeScript, Express/Prisma (dashboard), Go WebSocket (processor)

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `server/routes/serviceSchedules.ts` | MODIFY | Add `workerId` query filter for careworker task fetch |
| `server/routes/internal.ts` | MODIFY | Accept and store serviceObjectId/Name in service record |
| `src/careworker/CareworkerPage.tsx` | MODIFY | Replace MOCK_TASKS with API fetch; navigate to simulator with scheduleId |
| `src/careworker/HardwareSimulator.tsx` | MODIFY | Accept task context props; send to processor in start message |
| `processor/pkg/protocol/messages.go` | MODIFY | Add context fields to StartMsg |
| `processor/internal/wsserver/server.go` | MODIFY | Pass context from start message to session |
| `processor/internal/event/orchestrator.go` | MODIFY | Use session context instead of hardcoded defaultSOP |
| `processor/internal/apiclient/client.go` | MODIFY | Add serviceObjectId/Name to payload |
| `src/quality/QualityPage.tsx` | MODIFY | DashboardView fetches real stats from service-records API |
| `prisma/seed.ts` | MODIFY | Assign tasks to the careworker users (sw-001/sw-002) |

---

### Task 1: Seed data — assign tasks to careworker users

**Files:**
- Modify: `prisma/seed.ts:198-208`

- [ ] **Step 1: Update seed schedules to use sw-001/sw-002 worker IDs**

In `prisma/seed.ts`, find the service schedules seed (around line 198-208). Change the `assignedSocialWorkerId` and `assignedSocialWorkerName` values so at least 3 schedules are assigned to `sw-001` (王建国) and 1 to `sw-002` (张敏). Also set one schedule date to today so the careworker sees a pending task.

Replace the schedules `data` array with:

```typescript
{ id: "schedule-001", source: "service_plan", servicePlanId: "plan-001", serviceObjectId: "object-001", serviceObjectName: "陈阿姨", serviceProject: "助餐", addressSnapshot: "上海市杨浦区控江路 1200 号", address: "上海市杨浦区控江路 1200 号", mapDisplayPoint: { latitude: 31.292, longitude: 121.515, label: "控江路 1200 号" }, serviceDate: new Date().toISOString().slice(0, 10), startTime: "09:00", endTime: "10:30", timeWindow: { start: "09:00", end: "10:30", label: "上午" }, assignedSocialWorkerId: "sw-001", assignedSocialWorkerName: "王建国", status: "scheduled", riskTags: ["独居"], siteId: "site-001" },
{ id: "schedule-002", source: "one_time", serviceObjectId: "object-003", serviceObjectName: "王奶奶", serviceProject: "探访关爱", addressSnapshot: "上海市杨浦区国顺路 500 号", address: "上海市杨浦区国顺路 500 号", serviceDate: new Date().toISOString().slice(0, 10), startTime: "14:00", endTime: "15:30", timeWindow: { start: "14:00", end: "15:30", label: "下午" }, assignedSocialWorkerId: "sw-001", assignedSocialWorkerName: "王建国", status: "scheduled", riskTags: [], siteId: "site-001" },
{ id: "schedule-003", source: "service_plan", servicePlanId: "plan-001", serviceObjectId: "object-001", serviceObjectName: "陈阿姨", serviceProject: "助餐", addressSnapshot: "上海市杨浦区控江路 1200 号", address: "上海市杨浦区控江路 1200 号", serviceDate: "2026-05-12", startTime: "09:30", endTime: "10:30", timeWindow: { start: "09:30", end: "10:30" }, assignedSocialWorkerId: "sw-001", assignedSocialWorkerName: "王建国", status: "completed", serviceRecordId: "record-001", riskTags: [], siteId: "site-001" },
{ id: "schedule-004", source: "service_plan", servicePlanId: "plan-002", serviceObjectId: "object-002", serviceObjectName: "李爷爷", serviceProject: "助浴", addressSnapshot: "上海市杨浦区长阳路 800 号", address: "上海市杨浦区长阳路 800 号", mapDisplayPoint: { latitude: 31.288, longitude: 121.525, label: "长阳路 800 号" }, serviceDate: new Date().toISOString().slice(0, 10), startTime: "10:00", endTime: "11:00", timeWindow: { start: "10:00", end: "11:00", label: "上午" }, assignedSocialWorkerId: "sw-002", assignedSocialWorkerName: "张敏", status: "scheduled", riskTags: ["认知障碍"], siteId: "site-001" },
{ id: "schedule-005", source: "one_time", serviceObjectId: "object-003", serviceObjectName: "王奶奶", serviceProject: "探访关爱", addressSnapshot: "上海市杨浦区国顺路 500 号", address: "上海市杨浦区国顺路 500 号", serviceDate: "2026-05-16", startTime: "09:00", endTime: "10:00", timeWindow: { start: "09:00", end: "10:00", label: "上午" }, assignedSocialWorkerId: "sw-001", assignedSocialWorkerName: "王建国", status: "scheduled", riskTags: [], siteId: "site-001" },
{ id: "schedule-006", source: "service_plan", servicePlanId: "plan-001", serviceObjectId: "object-001", serviceObjectName: "陈阿姨", serviceProject: "助餐", addressSnapshot: "上海市杨浦区控江路 1200 号", address: "上海市杨浦区控江路 1200 号", serviceDate: "2026-05-17", startTime: "09:00", endTime: "10:30", timeWindow: { start: "09:00", end: "10:30", label: "上午" }, status: "cancelled", notes: "家属临时取消", riskTags: [], siteId: "site-001" },
```

Also update service records seed (around line 228-249) to use `sw-001`/`sw-002` instead of `worker-001`/`worker-002`:
- `record-001`: change `socialWorkerId` from `"worker-001"` to `"sw-001"`, `socialWorkerName` from `"王丽"` to `"王建国"`
- `record-002`: change `socialWorkerId` from `"worker-002"` to `"sw-002"`, `socialWorkerName` from `"张敏"` to `"张敏"` (already correct name)

- [ ] **Step 2: Verify seed runs**

Run on target after deployment, or locally test the file has no syntax errors:
```bash
cd /opt/nursing-home-workspace/lumii-goldenyears-dashboard && npx tsc --noEmit prisma/seed.ts 2>&1 | head -5
```

---

### Task 2: Schedule API — add workerId filter + service object context

**Files:**
- Modify: `server/routes/serviceSchedules.ts:20-28`

- [ ] **Step 1: Add workerId and userId query filters**

In `serviceSchedulesRoutes()`, modify the GET handler to support filtering by worker. The careworker knows their `userId` (from login), but schedules use `assignedSocialWorkerId` (which is a `social_workers.id`). So we need to look up the social_worker by user_id first.

Replace the GET handler (lines 23-28) with:

```typescript
r.get("/service-schedule-occurrences", async (req, res) => {
  const siteId = req.query.siteId as string | undefined;
  const workerId = req.query.workerId as string | undefined;
  const userId = req.query.userId as string | undefined;
  
  const where: any = {};
  if (siteId) where.siteId = siteId;
  
  if (workerId) {
    where.assignedSocialWorkerId = workerId;
  } else if (userId) {
    const sw = await prisma.socialWorker.findFirst({ where: { userId }, select: { id: true } });
    if (sw) where.assignedSocialWorkerId = sw.id;
  }
  
  const rows = await prisma.serviceSchedule.findMany({ where, orderBy: { serviceDate: "asc" } });
  
  // Enrich with service object context for careworker use
  const serviceObjectIds = [...new Set(rows.map(r => r.serviceObjectId).filter(Boolean))];
  const objects = serviceObjectIds.length > 0
    ? await prisma.serviceObject.findMany({ where: { id: { in: serviceObjectIds } }, select: { id: true, careNotes: true, riskTags: true, serviceProjects: true, phone: true, age: true } })
    : [];
  const objMap = Object.fromEntries(objects.map(o => [o.id, o]));
  
  const enriched = rows.map(r => ({
    ...toApi(r),
    serviceObjectContext: objMap[r.serviceObjectId] ?? null,
  }));
  
  res.json(withOperationalState({ serviceSchedules: enriched }));
});
```

---

### Task 3: CareworkerPage — fetch real tasks from API

**Files:**
- Modify: `src/careworker/CareworkerPage.tsx`

- [ ] **Step 1: Add API fetch for schedules, replace MOCK_TASKS usage**

This is the biggest change. In the `CareworkerPage` component (line ~1695):

1. Add state for API tasks:
```typescript
const [apiTasks, setApiTasks] = useState<ServiceTask[]>([]);
const [tasksLoading, setTasksLoading] = useState(true);
```

2. Add a `useEffect` after the worker state is set (after line ~1722) to fetch real schedules:
```typescript
useEffect(() => {
  if (!worker) return;
  setTasksLoading(true);
  const token = localStorage.getItem("gy_careworker_token");
  fetch(`/api/service-schedule-occurrences?userId=${worker.id}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
    .then(res => res.json())
    .then(data => {
      const schedules = data.serviceSchedules ?? [];
      const tasks: ServiceTask[] = schedules
        .filter((s: any) => s.status !== "cancelled")
        .map((s: any) => ({
          id: s.id,
          serviceType: s.serviceProject || "探访关爱",
          recipientName: s.serviceObjectName || "",
          workerName: worker.name,
          date: s.serviceDate,
          dayOfWeek: DAY_NAMES[new Date(s.serviceDate).getDay()],
          startTime: s.startTime || "",
          endTime: s.endTime || "",
          location: s.addressSnapshot || s.address || "",
          locationShort: (s.addressSnapshot || "").split(/[路号]/).pop()?.slice(0, 6) || s.addressSnapshot?.slice(-8) || "",
          status: s.status === "completed" ? "completed" : s.status === "unassigned" ? "pending" : "pending" as TaskStatus,
          source: s.source === "service_plan" ? "周期计划" : "临时派单",
          notes: s.notes || "",
          serviceObjectId: s.serviceObjectId,
          serviceObjectContext: s.serviceObjectContext,
        }));
      setApiTasks(tasks);
      setTasksLoading(false);
    })
    .catch(() => setTasksLoading(false));
}, [worker]);
```

3. Add `serviceObjectId` and `serviceObjectContext` to the `ServiceTask` interface (around line 37):
```typescript
serviceObjectId?: string;
serviceObjectContext?: any;
```

4. Replace all `MOCK_TASKS` references with `apiTasks`:
   - `nextPendingStart` useMemo: change `MOCK_TASKS` to `apiTasks`
   - `tasksForDate` useMemo: change `MOCK_TASKS` to `apiTasks`
   - `totalPending` useMemo: change `MOCK_TASKS` to `apiTasks`

5. Change `handleStartService` to navigate to the simulator with the task context:
```typescript
const handleStartService = useCallback((taskId: string) => {
  const task = apiTasks.find(t => t.id === taskId);
  if (task) {
    window.location.href = `/careworker/hardware?scheduleId=${taskId}`;
  }
}, [apiTasks]);
```

---

### Task 4: HardwareSimulator — accept task context and pass to processor

**Files:**
- Modify: `src/careworker/HardwareSimulator.tsx`

- [ ] **Step 1: Add task context props**

Update the component interface and props. Add a `task` prop alongside the existing `worker` prop:

```typescript
interface SimulatorTask {
  scheduleId: string;
  serviceObjectId: string;
  serviceObjectName: string;
  serviceProject: string;
  clientContext: string;
}

export function HardwareSimulator({ worker, task }: { worker?: SimulatorWorker; task?: SimulatorTask }) {
```

- [ ] **Step 2: Include task context in WebSocket start message**

Find the `ws.send(JSON.stringify({ type: "start", ...}))` call. Add task fields:

```typescript
ws.send(JSON.stringify({
  type: "start",
  badge_id: badgeID,
  ts: new Date().toISOString(),
  worker_id: worker?.id ?? "",
  worker_name: worker?.name ?? "",
  service_object_id: task?.serviceObjectId ?? "",
  service_object_name: task?.serviceObjectName ?? "",
  service_project: task?.serviceProject ?? "",
  client_context: task?.clientContext ?? "",
  schedule_id: task?.scheduleId ?? "",
}));
```

- [ ] **Step 3: Show task info in header**

Update the subtitle to show the service context:
```typescript
<p>{task ? `${task.serviceProject} · ${task.serviceObjectName}` : worker ? `${worker.name} · ${worker.site}` : "GoldenYears"}</p>
```

---

### Task 5: CareworkerPage — wire task context to simulator

**Files:**
- Modify: `src/careworker/CareworkerPage.tsx`

- [ ] **Step 1: Parse scheduleId from URL and find task, pass to simulator**

In the `CareworkerPage` component, where it checks for the hardware path (line ~1792), build the task context from `apiTasks`:

```typescript
if (window.location.pathname.startsWith("/careworker/hardware")) {
  const params = new URLSearchParams(window.location.search);
  const scheduleId = params.get("scheduleId");
  const matchedTask = scheduleId ? apiTasks.find(t => t.id === scheduleId) : undefined;
  const simTask = matchedTask ? {
    scheduleId: matchedTask.id,
    serviceObjectId: matchedTask.serviceObjectId ?? "",
    serviceObjectName: matchedTask.recipientName,
    serviceProject: matchedTask.serviceType,
    clientContext: matchedTask.serviceObjectContext
      ? `注意事项: ${JSON.stringify(matchedTask.serviceObjectContext.careNotes ?? [])}; 风险标签: ${JSON.stringify(matchedTask.serviceObjectContext.riskTags ?? [])}`
      : "",
  } : undefined;
  return <HardwareSimulator worker={worker} task={simTask} />;
}
```

Note: this block must come AFTER the `apiTasks` fetch useEffect, so the tasks are loaded. Add a loading check:
```typescript
if (window.location.pathname.startsWith("/careworker/hardware")) {
  if (tasksLoading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>加载任务中...</div>;
  // ... rest of the logic above
}
```

---

### Task 6: Processor — extend StartMsg protocol with context fields

**Files:**
- Modify: `processor/pkg/protocol/messages.go:4-10`

- [ ] **Step 1: Add context fields to StartMsg**

```go
type StartMsg struct {
	Type              string `json:"type"`
	BadgeID           string `json:"badge_id"`
	TS                string `json:"ts"`
	WorkerID          string `json:"worker_id,omitempty"`
	WorkerName        string `json:"worker_name,omitempty"`
	ServiceObjectID   string `json:"service_object_id,omitempty"`
	ServiceObjectName string `json:"service_object_name,omitempty"`
	ServiceProject    string `json:"service_project,omitempty"`
	ClientContext     string `json:"client_context,omitempty"`
	ScheduleID        string `json:"schedule_id,omitempty"`
}
```

---

### Task 7: Processor — pass context from start message to session

**Files:**
- Modify: `processor/internal/wsserver/server.go:118-138`

- [ ] **Step 1: Set full context on session from start message**

Replace the existing worker-only context block (lines 129-134) with full context setting. After `s.sessions.StartSession(badgeID, sessionID)`:

```go
sess := s.sessions.GetSession(badgeID)
if sess != nil {
	if m.WorkerID != "" {
		sess.WorkerID = m.WorkerID
	}
	if m.ServiceObjectID != "" {
		sess.ClientID = m.ServiceObjectID
	}
	if m.ServiceProject != "" {
		sess.ServiceProject = m.ServiceProject
	}
	if m.ScheduleID != "" {
		sess.TaskID = m.ScheduleID
	}
	if m.ClientContext != "" {
		sess.ClientContext = m.ClientContext
	}
}
```

---

### Task 8: Processor orchestrator — use session context instead of hardcoded defaults

**Files:**
- Modify: `processor/internal/event/orchestrator.go:95-101`

- [ ] **Step 1: Read context from session, fall back to defaults**

Replace the hardcoded `SetContext` call in `OnRecordingStart` (line 101):

```go
// Set default SOP context for demo
o.sessions.SetContext(badgeID, defaultSOP, "", "", "", "探访关爱", "", "", "")
```

With:

```go
sess := o.sessions.GetSession(badgeID)
sopContext := defaultSOP
clientContext := ""
serviceProject := "探访关爱"
if sess != nil {
	if sess.ClientContext != "" {
		clientContext = sess.ClientContext
	}
	if sess.ServiceProject != "" {
		serviceProject = sess.ServiceProject
	}
}
o.sessions.SetContext(badgeID, sopContext, clientContext, "", "", serviceProject, "", "", "")
```

Note: We keep WorkerID and ClientID as already set by the wsserver (Task 7) — `SetContext` would overwrite them with empty strings. Instead, only set the fields that SetContext manages (sopContext, clientContext, serviceProject):

Actually, looking at `SetContext` — it sets ALL fields including WorkerID and ClientID. So we need to preserve the values already set:

```go
sess := o.sessions.GetSession(badgeID)
sopContext := defaultSOP
clientContext := ""
workerID := ""
clientID := ""
serviceProject := "探访关爱"
taskID := ""
if sess != nil {
	if sess.ClientContext != "" {
		clientContext = sess.ClientContext
	}
	if sess.ServiceProject != "" {
		serviceProject = sess.ServiceProject
	}
	workerID = sess.WorkerID
	clientID = sess.ClientID
	taskID = sess.TaskID
}
o.sessions.SetContext(badgeID, sopContext, clientContext, workerID, clientID, serviceProject, "", taskID, "")
```

---

### Task 9: Processor API client + orchestrator — include serviceObjectId in writeback

**Files:**
- Modify: `processor/internal/apiclient/client.go`
- Modify: `processor/internal/event/orchestrator.go` (processCompleteRecording)

- [ ] **Step 1: Add ServiceObjectId/Name to payload struct**

In `internal/apiclient/client.go`, add to `ServiceRecordPayload`:

```go
ServiceObjectID   string `json:"serviceObjectId,omitempty"`
ServiceObjectName string `json:"serviceObjectName,omitempty"`
ScheduleID        string `json:"scheduleId,omitempty"`
```

- [ ] **Step 2: Populate fields in orchestrator**

In `internal/event/orchestrator.go`, in the `processCompleteRecording` method where the payload is built, add:

```go
ServiceObjectID:   sess.ClientID,
ScheduleID:        sess.TaskID,
```

---

### Task 10: Dashboard internal API — store serviceObjectId and link schedule

**Files:**
- Modify: `server/routes/internal.ts`

- [ ] **Step 1: Add serviceObjectId/Name and scheduleId handling**

In the POST `/service-records` handler, when creating the service record via `prisma.serviceRecord.create`, add these fields to the data object:

```typescript
serviceObjectId: b.serviceObjectId ?? null,
serviceObjectName: b.serviceObjectName ?? null,
```

Also, after creating the record, if `b.scheduleId` is provided, update the schedule to link it:

```typescript
if (b.scheduleId) {
  await prisma.serviceSchedule.update({
    where: { id: b.scheduleId },
    data: { serviceRecordId: recordId, status: "completed" as any },
  }).catch(() => {});
}
```

Also look up the service object name if only ID is provided:
```typescript
let serviceObjectName = b.serviceObjectName ?? null;
if (!serviceObjectName && b.serviceObjectId) {
  const obj = await prisma.serviceObject.findFirst({ where: { id: b.serviceObjectId }, select: { name: true } });
  if (obj) serviceObjectName = obj.name;
}
```

---

### Task 11: QualityPage — fetch real service record stats

**Files:**
- Modify: `src/quality/QualityPage.tsx:177-277` (DashboardView function)

- [ ] **Step 1: Replace hardcoded KPIs with real data fetch**

In the `DashboardView` component (line 177), add API fetch:

```typescript
function DashboardView() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("gy_auth_token");
    fetch("/api/service-records", { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.json())
      .then(data => {
        const records = data.serviceRecords ?? [];
        const total = records.length;
        const needsReview = records.filter((r: any) => r.reviewStatus === "needs_review").length;
        const confirmed = records.filter((r: any) => r.reviewStatus === "confirmed").length;
        const avgConfidence = total > 0
          ? records.reduce((sum: number, r: any) => sum + (r.assignmentConfidence ?? 0), 0) / total
          : 0;
        
        setStats({
          total,
          needsReview,
          confirmed,
          completionRate: total > 0 ? Math.round((confirmed / total) * 100) : 0,
          avgConfidence: Math.round(avgConfidence * 100),
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);
```

Then replace the hardcoded `KPIs` rendering with dynamic data from `stats`. Keep the existing KPI card layout but use real values:

```typescript
const dynamicKPIs = stats ? [
  { label: "服务记录总量", value: String(stats.total), sub: "全部站点", trend: "", up: null },
  { label: "待审核", value: String(stats.needsReview), sub: "需要确认", trend: "", up: null },
  { label: "已确认", value: String(stats.confirmed), sub: `${stats.completionRate}%`, trend: "", up: null },
  { label: "平均置信度", value: `${stats.avgConfidence}%`, sub: "AI 分析", trend: "", up: null },
] : KPIs;
```

Use `dynamicKPIs` instead of `KPIs` in the rendering. If `loading` is true, show a loading state.

---

### Task 12: Build and deploy

- [ ] **Step 1: Build frontend**

```bash
cd /opt/nursing-home-workspace/lumii-goldenyears-dashboard && npx vite build
```

- [ ] **Step 2: Build processor**

```bash
cd /opt/nursing-home-workspace/lumii-goldenyears-processor && GOOS=linux GOARCH=amd64 go build -o /tmp/processor-v3 ./cmd/processor/
```

- [ ] **Step 3: Sync and redeploy dashboard**

```bash
rsync -az --exclude='node_modules' --exclude='.git' . ubuntu@81.68.254.22:/opt/goldenyears-dashboard/
ssh ubuntu@81.68.254.22 "cd /opt/goldenyears-dashboard && sed -i 's/3001:3001/30001:30001/' docker-compose.yml && sed -i 's/PORT=3001/PORT=30001/' docker-compose.yml && docker compose build && docker compose up -d"
```

- [ ] **Step 4: Re-seed database with updated data**

```bash
ssh ubuntu@81.68.254.22 "cd /opt/goldenyears-dashboard && docker compose run --rm dashboard npx prisma db seed"
```

- [ ] **Step 5: Upload and restart processor**

```bash
scp /tmp/processor-v3 ubuntu@81.68.254.22:/tmp/processor-v3
ssh ubuntu@81.68.254.22 "sudo systemctl stop goldenyears-processor && sleep 2 && sudo cp /tmp/processor-v3 /opt/goldenyears-processor/processor && sudo chmod +x /opt/goldenyears-processor/processor && sudo systemctl start goldenyears-processor"
```

- [ ] **Step 6: End-to-end verification**

1. Open `http://81.68.254.22:30001/careworker`, login as 13698455015/worker123
2. Verify real tasks appear (today's tasks from DB, not mock data)
3. Click "开始服务" on a pending task
4. Verify simulator opens with task context (service type and elderly name in header)
5. Record a short service, stop, verify service record is generated
6. Open `http://81.68.254.22:30001/` login as admin/admin123
7. Verify the new service record appears with correct worker name and elderly name
8. Verify quality dashboard shows real stats
