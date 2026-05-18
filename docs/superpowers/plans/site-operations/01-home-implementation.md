# Site Operations Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring `/site-operations` home into alignment with the approved home design and `01-home-api.md` contract before implementing later tabs.

**Architecture:** Keep the existing `SiteOperationsShell` and route structure. Refactor `HomeArea` so it consumes the documented home API shape directly, with small local rendering helpers for message bubbles, structured result cards, right-panel KPI/action/activity sections, and state notices. Keep API data at the `siteOperationsApi.getHome()` boundary; do not introduce a mock-only home response shape.

**Tech Stack:** React 19, TypeScript, Vite, Vitest + Testing Library, Playwright, lucide-react.

---

## Source Specs

- `docs/global-ui-guidance.md`
- `docs/superpowers/specs/site-operations/00-overall-design.md`
- `docs/superpowers/specs/site-operations/01-home.md`
- `docs/api-contract/site-operations/00-global-api.md`
- `docs/api-contract/site-operations/01-home-api.md`
- Current implementation:
  - `src/components/SiteOperations/SiteOperationsPage.tsx`
  - `src/features/siteOperations/SiteOperationsPage.tsx`
  - `src/features/siteOperations/SiteOperationsShell.tsx`
  - `src/features/siteOperations/HomeArea.tsx`
  - `src/features/siteOperations/contracts.ts`
  - `src/features/siteOperations/api.ts`
  - `src/features/siteOperations/useSiteOperationsData.ts`
  - `src/features/siteOperations/siteOperations.css`
  - `src/features/siteOperations/__tests__/SiteOperationsPage.test.tsx`
  - `tests/e2e/site-operations.spec.ts`

## Current Implementation Gaps

- `SiteOperationsHomeResponse` currently uses mock-only fields: `state`, `commandQuestions`, and `resultCards`.
- `HomeActivity` currently uses `actorType` and `text`, while the API contract defines `title` and optional `description`.
- The home right panel currently renders recent activity and recommended next step as KPI cards. The design requires compact KPI list, attention items, recommended action list, and activity list as separate elements.
- Mobile CSS hides `.site-home__side`, which violates the requirement that narrow screens must not directly hide the home overview.
- Home tests and Playwright fixtures are coupled to the old mock-only shape and need to become contract fixtures for `HomeResponse`.
- API contract docs are already the source of truth for this task. Do not edit `docs/api-contract/site-operations/01-home-api.md` in this implementation unless the user explicitly approves a contract change.

## Scenario To Test-Case Mapping

| Scenario | Actor / Permission | Runner | Suite | Test Case |
| --- | --- | --- | --- | --- |
| Operator opens `/site-operations` and lands on home | site operator / `full` | integration + local E2E | smoke | Shows shell, six work areas, message stream, right insight panel, command input |
| Operator scans the right insight panel | site operator / `full` | integration + local E2E | non-regression | KPI values, attention item, recommended action list, and activity list are separate and visible |
| Operator follows a recommended action | site operator / `full` | integration | non-regression | Clicking an action switches to the documented target workspace |
| Operator opens home on mobile | site operator / `full` | local E2E | smoke | Mobile bottom navigation and command input do not overlap; home overview remains visible as compact module |
| Home API returns `read_only` or `restricted` | site operator / non-full permission | integration | non-regression | Home remains readable; recommended actions can navigate; no mutation is exposed on home |
| Home API request fails | site operator / any | integration | non-regression | Home shows `agent_error`; other business work areas remain usable |

---

### Task 1: Align Home Contract Types And Fixtures

**Files:**
- Modify: `src/features/siteOperations/contracts.ts`
- Modify: `src/features/siteOperations/__tests__/SiteOperationsPage.test.tsx`
- Modify: `tests/e2e/site-operations.spec.ts`

- [ ] **Step 1: Write the failing integration fixture update**

In `src/features/siteOperations/__tests__/SiteOperationsPage.test.tsx`, replace `homeResponse` with the API-contract shape:

