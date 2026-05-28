# Modal-to-Detail-Page Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace 11 modal overlays with full-page detail views using a shared `DetailPageShell` breadcrumb wrapper, preserving all data and behavior.

**Architecture:** Conditional rendering inside each Area component. When `routeId` is present, render a detail/create page instead of the list. A shared `DetailPageShell` provides breadcrumb header + back navigation. No router changes needed.

**Tech Stack:** React, react-router-dom, existing CSS variables (`--site-*`, `--quality-*`), Vitest + React Testing Library

---

## File Structure

### New files
| File | Responsibility |
|------|---------------|
| `src/shared/DetailPageShell.tsx` | Shared breadcrumb header wrapper |
| `src/shared/detail-page.css` | CSS for detail page layout |
| `src/shared/__tests__/DetailPageShell.test.tsx` | Unit tests for shell |

### Modified files (per-area modal→page conversions)
| File | Change |
|------|--------|
| `src/features/siteOperations/SocialWorkersArea.tsx` | Replace `sw-scrim` + `so-modal` with `DetailPageShell` in ViewModal/CreateModal; change main render from overlay to conditional |
| `src/features/siteOperations/SmartBadgesArea.tsx` | Same for ViewDrawer |
| `src/features/siteOperations/SchedulesArea.tsx` | Same for ScheduleDrawer |
| `src/features/siteOperations/ServiceObjectsArea.tsx` | Same for ViewModal/CreateModal |
| `src/features/siteOperations/RecordsArea.tsx` | Same for RecordDrawer |
| `src/quality/QualityPage.tsx` | Same for SiteDetailModal/SiteCreateModal/UserDetailModal/CreateUserModal |

---

### Task 1: Create DetailPageShell component + CSS + tests

**Files:**
- Create: `src/shared/DetailPageShell.tsx`
- Create: `src/shared/detail-page.css`
- Create: `src/shared/__tests__/DetailPageShell.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/shared/__tests__/DetailPageShell.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { DetailPageShell } from "../DetailPageShell";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderShell(props?: Partial<React.ComponentProps<typeof DetailPageShell>>) {
  return render(
    <MemoryRouter>
      <DetailPageShell
        parentLabel="长者"
        parentPath="/elders"
        title="李明"
        {...props}
      >
        <div data-testid="child-content">Detail content</div>
      </DetailPageShell>
    </MemoryRouter>,
  );
}

describe("DetailPageShell", () => {
  beforeEach(() => mockNavigate.mockClear());

  it("renders breadcrumb with parent label and title", () => {
    renderShell();
    expect(screen.getByText("长者")).toBeInTheDocument();
    expect(screen.getByText("李明")).toBeInTheDocument();
  });

  it("renders children in the body area", () => {
    renderShell();
    expect(screen.getByTestId("child-content")).toBeInTheDocument();
  });

  it("navigates to parentPath when back arrow is clicked", async () => {
    renderShell();
    const user = userEvent.setup();
    await user.click(screen.getByLabelText("返回"));
    expect(mockNavigate).toHaveBeenCalledWith("/elders");
  });

  it("navigates to parentPath when parent label is clicked", async () => {
    renderShell();
    const user = userEvent.setup();
    await user.click(screen.getByText("长者"));
    expect(mockNavigate).toHaveBeenCalledWith("/elders");
  });

  it("renders optional action buttons", () => {
    renderShell({ actions: <button>编辑</button> });
    expect(screen.getByText("编辑")).toBeInTheDocument();
  });

  it("has correct CSS structure classes", () => {
    const { container } = renderShell();
    expect(container.querySelector(".detail-page")).toBeTruthy();
    expect(container.querySelector(".detail-page__header")).toBeTruthy();
    expect(container.querySelector(".detail-page__body")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/__tests__/DetailPageShell.test.tsx`
Expected: FAIL — module `../DetailPageShell` not found

- [ ] **Step 3: Implement DetailPageShell component**

Create `src/shared/detail-page.css`:

```css
.detail-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.detail-page__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 24px;
  border-bottom: 1px solid var(--site-line, #DDD5CC);
  flex-shrink: 0;
  background: var(--site-card, #FFFCF8);
}

.detail-page__back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: none;
  color: var(--site-muted, #A89E96);
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
  transition: background 150ms;
}
.detail-page__back:hover {
  background: var(--site-muted-bg, #EDE7E0);
  color: var(--site-text, #2D2520);
}

.detail-page__breadcrumb {
  font-size: 14px;
  color: var(--site-muted, #A89E96);
  cursor: pointer;
  border: none;
  background: none;
  padding: 0;
  font-family: inherit;
  transition: color 150ms;
}
.detail-page__breadcrumb:hover {
  color: var(--site-text, #2D2520);
}

.detail-page__sep {
  font-size: 14px;
  color: var(--site-line, #DDD5CC);
  user-select: none;
}

.detail-page__title {
  font-size: 15px;
  font-weight: 600;
  color: var(--site-text, #2D2520);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.detail-page__actions {
  margin-left: auto;
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.detail-page__body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}
```

