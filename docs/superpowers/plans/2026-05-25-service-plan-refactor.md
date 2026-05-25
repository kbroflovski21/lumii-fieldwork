# Service Plan Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor service plan creation to use Outlook-style recurring plan semantics with LLM-powered SOP matching, server-side dynamic occurrence computation, and one-click plan creation UX.

**Architecture:** AI parses natural language into a plan rule + matched SOPs. Plan creation writes a `ServicePlan` + bulk-generates 4 weeks of `ServiceSchedule` records, each linked to SOPs via junction tables. A dashboard-internal scheduler rolls the 4-week window forward daily. The schedule query API computes virtual occurrences beyond DB records using cadenceRule, so all frontends (site-ops, careworker H5) display them uniformly.

**Tech Stack:** TypeScript, Prisma ORM, MySQL, Qwen3-max (DashScope), Vitest

---

## File Structure

### New files:
- `server/scheduler/planScheduler.ts` — rolling 4-week schedule generator (setInterval)
- `server/lib/cadenceRule.ts` — cadenceRule parsing + date generation utility
- `tests/routes/service-plans.test.ts` — plan creation/cancel/SOP tests
- `tests/lib/cadenceRule.test.ts` — cadenceRule unit tests

### Modified files:
- `prisma/schema.prisma` — add description field, 2 new models, relations
- `prisma/seed.ts` — seed plan SOP associations
- `server/routes/ai.ts` — enhanced generate-schedule with SOP matching
- `server/routes/serviceObjects.ts` — plan create with SOPs + batch schedules
- `server/routes/serviceSchedules.ts` — dynamic occurrence computation
- `server/routes/sops.ts` — service SOP list endpoint
- `server/index.ts` — start scheduler on boot
- `src/features/siteOperations/ServiceObjectsArea.tsx` — textarea, summary card, plan display
- `src/features/siteOperations/SchedulesArea.tsx` — pass date range to API
- `src/features/siteOperations/contracts.ts` — updated types
- `src/careworker/CareworkerPage.tsx` — real schedule fetch with date range

---

### Task 1: Prisma Schema — New Models + Relations

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add description field to ServicePlan and new junction models**

In `prisma/schema.prisma`, add `description` field to the `ServicePlan` model (after `endDate` line), add `sopLinks` relation, and add the two new junction models at the end of the file before any trailing whitespace.

Add to `ServicePlan` model (after the `endDate` line):
```prisma
  description             String?    @map("description") @db.Text
```

Add to `ServicePlan` model (after the `exceptions` relation):
```prisma
  sopLinks    ServicePlanSop[]
```

Add to `ServiceSchedule` model (at the end, before `@@map`):
```prisma
  sopLinks ServiceScheduleSop[]
```

Add to `Sop` model (at the end, before `@@map`):
```prisma
  planLinks     ServicePlanSop[]
  scheduleLinks ServiceScheduleSop[]
```

Add these two new models at the end of the file:

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

- [ ] **Step 2: Generate Prisma client and push schema**

```bash
npx prisma generate
npx prisma db push --accept-data-loss
```

Expected: schema synced, 2 new tables created, `description` column added to `service_plans`.

- [ ] **Step 3: Push to staging**

```bash
# On staging server:
npx prisma db push --schema prisma/schema.prisma --url "$DATABASE_URL" --accept-data-loss
```

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add ServicePlanSop + ServiceScheduleSop models and plan description field"
```

---

### Task 2: CadenceRule Utility

**Files:**
- Create: `server/lib/cadenceRule.ts`
- Create: `tests/lib/cadenceRule.test.ts`

- [ ] **Step 1: Write tests for cadenceRule utility**

Create `tests/lib/cadenceRule.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { parseCadenceRule, generateDates } from "../../server/lib/cadenceRule";

describe("parseCadenceRule", () => {
  it("parses WEEKLY:1,3,5", () => {
    const result = parseCadenceRule("WEEKLY:1,3,5");
    expect(result).toEqual({ type: "weekly", days: [1, 3, 5] });
  });

  it("parses WEEKLY:1,2,3,4,5", () => {
    const result = parseCadenceRule("WEEKLY:1,2,3,4,5");
    expect(result).toEqual({ type: "weekly", days: [1, 2, 3, 4, 5] });
  });

  it("returns null for empty string", () => {
    expect(parseCadenceRule("")).toBeNull();
  });
});