```ts
const homeResponse = {
  summary: {
    date: "2026-05-13",
    totalScheduledServices: 18,
    unassignedServices: 2,
    activeSocialWorkers: 7,
    onlineBadges: 6,
    recordsNeedReview: 3,
    exportableServiceRecords: 12
  },
  highlights: [
    {
      id: "highlight-001",
      type: "record_review",
      title: "3 条服务记录待复核",
      description: "优先处理助餐和陪诊记录。",
      severity: "warning",
      relatedEntityType: "service_record",
      relatedEntityId: "record-001"
    },
    {
      id: "highlight-002",
      type: "schedule_gap",
      title: "2 单服务待排",
      description: "今天还有 2 个服务对象需要补排。",
      severity: "critical",
      relatedEntityType: "service_schedule",
      relatedEntityId: "schedule-001"
    }
  ],
  activities: [
    {
      id: "activity-001",
      occurredAt: "2026-05-13T09:10:00+08:00",
      title: "今日还有 6 个服务对象未排期。",
      description: "建议先处理下午时间窗。"
    },
    {
      id: "activity-002",
      occurredAt: "2026-05-13T09:12:00+08:00",
      title: "智能工牌 FW-021 已接入站点，今日可用。"
    },
    {
      id: "activity-003",
      occurredAt: "2026-05-13T09:14:00+08:00",
      title: "4 条服务记录信息不完整，已放入服务记录。"
    }
  ],
  recommendedActions: [
    {
      id: "action-001",
      label: "去补排今日服务",
      targetWorkspace: "service_schedules",
      relatedEntityId: "schedule-001"
    },
    {
      id: "action-002",
      label: "复核服务记录",
      targetWorkspace: "service_records",
      relatedEntityId: "record-001"
    },
    {
      id: "action-003",
      label: "查看设备健康",
      targetWorkspace: "smart_badges",
      relatedEntityId: "badge-026"
    }
  ],
  permissionState: "full"
};
```

Update the home assertions in the first test so they expect the contract fields:

```ts
expect(screen.getByLabelText("首页对话流")).toHaveTextContent("今日还有 6 个服务对象未排期。");
expect(screen.getByLabelText("首页对话流")).toHaveTextContent("建议先处理下午时间窗。");
expect(screen.getByText("去补排今日服务")).toBeInTheDocument();
expect(screen.getByText("复核服务记录")).toBeInTheDocument();
expect(screen.getByText("查看设备健康")).toBeInTheDocument();
expect(screen.queryByText("commandQuestions")).not.toBeInTheDocument();
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
npm test -- src/features/siteOperations/__tests__/SiteOperationsPage.test.tsx -t "renders shell"
```

Expected: FAIL because `HomeArea` still reads `activity.text`, `resultCards`, `commandQuestions`, and `home.state`.

- [ ] **Step 3: Update home contract types**

In `src/features/siteOperations/contracts.ts`, replace the home-only mock types with the API contract:

```ts
export type SiteOperationsPermissionState = PermissionState;

export type HomeActivity = {
  id: string;
  occurredAt: string;
  title: string;
  description?: string;
  relatedEntityType?: HomeHighlight["relatedEntityType"];
  relatedEntityId?: string;
};

export type HomeRecommendedAction = {
  id: string;
  label: string;
  targetWorkspace: Exclude<WorkAreaId, "home">;
  relatedEntityId?: string;
};

export type SiteOperationsHomeResponse = {
  summary: HomeSummary;
  highlights: HomeHighlight[];
  activities: HomeActivity[];
  recommendedActions: HomeRecommendedAction[];
  permissionState: SiteOperationsPermissionState;
};
```

Remove `HomeState`, `HomeCommandQuestion`, and `HomeResultCard` only after `HomeArea` has been updated in Task 2.

- [ ] **Step 4: Update the Playwright home fixture to the same API-contract shape**

In `tests/e2e/site-operations.spec.ts`, replace its `homeResponse` with the same shape from Step 1. Keep the service-worker, device, object, schedule, and record fixtures unchanged.

- [ ] **Step 5: Run type-aware tests for the current failing state**

Run:

```bash
npm test -- src/features/siteOperations/__tests__/SiteOperationsPage.test.tsx
```

Expected: FAIL until Task 2 updates `HomeArea`.

---

### Task 2: Refactor HomeArea To Render The Contract Shape