Create `src/shared/DetailPageShell.tsx`:

```tsx
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import "./detail-page.css";

interface DetailPageShellProps {
  parentLabel: string;
  parentPath: string;
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function DetailPageShell({ parentLabel, parentPath, title, actions, children }: DetailPageShellProps) {
  const navigate = useNavigate();
  const goBack = () => navigate(parentPath);

  return (
    <div className="detail-page">
      <div className="detail-page__header">
        <button className="detail-page__back" onClick={goBack} type="button" aria-label="返回">
          <ChevronLeft size={18} />
        </button>
        <button className="detail-page__breadcrumb" onClick={goBack} type="button">
          {parentLabel}
        </button>
        <span className="detail-page__sep">/</span>
        <span className="detail-page__title">{title}</span>
        {actions && <div className="detail-page__actions">{actions}</div>}
      </div>
      <div className="detail-page__body">
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/shared/__tests__/DetailPageShell.test.tsx`
Expected: 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/DetailPageShell.tsx src/shared/detail-page.css src/shared/__tests__/DetailPageShell.test.tsx
git commit -m "feat: add DetailPageShell component for modal-to-page refactor"
```

---

### Task 2: Convert SocialWorkersArea modals to detail pages

**Files:**
- Modify: `src/features/siteOperations/SocialWorkersArea.tsx`

The transformation pattern for every modal is identical:
1. **Remove** the `sw-scrim` button and the outer `so-modal` / `so-modal--view` / `so-modal--form` div wrapper
2. **Wrap** the modal's inner content with `<DetailPageShell>` using appropriate `parentLabel`, `parentPath`, and `title`
3. **Move** the close button action to use the shell's built-in back navigation (remove `so-modal__close` button from the old header since DetailPageShell provides it)
4. **Change** the parent component's conditional render from overlay-on-top-of-list to either-list-or-detail

- [ ] **Step 1: Convert ViewModal**

In `SocialWorkersArea.tsx`, find the `ViewModal` function. Change its return from:

```tsx
return (
  <div className="so-modal so-modal--view" role="dialog" aria-label="服务人员详情">
    {/* Summary Card */}
    <div className="so-modal__summary">
      <div className="so-modal__summary-main">
        ...
        <div className="so-modal__summary-actions">
          <button aria-label="关闭" className="so-modal__close" onClick={onClose} type="button"><X size={18} /></button>
        </div>
      </div>
      ...
    </div>
    {/* tabs + content + footer */}
    ...
  </div>
);
```

To:

```tsx
return (
  <DetailPageShell parentLabel="服务人员" parentPath="/workers" title={worker.name}>
    {/* Summary Card — keep all existing JSX but remove the close button */}
    <div className="so-modal__summary">
      <div className="so-modal__summary-main">
        ...
        {/* REMOVED: so-modal__summary-actions with close button — DetailPageShell provides back nav */}
      </div>
      ...
    </div>
    {/* tabs + content + footer — all unchanged */}
    ...
  </DetailPageShell>
);
```

Add import at top: `import { DetailPageShell } from "../../shared/DetailPageShell";`

Key changes:
- Replace outer `<div className="so-modal so-modal--view">` with `<DetailPageShell>`
- Remove the `<button aria-label="关闭" className="so-modal__close">` (the X button in summary-actions)
- Keep everything else inside (summary card content, tabs, tab sections, footer) exactly as-is

- [ ] **Step 2: Convert CreateModal**

Same pattern. Change from:

```tsx
return (
  <div className="so-modal so-modal--form" role="dialog" aria-label="新增服务人员">
    <div className="so-modal__form-header">
      <h3>新增服务人员</h3>
      <button aria-label="关闭" className="so-modal__close" onClick={onClose} type="button"><X size={18} /></button>
    </div>
    <div className="so-modal__content">...</div>
    <div className="so-modal__footer">...</div>
  </div>
);
```

To:

```tsx
return (
  <DetailPageShell parentLabel="服务人员" parentPath="/workers" title="新增">
    {/* REMOVED: so-modal__form-header — DetailPageShell provides breadcrumb */}
    <div className="so-modal__content">...</div>
    <div className="so-modal__footer">...</div>
  </DetailPageShell>
);
```

- [ ] **Step 3: Change main component conditional rendering**

In the main `SocialWorkersArea` function, find the section that renders the scrim + drawer overlay alongside the list. Change from:

```tsx
<section aria-label="服务人员" className="sw-page">
  <div className="sw-page__inner">
    {/* list content */}
  </div>