describe("generateDates", () => {
  it("generates 4 weeks of Mon/Wed/Fri from a Monday start", () => {
    const dates = generateDates("WEEKLY:1,3,5", "2026-05-25", 28);
    expect(dates.length).toBe(12);
    expect(dates[0]).toBe("2026-05-25");
    expect(dates[1]).toBe("2026-05-27");
    expect(dates[2]).toBe("2026-05-29");
    expect(dates[3]).toBe("2026-06-01");
  });

  it("generates weekdays for WEEKLY:1,2,3,4,5", () => {
    const dates = generateDates("WEEKLY:1,2,3,4,5", "2026-05-25", 7);
    expect(dates.length).toBe(5);
  });

  it("returns empty for invalid rule", () => {
    expect(generateDates("", "2026-05-25", 28)).toEqual([]);
  });

  it("skips dates before startDate", () => {
    // Start on Wednesday, rule is Mon/Wed/Fri — should start from Wed
    const dates = generateDates("WEEKLY:1,3,5", "2026-05-27", 7);
    expect(dates[0]).toBe("2026-05-27");
    expect(dates[1]).toBe("2026-05-29");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/lib/cadenceRule.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement cadenceRule utility**

Create `server/lib/cadenceRule.ts`:

```typescript
export interface CadenceRule {
  type: "weekly";
  days: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
}

export function parseCadenceRule(rule: string): CadenceRule | null {
  if (!rule) return null;
  const match = rule.match(/^WEEKLY:([0-6,]+)$/);
  if (!match) return null;
  const days = match[1].split(",").map(Number).sort();
  return { type: "weekly", days };
}

export function generateDates(rule: string, startDate: string, rangeDays: number): string[] {
  const parsed = parseCadenceRule(rule);
  if (!parsed) return [];

  const start = new Date(startDate + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + rangeDays);

  const dates: string[] = [];
  const cursor = new Date(start);

  while (cursor < end) {
    if (parsed.days.includes(cursor.getDay())) {
      dates.push(cursor.toISOString().slice(0, 10));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/lib/cadenceRule.test.ts
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add server/lib/cadenceRule.ts tests/lib/cadenceRule.test.ts
git commit -m "feat: add cadenceRule parsing and date generation utility"
```

---

### Task 3: Enhanced AI Generate-Schedule Endpoint

**Files:**
- Modify: `server/routes/ai.ts`
- Modify: `server/routes/sops.ts` (add service SOP list helper)

- [ ] **Step 1: Add service SOP list helper in sops.ts**

At the end of `server/routes/sops.ts`, before `return r;`, add:

```typescript
  r.get("/sops/service-list", async (req, res) => {
    const rows = await prisma.sop.findMany({
      where: { type: "service", status: "active", published: true },
      select: { id: true, name: true, keywords: true },
      orderBy: { name: "asc" },
    });
    res.json({ sops: rows });
  });
```

- [ ] **Step 2: Rewrite the generate-schedule endpoint in ai.ts**

Replace the existing `r.post("/ai/generate-schedule", ...)` block (the entire handler) with:

```typescript
  r.post("/ai/generate-schedule", async (req, res) => {
    const { prompt, today } = req.body;
    if (!prompt) { res.status(400).json({ error: "prompt required" }); return; }
    if (!LLM_API_KEY) { res.json({ error: "AI 服务未配置" }); return; }

    // Fetch published service SOPs for matching
    const sops = await prisma.sop.findMany({
      where: { type: "service", status: "active", published: true },
      select: { id: true, name: true, keywords: true },
    });
    const sopList = sops.map(s => `- ID: ${s.id}, 名称: ${s.name}, 关键词: ${JSON.stringify(s.keywords)}`).join("\n");

    const currentDate = today || new Date().toISOString().slice(0, 10);
    const systemPrompt = `你是一个养老服务排期助手。用户用自然语言描述服务安排，你需要解析成结构化数据。

当前日期：${currentDate}（以此为基准计算"今天""明天""下周"等相对日期）

解析规则：
- "今天"就是当前日期本身
- "明天"是当前日期+1天
- "每周X"是周期性计划，isRecurring=true
- "每天"等同于每周一到周五（工作日），isRecurring=true
- 时间精确解析："下午2点到3点"→14:00-15:00
- 如果只说"上午"默认9:00-11:00，只说"下午"默认14:00-16:00
- cadenceRule格式：WEEKLY:1,3,5（数字是星期几，0=周日,1=周一,...6=周六）
- 非周期性的一次性服务：isRecurring=false，cadenceRule为空字符串
- startDate：周期计划取第一个匹配日期，一次性取具体日期

服务项目匹配：根据用户描述的服务内容，从以下已有服务项目中匹配：
${sopList}

输出严格JSON格式，不要输出其他文字：
{
  "plan": {
    "cadenceRule": "WEEKLY:1,3,5",
    "cadenceLabel": "每周一、三、五",
    "timeWindow": { "start": "HH:MM", "end": "HH:MM" },
    "startDate": "YYYY-MM-DD",
    "isRecurring": true,
    "serviceContent": "用户描述的服务内容摘要"
  },
  "matchedSopIds": ["sop-id-1", "sop-id-2"],
  "preview": [
    { "date": "YYYY-MM-DD", "dayLabel": "周X", "timeLabel": "上午/下午 HH:MM-HH:MM" }
  ]
}

preview只输出前3条。matchedSopIds只包含上面列表中存在的ID。`;

    try {
      const resp = await fetch(LLM_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${LLM_API_KEY}` },
        body: JSON.stringify({
          model: LLM_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          temperature: 0.1,
          max_tokens: 4000,
        }),
      });
      const data = await resp.json();
      let content = data.choices?.[0]?.message?.content ?? "";
      content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").replace(/<think>[\s\S]*?<\/think>/g, "").trim();
      const parsed = JSON.parse(content);

      // Resolve matched SOP names
      const matchedSops = sops
        .filter(s => (parsed.matchedSopIds ?? []).includes(s.id))
        .map(s => ({ id: s.id, name: s.name }));

      res.json({
        plan: parsed.plan,
        matchedSops,
        preview: parsed.preview ?? [],
      });
    } catch (err: any) {
      console.error("[ai] generate-schedule error:", err.message);
      res.json({ error: "AI 生成失败，请稍后重试。" });
    }
  });