**Files:**
- Modify: `src/features/siteOperations/HomeArea.tsx`
- Modify: `src/features/siteOperations/__tests__/SiteOperationsPage.test.tsx`

- [ ] **Step 1: Replace mock-only imports and local command response map**

In `src/features/siteOperations/HomeArea.tsx`, change the imports to use the contract types needed by the implementation:

```ts
import { ArrowUp } from "lucide-react";
import type {
  HomeActivity,
  HomeHighlight,
  HomeRecommendedAction,
  SiteOperationsHomeResponse,
  WorkAreaId
} from "./contracts";
import type { Resource } from "./useSiteOperationsData";
```

Remove `commandResponses`. Add local suggested questions because suggested prompts are UI affordances, not API response fields:

```ts
const suggestedQuestions = [
  "今天还有谁没排期？",
  "哪些智能工牌离线或未同步？",
  "哪些服务记录需要确认？",
  "哪些服务记录能导出？",
  "哪些服务对象需要优先关注？"
];
```

- [ ] **Step 2: Replace the home data destructuring**

Use the contract fields only:

```ts
const home = resource.data;
const { activities = [], highlights = [], recommendedActions = [], summary } = home;
const attentionItems = highlights.slice(0, 3);
const recentActivities = activities.slice(0, 4);
```

- [ ] **Step 3: Render message bubbles from `HomeActivity.title` and `description`**

Replace the activity loop with:

```tsx
{activities.map((activity) => (
  <MessageBubble activity={activity} key={activity.id} />
))}
```

Add this helper in the same file:

```tsx
function MessageBubble({ activity }: { activity: HomeActivity }) {
  return (
    <div className="site-message">
      <div className="site-bubble">
        <span>{activity.title}</span>
        {activity.description ? <small>{activity.description}</small> : null}
      </div>
      <time>{formatTime(activity.occurredAt)}</time>
    </div>
  );
}
```

- [ ] **Step 4: Replace `resultCards` with structured cards derived from highlights**

Use highlights as the structured result card source:

```tsx
{highlights.map((highlight) => (
  <article className="site-card site-home__focus" key={highlight.id}>
    <span className="site-status" data-tone={toneForSeverity(highlight.severity)}>
      {severityLabel(highlight.severity)}
    </span>
    <h2>{highlight.title}</h2>
    <p>{highlight.description}</p>
    <button
      className="site-row-action"
      onClick={() => onRoute?.(routeForEntity(highlight.relatedEntityType))}
      type="button"
    >
      打开{routeLabel(highlight.relatedEntityType)}
    </button>
  </article>
))}
```

Add helper functions:

```ts
function toneForSeverity(severity: HomeHighlight["severity"]) {
  if (severity === "critical") return "danger";
  if (severity === "warning") return "warning";
  return "muted";
}

function severityLabel(severity: HomeHighlight["severity"]) {
  if (severity === "critical") return "紧急";
  if (severity === "warning") return "需关注";
  return "信息";
}
```

- [ ] **Step 5: Render suggested questions without API mock fields**

Replace the existing `home.commandQuestions` block with:

```tsx
<section aria-label="推荐问题" className="site-command-suggestions">
  {suggestedQuestions.map((question) => (
    <button key={question} type="button">
      {question}
    </button>
  ))}
</section>
```

- [ ] **Step 6: Replace the right panel with distinct sections**

Replace the current `.site-home__side` content with:

```tsx
<aside className="site-home__side" aria-label="首页高亮信息">
  <header className="site-home__side-header">
    <h2>今日概览</h2>
    <time>{summary.date}</time>
  </header>

  <section aria-label="今日服务摘要" className="site-home__summary">
    <MetricCard label="今日服务" value={summary.totalScheduledServices} />
    <MetricCard label="待排缺口" value={summary.unassignedServices} />
    <MetricCard label="待复核" value={summary.recordsNeedReview} />
    <MetricCard label="在线工牌" value={summary.onlineBadges} />
  </section>

  <section aria-label="重点关注" className="site-home__attention">
    <h3>重点关注</h3>
    {attentionItems.map((highlight) => (
      <AttentionItem highlight={highlight} key={highlight.id} />
    ))}
  </section>

  <section aria-label="推荐下一步" className="site-home__actions">
    <h3>推荐下一步</h3>
    {recommendedActions.map((action) => (
      <button key={action.id} onClick={() => onRoute?.(action.targetWorkspace)} type="button">
        {action.label}
      </button>
    ))}
  </section>

  <section aria-label="最近动态" className="site-home__activity-list">
    <h3>最近动态</h3>
    {recentActivities.map((activity) => (
      <p key={activity.id}>
        <time>{formatTime(activity.occurredAt)}</time>
        <span>{activity.title}</span>
      </p>
    ))}
  </section>
</aside>
```