</section>
{drawer.kind !== "closed" ? (
  <>
    <button aria-label="关闭抽屉遮罩" className="sw-scrim" onClick={closeDrawer} type="button" />
    <WorkerDrawer ... />
  </>
) : null}
```

To:

```tsx
{drawer.kind !== "closed" ? (
  <WorkerDrawer ... />
) : (
  <section aria-label="服务人员" className="sw-page">
    <div className="sw-page__inner">
      {/* list content */}
    </div>
  </section>
)}
```

Key changes:
- **Remove** the `sw-scrim` button entirely
- **Flip** the condition: detail page renders INSTEAD of list, not on top of it
- `WorkerDrawer` still delegates to ViewModal/EditModal/CreateModal based on `drawer.kind`

- [ ] **Step 4: Build and verify**

Run: `npx vite build 2>&1 | tail -5`
Expected: Build succeeds with no errors

- [ ] **Step 5: Commit**

```bash
git add src/features/siteOperations/SocialWorkersArea.tsx
git commit -m "feat: convert SocialWorkersArea modals to detail pages"
```

---

### Task 3: Convert SmartBadgesArea modal to detail page

**Files:**
- Modify: `src/features/siteOperations/SmartBadgesArea.tsx`

- [ ] **Step 1: Convert ViewDrawer**

Same pattern as Task 2. In the `ViewDrawer` function:

1. Replace outer `<div className="so-modal so-modal--view">` with `<DetailPageShell parentLabel="设备" parentPath="/badges" title={badge.deviceCode}>`
2. Remove the close button from `so-modal__summary-actions`
3. Keep all inner content (summary card content, info sections, worker binding, footer actions)

Add import: `import { DetailPageShell } from "../../shared/DetailPageShell";`

Note: `ActivateDrawer` stays as a modal (it's an action wizard, not a list→detail pattern). It will still render with `sw-scrim` overlay on top of whatever is showing.

- [ ] **Step 2: Change main component conditional rendering**

In the main component, change the `drawer.kind !== "closed"` block. The ActivateDrawer still needs its own scrim, but ViewDrawer becomes a full page:

```tsx
{drawer.kind === "view" ? (
  <ViewDrawer badge={drawer.badge} ... />
) : drawer.kind === "activate" ? (
  <>
    <button aria-label="关闭抽屉遮罩" className="sw-scrim" onClick={closeDrawer} type="button" />
    <ActivateDrawer onClose={closeDrawer} onActivated={handleBadgeActivated} />
  </>
) : (
  <section aria-label="设备" className="sw-page">
    <div className="sw-page__inner">
      {/* list content */}
    </div>
  </section>
)}
```

ActivateDrawer keeps its scrim because it stays as a modal.

- [ ] **Step 3: Build and verify**

Run: `npx vite build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/features/siteOperations/SmartBadgesArea.tsx
git commit -m "feat: convert SmartBadgesArea ViewDrawer to detail page"
```

---

### Task 4: Convert SchedulesArea modal to detail page

**Files:**
- Modify: `src/features/siteOperations/SchedulesArea.tsx`

- [ ] **Step 1: Convert ScheduleDrawer**

1. Replace outer `<div className="so-modal sch-event-modal">` with `<DetailPageShell parentLabel="服务排期" parentPath="/schedules" title={title}>` where `title` is derived from the schedule: `${formatDate(s.serviceDate)} ${s.serviceProject}`
2. Remove close button from the banner section (`sch-event__banner-close`)
3. Keep all inner content (status banner without close button, info cards, action bar, details grid, adjustment history, footer)

Add import: `import { DetailPageShell } from "../../shared/DetailPageShell";`

- [ ] **Step 2: Change main component conditional rendering**

Same flip pattern: detail page replaces list, not overlays it. Remove `sw-scrim`.

- [ ] **Step 3: Build and verify**

Run: `npx vite build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/features/siteOperations/SchedulesArea.tsx
git commit -m "feat: convert SchedulesArea drawer to detail page"
```

---

### Task 5: Convert ServiceObjectsArea modals to detail pages

**Files:**
- Modify: `src/features/siteOperations/ServiceObjectsArea.tsx`

This is the largest Area (1446 lines) with the most complex modal (4-tab ViewModal + CreateModal).

- [ ] **Step 1: Convert ViewModal**

1. Replace outer `<div className="so-modal so-modal--view">` with `<DetailPageShell parentLabel="长者" parentPath="/elders" title={obj.name}>`
2. Remove close button from `so-modal__summary-actions`
3. Keep all 4 tabs (overview, plans, history, insights), all inline edit fields, all plan cards, family contacts, etc.

Add import: `import { DetailPageShell } from "../../shared/DetailPageShell";`

- [ ] **Step 2: Convert CreateModal**

1. Replace outer `<div className="so-modal so-modal--form">` with `<DetailPageShell parentLabel="长者" parentPath="/elders" title="新增">`
2. Remove `so-modal__form-header` (title + close button)
3. Keep form content and footer buttons

Note: `PlanEditModal` stays as a modal — it renders on top of the elder detail page.

- [ ] **Step 3: Change main component conditional rendering**

Same pattern: flip condition so ObjectDrawer replaces list instead of overlaying. Remove `sw-scrim`.

- [ ] **Step 4: Build and verify**

Run: `npx vite build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/features/siteOperations/ServiceObjectsArea.tsx
git commit -m "feat: convert ServiceObjectsArea modals to detail pages"
```

---

### Task 6: Convert RecordsArea modal to detail page

**Files:**
- Modify: `src/features/siteOperations/RecordsArea.tsx`

- [ ] **Step 1: Convert RecordDrawer**

1. Replace outer `<div className="so-modal rec-modal--no-footer">` with `<DetailPageShell parentLabel="服务记录" parentPath="/records" title={title}>` where `title` is derived: `${r.serviceObjectName ?? "待关联"} · ${formatDate(r.serviceDate)}`
2. Remove close button from `rec-modal__header` banner
3. Keep all 3 tabs (basic, sop, audio), audio playback, transcript, etc.

Add import: `import { DetailPageShell } from "../../shared/DetailPageShell";`

Note: `RecordingDrawer` stays as a modal (it's opened from the recordings sub-tab, not the main list).

- [ ] **Step 2: Change main component conditional rendering**

Same pattern. Note: the close handler also calls `stopClip()` to stop audio playback — keep that behavior. Put `stopClip` call inside the `closeDrawer` callback, not in the scrim onClick.

- [ ] **Step 3: Build and verify**

Run: `npx vite build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/features/siteOperations/RecordsArea.tsx
git commit -m "feat: convert RecordsArea drawer to detail page"
```

---

### Task 7: Convert QualityPage admin modals to detail pages

**Files:**
- Modify: `src/quality/QualityPage.tsx`

Four modals to convert: SiteDetailModal, SiteCreateModal, UserDetailModal, CreateUserModal.

- [ ] **Step 1: Convert SiteDetailModal**

1. Remove outer `<><div className="sw-scrim" onClick={onClose} /><div className="quality-user-modal">...</div></>` wrapper
2. Replace with `<DetailPageShell parentLabel="站点管理" parentPath="/admin/sites" title={site.name}>`
3. Remove `quality-user-modal__header` (which has title + close button)
4. Keep `quality-user-modal__body` content (form cards, operator list, edit/save buttons) — move it into DetailPageShell children
5. Keep `quality-user-modal__footer` buttons as-is

Add import: `import { DetailPageShell } from "../shared/DetailPageShell";`

- [ ] **Step 2: Convert SiteCreateModal**

Same pattern:
1. Remove `sw-scrim` + `quality-user-modal` wrapper
2. Replace with `<DetailPageShell parentLabel="站点管理" parentPath="/admin/sites" title="新增">`
3. Remove `quality-user-modal__header`
4. Keep form body and footer

- [ ] **Step 3: Convert UserDetailModal**

1. Remove `sw-scrim` + `quality-user-modal` wrapper
2. Replace with `<DetailPageShell parentLabel="用户管理" parentPath="/admin/users" title={user.name}>`
3. Remove `quality-user-modal__header`
4. Keep body content (inline edit fields, role/status display, action buttons)

- [ ] **Step 4: Convert CreateUserModal**

1. Remove `sw-scrim` + `quality-user-modal` wrapper
2. Replace with `<DetailPageShell parentLabel="用户管理" parentPath="/admin/users" title="新增">`
3. Remove `quality-user-modal__header`
4. Keep form body and submit/cancel buttons

- [ ] **Step 5: Change SitesView conditional rendering**

In `SitesView`, change from rendering list + modal overlay to conditional either/or:

```tsx
// BEFORE (list always shows, modal on top):
<>
  <div className="quality-records__header">...</div>
  <div className="quality-table-wrap">...</div>
  {detailSite && <SiteDetailModal ... />}
  {showCreate && <SiteCreateModal ... />}