```

Also add prisma import at the top of `ai.ts` if not already present:
```typescript
import { prisma } from "../db/prisma";
```

- [ ] **Step 3: Test manually**

```bash
curl -s http://localhost:3004/api/ai/generate-schedule \
  -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"prompt":"每周一三五上午10点到12点助餐","today":"2026-05-26"}'
```

Expected: JSON with `plan.cadenceRule`, `matchedSops`, `preview`.

- [ ] **Step 4: Commit**

```bash
git add server/routes/ai.ts server/routes/sops.ts
git commit -m "feat: enhanced AI schedule generation with SOP matching"
```

---

### Task 4: Service Plan Creation with SOPs + Batch Schedule Generation

**Files:**
- Modify: `server/routes/serviceObjects.ts`
- Create: `tests/routes/service-plans.test.ts`

- [ ] **Step 1: Write test for plan creation with SOPs**

Create `tests/routes/service-plans.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { generateDates } from "../../server/lib/cadenceRule";

describe("plan creation schedule generation", () => {
  it("generates correct number of schedules for 4 weeks", () => {
    const dates = generateDates("WEEKLY:1,3,5", "2026-05-25", 28);
    expect(dates.length).toBeGreaterThanOrEqual(11);
    expect(dates.length).toBeLessThanOrEqual(13);
    dates.forEach(d => {
      const day = new Date(d + "T00:00:00").getDay();
      expect([1, 3, 5]).toContain(day);
    });
  });

  it("all generated dates are >= startDate", () => {
    const dates = generateDates("WEEKLY:1,2,3,4,5", "2026-05-28", 28);
    dates.forEach(d => expect(d >= "2026-05-28").toBe(true));
  });
});
```

- [ ] **Step 2: Run test**

```bash
npx vitest run tests/routes/service-plans.test.ts
```

Expected: PASS.

- [ ] **Step 3: Rewrite plan creation endpoint in serviceObjects.ts**

Replace the existing `r.post("/service-objects/:id/service-plans", ...)` handler with:

```typescript
  r.post("/service-objects/:id/service-plans", async (req, res) => {
    const id = genId("plan");
    const b = req.body;
    const serviceObjectId = req.params.id;

    // 1. Create ServicePlan
    await prisma.servicePlan.create({
      data: {
        id,
        serviceObjectId,
        serviceProject: b.serviceProject ?? "长护险",
        cadenceRule: b.cadenceRule ?? "",
        cadenceLabel: b.cadenceLabel ?? "",
        preferredTimeWindow: b.preferredTimeWindow ?? {},
        startDate: b.startDate ?? new Date().toISOString().slice(0, 10),
        primarySocialWorkerId: b.primarySocialWorkerId ?? null,
        primarySocialWorkerName: b.primarySocialWorkerName ?? null,
        description: b.description ?? null,
        status: "active",
      },
    });

    // 2. Create plan-level SOP associations
    const sopIds: string[] = b.sopIds ?? [];
    if (sopIds.length > 0) {
      const sops = await prisma.sop.findMany({ where: { id: { in: sopIds } }, select: { id: true, name: true } });
      await prisma.servicePlanSop.createMany({
        data: sops.map(s => ({ planId: id, sopId: s.id, sopName: s.name })),
      });
    }

    // 3. Batch-generate 4 weeks of ServiceSchedule
    if (b.cadenceRule) {
      const { generateDates } = await import("../lib/cadenceRule");
      const obj = await prisma.serviceObject.findFirst({ where: { id: serviceObjectId }, select: { name: true, address: true, siteId: true, mapDisplayPoint: true, riskTags: true } });
      const dates = generateDates(b.cadenceRule, b.startDate ?? new Date().toISOString().slice(0, 10), 28);
      const tw = b.preferredTimeWindow ?? {};
      const scheduleData = dates.map(date => ({
        id: genId("schedule"),
        source: "service_plan" as const,
        servicePlanId: id,
        serviceObjectId,
        siteId: obj?.siteId ?? "site-001",
        serviceObjectName: obj?.name ?? "",
        serviceProject: b.serviceProject ?? "长护险",
        addressSnapshot: obj?.address ?? "",
        address: obj?.address ?? null,
        mapDisplayPoint: obj?.mapDisplayPoint ?? null,
        serviceDate: date,
        startTime: tw.start ?? null,
        endTime: tw.end ?? null,
        timeWindow: tw,
        assignedSocialWorkerId: b.primarySocialWorkerId ?? null,
        assignedSocialWorkerName: b.primarySocialWorkerName ?? null,
        status: "scheduled" as const,
        riskTags: obj?.riskTags ?? [],
      }));
      await prisma.serviceSchedule.createMany({ data: scheduleData });

      // 4. Copy plan SOPs to each schedule
      if (sopIds.length > 0) {
        const planSops = await prisma.servicePlanSop.findMany({ where: { planId: id } });
        const scheduleSopData = scheduleData.flatMap(sch =>
          planSops.map(ps => ({ scheduleId: sch.id, sopId: ps.sopId, sopName: ps.sopName }))
        );
        await prisma.serviceScheduleSop.createMany({ data: scheduleSopData });
      }
    }

    const row = await prisma.servicePlan.findFirst({
      where: { id },
      include: { sopLinks: { select: { sopId: true, sopName: true } } },
    });
    res.json(row);
  });