Add helper components:

```tsx
function AttentionItem({ highlight }: { highlight: HomeHighlight }) {
  return (
    <article data-severity={highlight.severity}>
      <strong>{highlight.title}</strong>
      <span>{highlight.description}</span>
    </article>
  );
}
```

- [ ] **Step 7: Replace `HomeStateNotice` with permission-aware notice**

Remove `HomeStateNotice`. Add this notice after the opening `.site-home__chat` div:

```tsx
{home.permissionState !== "full" ? (
  <div className="site-empty-state site-home__notice" role="status">
    <strong>{home.permissionState === "read_only" ? "只读模式" : "权限受限"}</strong>
    <span>首页态势可查看，具体操作权限由目标工作区控制。</span>
  </div>
) : null}
```

- [ ] **Step 8: Verify the focused integration test passes**

Run:

```bash
npm test -- src/features/siteOperations/__tests__/SiteOperationsPage.test.tsx -t "renders shell"
```

Expected: PASS.

- [ ] **Step 9: Add recommended action navigation coverage**

In `src/features/siteOperations/__tests__/SiteOperationsPage.test.tsx`, add:

```ts
it("routes from home recommended actions to target work areas", async () => {
  mockSiteOperationsFetch();
  const user = userEvent.setup();
  render(<SiteOperationsPage />);

  await screen.findByRole("region", { name: "首页" });
  await user.click(screen.getByRole("button", { name: "复核服务记录" }));

  expect(await screen.findByRole("region", { name: "服务记录" })).toBeInTheDocument();
  expect(screen.getByText("导出已选记录")).toBeInTheDocument();
});
```

- [ ] **Step 10: Add read-only and restricted home coverage**

In the existing `"state handling"` describe block, replace the `agent_processing` assertion with:

```ts
it("renders home permission states and keeps business work areas usable after home errors", async () => {
  const readOnly = render(<HomeArea resource={{ status: "success", data: { ...homeResponse, permissionState: "read_only" } as any }} />);
  expect(screen.getByText("只读模式")).toBeInTheDocument();
  readOnly.unmount();

  const restricted = render(<HomeArea resource={{ status: "success", data: { ...homeResponse, permissionState: "restricted" } as any }} />);
  expect(screen.getByText("权限受限")).toBeInTheDocument();
  restricted.unmount();
});
```

Add a separate failing fetch in this test for the home API error branch:

```ts
globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
  const path = input.toString();
  if (path === "/api/site-operations/home") {
    return new Response("failed", { status: 500 });
  }
  return Response.json({
    "/api/social-workers": socialWorkersResponse,
    "/api/smart-badges": smartBadgesResponse
  }[path] ?? {});
});

const user = userEvent.setup();
render(<SiteOperationsPage />);

expect(await screen.findByText("agent_error")).toBeInTheDocument();
await user.click(screen.getAllByRole("button", { name: "服务人员" })[0]);
expect(await screen.findByRole("region", { name: "服务人员" })).toBeInTheDocument();
```

- [ ] **Step 11: Run home-related integration tests**

Run:

```bash
npm test -- src/features/siteOperations/__tests__/SiteOperationsPage.test.tsx -t "home"
```

Expected: PASS.

---

### Task 3: Bring Home CSS Into The Global UI Contract

**Files:**
- Modify: `src/features/siteOperations/siteOperations.css`
- Test: `src/features/siteOperations/__tests__/SiteOperationsPage.test.tsx`
- Test: `tests/e2e/site-operations.spec.ts`