</>

// AFTER (list OR detail page):
{routeId ? (
  routeId === "new"
    ? <SiteCreateModal token={token!} onClose={() => navigate("/admin/sites")} onCreated={...} />
    : detailSite
      ? <SiteDetailModal site={detailSite} token={token!} onClose={closeSite} onSaved={...} onDelete={...} initialEditing={editingSite} />
      : <div style={{ padding: 24, color: "var(--quality-text-muted)" }}>加载中...</div>
) : (
  <>
    <div className="quality-records__header">...</div>
    <div className="quality-table-wrap">...</div>
  </>
)}
```

Note: ConfirmDialog stays as a modal overlay on top of whatever is showing.

- [ ] **Step 6: Change UsersView conditional rendering**

Same pattern as SitesView. List OR detail page based on `routeId`.

Note: ResetPasswordModal stays as a modal overlay.

- [ ] **Step 7: Build and verify**

Run: `npx vite build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 8: Commit**

```bash
git add src/quality/QualityPage.tsx
git commit -m "feat: convert QualityPage admin modals to detail pages"
```

---

### Task 8: Update tests for new rendering pattern

**Files:**
- Modify: `src/quality/__tests__/QualityPage.test.tsx`

- [ ] **Step 1: Update modal sync tests**

The existing tests check for `.sw-scrim` as the modal indicator. Since modals are now detail pages, update the selector:

In tests that check "opens user detail modal when URL has :id param" and similar:
- Change `expect(document.querySelector(".sw-scrim")).toBeTruthy()` to `expect(document.querySelector(".detail-page")).toBeTruthy()`
- Change the "does NOT open modal" test to check `expect(document.querySelector(".detail-page")).toBeNull()`

- [ ] **Step 2: Run tests**

Run: `npx vitest run src/quality/__tests__/QualityPage.test.tsx src/shared/__tests__/DetailPageShell.test.tsx`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add src/quality/__tests__/QualityPage.test.tsx
git commit -m "test: update QualityPage tests for detail page pattern"
```

---

### Task 9: E2E browser verification + deploy

**Files:**
- No source changes — verification and deployment only

- [ ] **Step 1: Build and deploy to staging**

```bash
npx vite build && ./deploy.sh
```

Expected: Deploy succeeds with health check passing.

- [ ] **Step 2: E2E — Verify site operations detail pages**

For each of these URLs, log in via the browse tool, navigate, and take a screenshot:

1. `/workers` — click a worker row → should show detail page with breadcrumb `← 服务人员 / [name]`
2. `/badges` — click a badge row → breadcrumb `← 设备 / [code]`
3. `/schedules` — click a schedule item → breadcrumb `← 服务排期 / [date+project]`
4. `/elders` — click an elder row → breadcrumb `← 长者 / [name]`, verify 4 tabs visible
5. `/records` — click a record row → breadcrumb `← 服务记录 / [name+date]`

For each:
- Verify breadcrumb is visible at top
- Verify detail content renders (not blank, not error)
- Verify no `sw-scrim` overlay is present
- Click back arrow → verify returns to list

- [ ] **Step 3: E2E — Verify org admin detail pages**

1. `/admin/sites` — click a site row → breadcrumb `← 站点管理 / [name]`
2. `/admin/users` — click a user row → breadcrumb `← 用户管理 / [name]`
3. `/admin/users/new` — click "新增用户" → breadcrumb `← 用户管理 / 新增`

For each:
- Verify breadcrumb visible
- Verify content renders
- Click back → returns to list

- [ ] **Step 4: E2E — Verify nested modals still work**

1. Open an elder detail → click delete on a service plan → ConfirmDialog should appear as modal overlay on top of detail page
2. Open a user detail → click "重置密码" → ResetPasswordModal should appear as modal overlay

- [ ] **Step 5: E2E — Verify URL behavior**

1. Navigate directly to `/elders/[valid-id]` → detail page should load
2. Navigate directly to `/admin/users?search=运营` → list should show with search pre-filled
3. Browser back from detail page → list should show

- [ ] **Step 6: Final commit (if any E2E fixes needed)**

```bash
git add -A
git commit -m "fix: E2E verification fixes for modal-to-detail-page refactor"
./deploy.sh
```