```

Add the import at the top of `serviceObjects.ts`:
```typescript
import { genId } from "./helpers";
```
(Already imported — verify it's there.)

- [ ] **Step 4: Add plan cancel endpoint**

After the plan creation endpoint, add:

```typescript
  r.post("/service-plans/:id/cancel", async (req, res) => {
    const planId = req.params.id;
    const today = new Date().toISOString().slice(0, 10);

    await prisma.servicePlan.update({
      where: { id: planId },
      data: { status: "archived" },
    });

    await prisma.serviceSchedule.updateMany({
      where: {
        servicePlanId: planId,
        serviceDate: { gte: today },
        status: { notIn: ["completed", "cancelled"] },
      },
      data: { status: "cancelled" },
    });

    res.json({ ok: true });
  });
```

- [ ] **Step 5: Add PATCH plan endpoint (Spec 2.3 — update description + re-match SOPs)**

After the cancel endpoint, add:

```typescript
  r.patch("/service-plans/:id", async (req, res) => {
    const planId = req.params.id;
    const { description, sopIds, cadenceRule, cadenceLabel, preferredTimeWindow } = req.body;
    const today = new Date().toISOString().slice(0, 10);

    const plan = await prisma.servicePlan.findFirst({ where: { id: planId } });
    if (!plan) { res.status(404).json({ error: "plan not found" }); return; }

    // 1. Update plan fields
    const updateData: any = {};
    if (description !== undefined) updateData.description = description;
    if (cadenceRule !== undefined) updateData.cadenceRule = cadenceRule;
    if (cadenceLabel !== undefined) updateData.cadenceLabel = cadenceLabel;
    if (preferredTimeWindow !== undefined) updateData.preferredTimeWindow = preferredTimeWindow;
    if (Object.keys(updateData).length > 0) {
      await prisma.servicePlan.update({ where: { id: planId }, data: updateData });
    }

    // 2. Update plan-level SOPs if provided
    if (Array.isArray(sopIds)) {
      await prisma.servicePlanSop.deleteMany({ where: { planId } });
      if (sopIds.length > 0) {
        const sops = await prisma.sop.findMany({ where: { id: { in: sopIds } }, select: { id: true, name: true } });
        await prisma.servicePlanSop.createMany({
          data: sops.map(s => ({ planId, sopId: s.id, sopName: s.name })),
        });

        // 3. Update all future schedule SOPs
        const futureSchedules = await prisma.serviceSchedule.findMany({
          where: { servicePlanId: planId, serviceDate: { gte: today }, status: { notIn: ["completed", "cancelled"] } },
          select: { id: true },
        });
        if (futureSchedules.length > 0) {
          const scheduleIds = futureSchedules.map(s => s.id);
          await prisma.serviceScheduleSop.deleteMany({ where: { scheduleId: { in: scheduleIds } } });
          const newSopData = scheduleIds.flatMap(schId =>
            sops.map(s => ({ scheduleId: schId, sopId: s.id, sopName: s.name }))
          );
          await prisma.serviceScheduleSop.createMany({ data: newSopData });
        }
      }
    }

    // 4. If cadenceRule changed, cancel future schedules and regenerate
    if (cadenceRule !== undefined && cadenceRule !== plan.cadenceRule) {
      await prisma.serviceSchedule.updateMany({
        where: { servicePlanId: planId, serviceDate: { gte: today }, status: { notIn: ["completed", "cancelled"] } },
        data: { status: "cancelled" },
      });

      if (cadenceRule) {
        const { generateDates } = await import("../lib/cadenceRule");
        const obj = await prisma.serviceObject.findFirst({
          where: { id: plan.serviceObjectId },
          select: { name: true, address: true, siteId: true, mapDisplayPoint: true, riskTags: true },
        });
        const tw = preferredTimeWindow ?? plan.preferredTimeWindow as any;
        const dates = generateDates(cadenceRule, today, 28);
        const scheduleData = dates.map(date => ({
          id: genId("schedule"),
          source: "service_plan" as const,
          servicePlanId: planId,
          serviceObjectId: plan.serviceObjectId,
          siteId: obj?.siteId ?? "site-001",
          serviceObjectName: obj?.name ?? "",
          serviceProject: plan.serviceProject,
          addressSnapshot: obj?.address ?? "",
          address: obj?.address ?? null,
          mapDisplayPoint: obj?.mapDisplayPoint ?? null,
          serviceDate: date,
          startTime: tw?.start ?? null,
          endTime: tw?.end ?? null,
          timeWindow: tw ?? {},
          assignedSocialWorkerId: plan.primarySocialWorkerId,
          assignedSocialWorkerName: plan.primarySocialWorkerName,
          status: "scheduled" as const,
          riskTags: obj?.riskTags ?? [],
        }));
        await prisma.serviceSchedule.createMany({ data: scheduleData });

        const planSops = await prisma.servicePlanSop.findMany({ where: { planId } });
        if (planSops.length > 0) {
          const sopData = scheduleData.flatMap(sch =>
            planSops.map(ps => ({ scheduleId: sch.id, sopId: ps.sopId, sopName: ps.sopName }))
          );
          await prisma.serviceScheduleSop.createMany({ data: sopData });
        }
      }
    }

    const updated = await prisma.servicePlan.findFirst({
      where: { id: planId },
      include: { sopLinks: { select: { sopId: true, sopName: true } } },
    });
    res.json(updated);
  });