- [ ] **Step 1: Add CSS class expectations before changing CSS**

In the first integration test, add checks for the semantic right-panel sections:

```ts
expect(screen.getByLabelText("今日服务摘要")).toBeInTheDocument();
expect(screen.getByLabelText("重点关注")).toBeInTheDocument();
expect(screen.getByLabelText("推荐下一步")).toBeInTheDocument();
expect(screen.getByLabelText("最近动态")).toBeInTheDocument();
```

Run:

```bash
npm test -- src/features/siteOperations/__tests__/SiteOperationsPage.test.tsx -t "renders shell"
```

Expected: FAIL until Task 2 and the CSS class structure are in place.

- [ ] **Step 2: Normalize home right-panel section styles**

In `src/features/siteOperations/siteOperations.css`, add these home-specific styles near the existing `.site-home__side` rules:

```css
.site-home__side-header {
  align-items: start;
  display: flex;
  justify-content: space-between;
}

.site-home__side-header h2,
.site-home__attention h3,
.site-home__actions h3,
.site-home__activity-list h3 {
  font-size: 14px;
  font-weight: 720;
  line-height: 1.2;
  margin: 0;
}

.site-home__side-header time {
  color: var(--site-muted);
  font-size: 12px;
}

.site-home__attention,
.site-home__actions,
.site-home__activity-list {
  display: grid;
  gap: 8px;
}

.site-home__attention article {
  background: rgba(255, 255, 255, 0.56);
  border: 1px solid var(--site-line);
  border-radius: 12px;
  display: grid;
  gap: 5px;
  padding: 10px 11px;
}

.site-home__attention article[data-severity="critical"] {
  background: var(--site-danger-bg);
  color: var(--site-danger-text);
}

.site-home__attention article[data-severity="warning"] {
  background: var(--site-warning-bg);
  color: var(--site-warning-text);
}

.site-status[data-tone="danger"] {
  background: var(--site-danger-bg);
  color: var(--site-danger-text);
}

.site-home__attention span {
  color: inherit;
  font-size: 12px;
  line-height: 1.45;
}

.site-home__actions button {
  align-items: center;
  background: rgba(255, 255, 255, 0.62);
  border: 1px solid var(--site-line);
  border-radius: 10px;
  color: var(--site-accent);
  display: flex;
  font-size: 13px;
  font-weight: 680;
  min-height: 34px;
  padding: 8px 10px;
  text-align: left;
}

.site-home__activity-list p {
  display: grid;
  gap: 3px;
  margin: 0;
}

.site-home__activity-list time {
  color: var(--site-muted);
  font-size: 11px;
}

.site-home__activity-list span {
  color: #303845;
  font-size: 12px;
  line-height: 1.45;
}

.site-home__notice {
  align-items: start;
  min-height: 0;
  justify-content: start;
  padding: 10px 12px;
}
```

If `--site-danger-bg` and `--site-danger-text` are not defined, add them to `.site-operations-root`:

```css
--site-danger-bg: #fee2e2;
--site-danger-text: #b42318;
```

- [ ] **Step 3: Remove the mobile rule that hides the right insight panel**

In the `@media (max-width: 767px)` block, replace:

```css
.site-home__side {
  display: none;
}
```

with:

```css
.site-home {
  grid-template-rows: minmax(0, 1fr) auto auto;
}

.site-home__side {
  border-left: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.64);
  display: grid;
  gap: 10px;
  max-height: 34vh;
  overflow-y: auto;
  padding: 12px 16px;
}

.site-home__summary {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.site-home__summary article {
  min-height: 58px;
  padding: 9px;
}

.site-home__summary strong {
  font-size: 18px;
}
```

- [ ] **Step 4: Avoid long text inside KPI value**

Ensure `HomeArea` no longer renders activity text or recommended action text as `MetricCard.value`. KPI values must remain numeric or compact counts.

- [ ] **Step 5: Run focused integration tests**

Run:

```bash
npm test -- src/features/siteOperations/__tests__/SiteOperationsPage.test.tsx -t "renders shell"
```

Expected: PASS.

---

### Task 4: Update E2E Coverage For Contract And Responsive Behavior