```

- [ ] **Step 6: Enhance GET service-plans to include SOPs**

Find the existing `r.get("/service-objects/:id/service-plans", ...)` handler and update the query to include `sopLinks`:

```typescript
  r.get("/service-objects/:id/service-plans", async (req, res) => {
    const plans = await prisma.servicePlan.findMany({
      where: { serviceObjectId: req.params.id },
      include: {
        exceptions: true,
        sopLinks: { select: { sopId: true, sopName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ servicePlans: plans });
  });
```

- [ ] **Step 6: Commit**

```bash
git add server/routes/serviceObjects.ts tests/routes/service-plans.test.ts
git commit -m "feat: service plan creation with SOP associations and batch schedule generation"
```

---

### Task 5: Schedule Query with Dynamic Occurrence Computation

**Files:**
- Modify: `server/routes/serviceSchedules.ts`

- [ ] **Step 1: Add dynamic occurrence computation to GET endpoint**

In `server/routes/serviceSchedules.ts`, modify the main GET endpoint to:
1. Accept `rangeStart` and `rangeEnd` query params
2. After fetching DB schedules, compute projected occurrences from active plans

Add this helper function before the routes:

```typescript
import { generateDates } from "../lib/cadenceRule";

function computeProjectedOccurrences(
  plans: any[],
  rangeStart: string,
  rangeEnd: string,
  existingDates: Set<string>
) {
  const projected: any[] = [];
  for (const plan of plans) {
    if (plan.status !== "active" || !plan.cadenceRule) continue;
    const dates = generateDates(
      plan.cadenceRule,
      rangeStart > plan.startDate ? rangeStart : plan.startDate,
      Math.ceil((new Date(rangeEnd).getTime() - new Date(rangeStart > plan.startDate ? rangeStart : plan.startDate).getTime()) / 86400000)
    );
    const tw = plan.preferredTimeWindow ?? {};
    const planSops = (plan.sopLinks ?? []).map((s: any) => ({ sopId: s.sopId, sopName: s.sopName }));
    for (const date of dates) {
      const key = `${plan.id}:${date}`;
      if (existingDates.has(key)) continue;
      projected.push({
        id: `projected-${plan.id}-${date}`,
        source: "projected",
        servicePlanId: plan.id,
        serviceObjectId: plan.serviceObjectId,
        serviceObjectName: plan.serviceObject?.name ?? "",
        serviceProject: plan.serviceProject,
        addressSnapshot: plan.serviceObject?.address ?? "",
        address: plan.serviceObject?.address ?? null,
        mapDisplayPoint: plan.serviceObject?.mapDisplayPoint ?? null,
        serviceDate: date,
        startTime: tw.start ?? null,
        endTime: tw.end ?? null,
        timeWindow: tw,
        assignedSocialWorkerId: plan.primarySocialWorkerId,
        assignedSocialWorkerName: plan.primarySocialWorkerName,
        status: "scheduled",
        riskTags: plan.serviceObject?.riskTags ?? [],
        siteId: plan.serviceObject?.siteId ?? "site-001",
        sopLinks: planSops,
      });
    }
  }
  return projected;
}
```

Then modify the GET handler to use it. After fetching `rows` from DB, add:

```typescript
    // Dynamic occurrence computation for date ranges beyond DB window
    const rangeStart = req.query.rangeStart as string | undefined;
    const rangeEnd = req.query.rangeEnd as string | undefined;
    let projected: any[] = [];
    if (rangeStart && rangeEnd) {
      const plans = await prisma.servicePlan.findMany({
        where: { status: "active", ...(siteId ? { serviceObject: { siteId } } : {}) },
        include: {
          sopLinks: { select: { sopId: true, sopName: true } },
          serviceObject: { select: { name: true, address: true, siteId: true, mapDisplayPoint: true, riskTags: true } },
        },
      });
      const existingKeys = new Set(rows.map(r => `${r.servicePlanId}:${r.serviceDate}`));
      projected = computeProjectedOccurrences(plans, rangeStart, rangeEnd, existingKeys);
    }

    const allSchedules = [...enriched, ...projected].sort((a, b) => a.serviceDate.localeCompare(b.serviceDate));
```

Replace the final `res.json(...)` to return `allSchedules` instead of `enriched`.

- [ ] **Step 2: Include sopLinks in DB schedule responses**

Update the schedule query to include `sopLinks`:

```typescript
    const rows = await prisma.serviceSchedule.findMany({
      where,
      orderBy: { serviceDate: "asc" },
      include: { sopLinks: { select: { sopId: true, sopName: true } } },
    });
```

- [ ] **Step 3: Commit**

```bash
git add server/routes/serviceSchedules.ts
git commit -m "feat: schedule query with server-side dynamic occurrence computation"
```

---

### Task 6: Dashboard-Internal Scheduler

**Files:**
- Create: `server/scheduler/planScheduler.ts`
- Modify: `server/index.ts`

- [ ] **Step 1: Create planScheduler.ts**

```typescript
import { prisma } from "../db/prisma";
import { generateDates } from "../lib/cadenceRule";

function genScheduleId() {
  return `schedule-${crypto.randomUUID().slice(0, 8)}`;
}

export async function rollForwardSchedules() {
  const today = new Date().toISOString().slice(0, 10);
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 28);
  const horizonStr = horizon.toISOString().slice(0, 10);

  const plans = await prisma.servicePlan.findMany({
    where: { status: "active", cadenceRule: { not: "" } },
    include: {
      sopLinks: true,
      serviceObject: { select: { name: true, address: true, siteId: true, mapDisplayPoint: true, riskTags: true } },
    },
  });

  for (const plan of plans) {
    const latest = await prisma.serviceSchedule.findFirst({
      where: { servicePlanId: plan.id, status: { not: "cancelled" } },
      orderBy: { serviceDate: "desc" },
      select: { serviceDate: true },
    });

    const generateFrom = latest ? latest.serviceDate : plan.startDate;
    if (generateFrom >= horizonStr) continue;

    const startFrom = new Date(generateFrom);
    startFrom.setDate(startFrom.getDate() + 1);
    const startStr = startFrom.toISOString().slice(0, 10);

    const existingDates = new Set(
      (await prisma.serviceSchedule.findMany({
        where: { servicePlanId: plan.id, serviceDate: { gte: startStr } },
        select: { serviceDate: true },
      })).map(s => s.serviceDate)
    );

    const dates = generateDates(plan.cadenceRule, startStr,
      Math.ceil((horizon.getTime() - startFrom.getTime()) / 86400000));
    const newDates = dates.filter(d => !existingDates.has(d));
    if (newDates.length === 0) continue;

    const obj = plan.serviceObject;
    const tw = plan.preferredTimeWindow as any;
    const scheduleData = newDates.map(date => ({
      id: genScheduleId(),
      source: "service_plan" as const,
      servicePlanId: plan.id,
      serviceObjectId: plan.serviceObjectId,
      siteId: obj?.siteId ?? "site-001",
      serviceObjectName: obj?.name ?? "",
      serviceProject: plan.serviceProject,
      addressSnapshot: obj?.address ?? "",
      address: obj?.address ?? null,
      mapDisplayPoint: obj?.mapDisplayPoint ?? null,
      serviceDate: date,
      startTime: tw?.start ?? null,
      endTime: tw?.end ?? null,
      timeWindow: tw ?? {},
      assignedSocialWorkerId: plan.primarySocialWorkerId,
      assignedSocialWorkerName: plan.primarySocialWorkerName,
      status: "scheduled" as const,
      riskTags: obj?.riskTags ?? [],
    }));

    await prisma.serviceSchedule.createMany({ data: scheduleData });

    if (plan.sopLinks.length > 0) {
      const sopData = scheduleData.flatMap(sch =>
        plan.sopLinks.map(ps => ({ scheduleId: sch.id, sopId: ps.sopId, sopName: ps.sopName }))
      );
      await prisma.serviceScheduleSop.createMany({ data: sopData });
    }

    console.log(`[scheduler] plan ${plan.id}: generated ${newDates.length} new schedules`);
  }
}

export function startPlanScheduler() {
  console.log("[scheduler] plan scheduler started");
  rollForwardSchedules().catch(err => console.error("[scheduler] initial run failed:", err));
  setInterval(() => {
    rollForwardSchedules().catch(err => console.error("[scheduler] run failed:", err));
  }, 24 * 60 * 60 * 1000);
}
```

- [ ] **Step 2: Wire scheduler into server/index.ts**

Add at the top of `server/index.ts`:
```typescript
import { startPlanScheduler } from "./scheduler/planScheduler";
```

In the `httpServer.listen(...)` callback, after the console.log lines, add:
```typescript
  startPlanScheduler();
```

- [ ] **Step 3: Commit**

```bash
git add server/scheduler/planScheduler.ts server/index.ts
git commit -m "feat: dashboard-internal scheduler for rolling 4-week schedule generation"
```

---

### Task 7: Frontend Types Update

**Files:**
- Modify: `src/features/siteOperations/contracts.ts`

- [ ] **Step 1: Update TypeScript types**

Add SOP link type and update ServicePlan type in `contracts.ts`:

```typescript
export type SopLink = {
  sopId: string;
  sopName: string;
};

// Add to ServicePlan type (after exceptions field):
//   description?: string;
//   sopLinks?: SopLink[];

// Add to ServiceScheduleOccurrence type:
//   sopLinks?: SopLink[];
```

Add the `AiScheduleResult` type for the enhanced AI response:

```typescript
export type AiScheduleResult = {
  plan: {
    cadenceRule: string;
    cadenceLabel: string;
    timeWindow: { start: string; end: string };
    startDate: string;
    isRecurring: boolean;
    serviceContent: string;
  };
  matchedSops: Array<{ id: string; name: string }>;
  preview: Array<{ date: string; dayLabel: string; timeLabel: string }>;
};
```

- [ ] **Step 2: Commit**

```bash
git add src/features/siteOperations/contracts.ts
git commit -m "feat: add SOP link types and AiScheduleResult to contracts"
```

---

### Task 8: Frontend — Textarea Input + Plan Summary Card

**Files:**
- Modify: `src/features/siteOperations/ServiceObjectsArea.tsx`

This is the largest frontend change. The key modifications:

- [ ] **Step 1: Replace input with textarea**

In the AI input section (around line 727), find the `<input>` element with the AI prompt and replace with `<textarea>`:

```tsx
<textarea
  className="so-ai-input"
  rows={3}
  value={aiInput}
  onChange={(e) => setAiInput(e.target.value)}
  placeholder="描述服务安排，如：每周一三五上午10点到12点助餐、测血糖血压"
/>
```

Remove the `onKeyDown` handler that submits on Enter. The send button remains as-is for manual clicking.

- [ ] **Step 2: Replace GeneratedScheduleItem display with Plan Summary Card**

Add new state for the AI result:
```tsx
const [aiResult, setAiResult] = useState<AiScheduleResult | null>(null);
const [selectedSopIds, setSelectedSopIds] = useState<string[]>([]);
const [allServiceSops, setAllServiceSops] = useState<Array<{ id: string; name: string }>>([]);
```

Fetch service SOPs on mount:
```tsx
useEffect(() => {
  authFetch("/api/sops/service-list").then(r => r.json()).then(data => {
    setAllServiceSops(data.sops ?? []);
  }).catch(() => {});
}, []);
```

Update `handleGenerate` to store the full AI result:
```tsx
const handleGenerate = async () => {
  if (!aiInput.trim()) return;
  setGenerating(true);
  try {
    const today = new Date().toISOString().slice(0, 10);
    const resp = await authFetch("/api/ai/generate-schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: aiInput, today }),
    });
    const data = await resp.json();
    if (data.error) { setGenerating(false); return; }
    setAiResult(data);
    setSelectedSopIds((data.matchedSops ?? []).map((s: any) => s.id));
  } catch {}
  setGenerating(false);
};
```

Replace the generated items list with a summary card:
```tsx
{aiResult && (
  <div className="so-plan-summary-card">
    <h4>{aiResult.plan.isRecurring ? "周期服务计划" : "一次性服务排期"}</h4>
    <dl className="so-overview-grid">
      <div className="so-overview-item"><dt>服务内容</dt><dd>{aiResult.plan.serviceContent}</dd></div>
      {aiResult.plan.isRecurring && <div className="so-overview-item"><dt>频率</dt><dd>{aiResult.plan.cadenceLabel}</dd></div>}
      <div className="so-overview-item"><dt>时间</dt><dd>{aiResult.plan.timeWindow.start}-{aiResult.plan.timeWindow.end}</dd></div>
      <div className="so-overview-item"><dt>开始日期</dt><dd>{aiResult.plan.startDate}</dd></div>
    </dl>

    <div className="so-plan-sop-section">
      <strong>服务项目</strong>
      <div className="so-plan-sop-list">
        {allServiceSops.filter(s => selectedSopIds.includes(s.id)).map(s => (
          <label key={s.id} className="so-plan-sop-item">
            <input type="checkbox" checked onChange={() => setSelectedSopIds(prev => prev.filter(id => id !== s.id))} />
            {s.name}
          </label>
        ))}
      </div>
      <select
        className="so-plan-sop-add"
        value=""
        onChange={(e) => { if (e.target.value) setSelectedSopIds(prev => [...prev, e.target.value]); }}
      >
        <option value="">+ 添加服务项目</option>
        {allServiceSops.filter(s => !selectedSopIds.includes(s.id)).map(s => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
    </div>

    {aiResult.preview.length > 0 && (
      <div className="so-plan-preview">
        <strong>近期排期预览</strong>
        {aiResult.preview.map((p, i) => (
          <div key={i} className="so-plan-preview-item">{p.date} {p.dayLabel} {p.timeLabel}</div>
        ))}
        {aiResult.plan.isRecurring && <div className="so-plan-preview-note">将自动生成后续排期</div>}
      </div>
    )}

    <div className="so-plan-actions">
      <button className="sw-btn sw-btn--secondary" onClick={() => setAiResult(null)}>取消</button>
      <button className="sw-btn sw-btn--primary" onClick={handleCreatePlan}>
        {aiResult.plan.isRecurring ? "创建计划" : "创建排期"}
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 3: Implement handleCreatePlan**

```tsx
const handleCreatePlan = async () => {
  if (!aiResult) return;
  const p = aiResult.plan;
  if (p.isRecurring) {
    await authFetch(`/api/service-objects/${obj.id}/service-plans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: aiInput,
        cadenceRule: p.cadenceRule,
        cadenceLabel: p.cadenceLabel,
        preferredTimeWindow: p.timeWindow,
        startDate: p.startDate,
        serviceProject: "长护险",
        sopIds: selectedSopIds,
      }),
    });
  } else {
    await siteOperationsApi.createOneTimeServiceSchedule({
      serviceObjectId: obj.id,
      serviceProject: "长护险",
      serviceDate: p.startDate,
      timeWindow: p.timeWindow,
    });
  }
  setAiResult(null);
  setAiInput("");
  onMutate?.();
};
```

- [ ] **Step 4: Remove old GeneratedScheduleItem code**

Remove the `parseNaturalLanguageToSchedules` function, the `GeneratedScheduleItem` type, and all related state/handlers (`generatedItems`, `editingItemId`, `localPlans`, `planCreated`, `handleItemAction`, `handleItemUpdate`, `handleConfirmAll`, `persistSchedule`, `persistRecurringPlan`, `ScheduleItemEditor`). These are replaced by the plan summary card.

- [ ] **Step 5: Add plan cancel button to existing plans display**

In the "当前计划" section, add a cancel button for each plan:
```tsx
<button className="sw-btn sw-btn--ghost sw-btn--danger" onClick={async () => {
  if (!confirm("确定要取消此计划？所有未完成的排期将被取消。")) return;
  await authFetch(`/api/service-plans/${plan.id}/cancel`, { method: "POST" });
  onMutate?.();
}}>取消计划</button>
```

- [ ] **Step 6: Commit**

```bash
git add src/features/siteOperations/ServiceObjectsArea.tsx
git commit -m "feat: textarea AI input + plan summary card with SOP checklist"
```

---

### Task 9: Schedule Views — Pass Date Range

**Files:**
- Modify: `src/features/siteOperations/SchedulesArea.tsx`

- [ ] **Step 1: Update schedule data fetching to include date range**

In the schedule data hook or where the API is called, add `rangeStart` and `rangeEnd` params:

Find where `siteOperationsApi` calls the schedule endpoint and add the date range. The schedule area shows list/calendar views; the calendar view has a visible date range.

For the list view, pass current month range. For calendar view, pass the visible week/month range.

In `useSiteOperationsData.ts` (or wherever the schedule fetch happens), update the URL to include:
```typescript
const rangeStart = new Date().toISOString().slice(0, 10);
const rangeEnd = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
// Append to URL: `&rangeStart=${rangeStart}&rangeEnd=${rangeEnd}`
```

- [ ] **Step 2: Commit**

```bash
git add src/features/siteOperations/SchedulesArea.tsx src/features/siteOperations/useSiteOperationsData.ts
git commit -m "feat: pass date range to schedule API for dynamic occurrence display"
```

---

### Task 10: Careworker Calendar — Real Schedule Fetch

**Files:**
- Modify: `src/careworker/CareworkerPage.tsx`

- [ ] **Step 1: Replace mock data with real API fetch**

The careworker page currently uses `MOCK_TASKS`. Replace with a real API call to `/api/service-schedule-occurrences` with `rangeStart` and `rangeEnd` params covering the visible calendar range.

When the user navigates to a different month, re-fetch with the new date range. The API returns both DB-backed and projected occurrences — render them identically as calendar entries.

The careworker page has its own auth flow — ensure the schedule API call includes appropriate auth headers (the careworker's auth token).

- [ ] **Step 2: Commit**

```bash
git add src/careworker/CareworkerPage.tsx
git commit -m "feat: careworker calendar fetches real schedules with dynamic occurrence support"
```

---

### Task 11: Seed Data + Deploy

**Files:**
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Add SOP associations to seed plans**

In `prisma/seed.ts`, after the existing plan creation, add plan SOP associations:

```typescript
  await prisma.servicePlanSop.createMany({
    data: [
      { planId: "plan-001", sopId: "sop-service-001", sopName: "助餐服务SOP" },
      { planId: "plan-002", sopId: "sop-service-002", sopName: "助浴服务SOP" },
    ],
  });
```

- [ ] **Step 2: Deploy to staging**

```bash
# Build frontend
npx vite build

# Sync to staging
rsync -az --delete dist/ ubuntu@124.221.48.52:/home/ubuntu/lumii-goldenyears-dashboard/dist/
rsync -az server/ ubuntu@124.221.48.52:/home/ubuntu/lumii-goldenyears-dashboard/server/
rsync -az prisma/ ubuntu@124.221.48.52:/home/ubuntu/lumii-goldenyears-dashboard/prisma/

# On staging: push schema + restart
npx prisma db push --schema prisma/schema.prisma --url "$DATABASE_URL" --accept-data-loss
# Restart server process
```

- [ ] **Step 3: E2E verification**

1. Login as operator → open service object modal → "服务计划" tab
2. Type multi-line text in AI input → verify Enter creates newline
3. Click send → verify plan summary card appears with SOP checklist
4. Add/remove SOPs from checklist
5. Click "创建计划" → verify plan appears in list
6. Check "服务排期" tab → verify 4 weeks of schedules generated
7. Navigate calendar past 4 weeks → verify projected occurrences appear
8. Cancel a plan → verify future schedules cancelled
9. Login as careworker → verify calendar shows schedules

- [ ] **Step 4: Commit seed + final adjustments**

```bash
git add prisma/seed.ts
git commit -m "feat: seed plan SOP associations + deploy"
```