**Files:**
- Modify: `tests/e2e/site-operations.spec.ts`

- [ ] **Step 1: Update the desktop home E2E assertions**

In `tests/e2e/site-operations.spec.ts`, update the first test:

```ts
await expect(page.getByLabel("首页对话流")).toContainText("今日还有 6 个服务对象未排期。");
await expect(page.getByLabel("首页对话流")).toContainText("建议先处理下午时间窗。");

const highlights = page.getByLabel("首页高亮信息");
await expect(highlights.getByLabel("今日服务摘要")).toContainText("今日服务");
await expect(highlights.getByLabel("重点关注")).toContainText("3 条服务记录待复核");
await expect(highlights.getByLabel("推荐下一步")).toContainText("去补排今日服务");
await expect(highlights.getByLabel("最近动态")).toContainText("智能工牌 FW-021 已接入站点");
```

- [ ] **Step 2: Add recommended action navigation E2E**

Add this test after the desktop home test:

```ts
test("routes from home recommended actions to the target work area", async ({ page }) => {
  await page.goto("/site-operations");

  await page.getByRole("button", { name: "复核服务记录" }).click();

  await expect(page.getByRole("region", { exact: true, name: "服务记录" })).toBeVisible();
  await expect(page.getByLabel("服务记录批量操作")).toContainText("导出已选记录");
});
```

- [ ] **Step 3: Add mobile home overview E2E before switching tabs**

At the start of `uses the mobile bottom navigation without re-enabling body scroll`, add:

```ts
await expect(page.getByLabel("首页高亮信息")).toBeVisible();
await expect(page.getByLabel("首页高亮信息").getByLabel("今日服务摘要")).toContainText("今日服务");
await expect(page.getByLabel("输入指令或问题")).toBeVisible();
```

- [ ] **Step 4: Run home E2E**

Run:

```bash
npm run test:e2e -- --grep "home|mobile"
```

Expected: PASS.

---

### Task 5: Final Verification And Handoff

**Files:**
- Verify: all modified files
- No production docs should change except this plan unless implementation reveals a spec conflict.

- [ ] **Step 1: Run full unit suite**

Run:

```bash
npm test
```

Expected: `4 passed` test files and all tests passing.

- [ ] **Step 2: Run production build**

Run:

```bash
npm run build
```

Expected: TypeScript build and Vite production build complete successfully.

- [ ] **Step 3: Run full Playwright suite**

Run:

```bash
npm run test:e2e
```

Expected: all Chromium E2E tests pass.

- [ ] **Step 4: Inspect diff**

Run:

```bash
git diff -- src/features/siteOperations/HomeArea.tsx src/features/siteOperations/contracts.ts src/features/siteOperations/siteOperations.css src/features/siteOperations/__tests__/SiteOperationsPage.test.tsx tests/e2e/site-operations.spec.ts
```

Expected: diff only covers home contract alignment, home rendering, home CSS, and home tests. `docs/api-contract/site-operations/01-home-api.md` remains unchanged.

- [ ] **Step 5: Commit**

Commit only the implementation files for this home task:

```bash
git add src/features/siteOperations/HomeArea.tsx \
  src/features/siteOperations/contracts.ts \
  src/features/siteOperations/siteOperations.css \
  src/features/siteOperations/__tests__/SiteOperationsPage.test.tsx \
  tests/e2e/site-operations.spec.ts
git commit -m "feat: align site operations home with contract"
```

Do not include unrelated local docs edits in this implementation commit unless the user explicitly asks to bundle them.

## Acceptance Checklist

- `/site-operations` opens to home.
- Home consumes `GET /api/site-operations/home` using the documented `HomeResponse` shape.
- Home no longer depends on `state`, `commandQuestions`, or `resultCards` response fields.
- Chat/event stream renders `HomeActivity.title` and optional `description`.
- Right insight panel separates compact KPIs, attention items, recommended action list, and activity list.
- Recommended actions route to their target workspaces.
- Mobile keeps home overview visible and does not overlap command input with bottom navigation.
- `read_only` and `restricted` home permission states keep the home readable.
- Home API failure shows `agent_error`, while business work areas remain usable.
- Full unit, build, and E2E verification pass before handoff.
