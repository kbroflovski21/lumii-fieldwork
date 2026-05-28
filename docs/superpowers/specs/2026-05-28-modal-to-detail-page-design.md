# Modal-to-Detail-Page Refactor — Design Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace all list→detail modal overlays with full-page detail views that cover the list content, using a shared breadcrumb header with back navigation. Small utility dialogs (confirm, reset password, etc.) remain as modals.

**Architecture:** Conditional rendering inside each Area component — when `routeId` is present, render a detail page component instead of the list. A shared `DetailPageShell` wrapper provides the breadcrumb header. No router changes needed; existing `:id` child routes are reused.

**Tech Stack:** React, react-router-dom (useParams/useNavigate already in place), existing CSS variable system.

---

## 1. Scope

### Modals to convert (11 total)

| Area | Current modal | Detail page component | File |
|------|--------------|----------------------|------|
| 长者 | ViewModal | ElderDetailPage | ServiceObjectsArea.tsx |
| 长者 | CreateModal | ElderCreatePage | ServiceObjectsArea.tsx |
| 服务人员 | ViewModal + EditModal | WorkerDetailPage | SocialWorkersArea.tsx |
| 服务人员 | CreateModal | WorkerCreatePage | SocialWorkersArea.tsx |
| 设备 | ViewDrawer | BadgeDetailPage | SmartBadgesArea.tsx |
| 排期 | ScheduleDrawer | ScheduleDetailPage | SchedulesArea.tsx |
| 服务记录 | RecordDrawer | RecordDetailPage | RecordsArea.tsx |
| 站点(admin) | SiteDetailModal | SiteDetailPage | QualityPage.tsx |
| 站点(admin) | SiteCreateModal | SiteCreatePage | QualityPage.tsx |
| 用户(admin) | UserDetailModal | UserDetailPage | QualityPage.tsx |
| 用户(admin) | CreateUserModal | UserCreatePage | QualityPage.tsx |

### Modals that stay as-is (8 total)

- `ConfirmDialog` — generic confirmation popup
- `ResetPasswordModal` — password reset action
- `OperatorAssignModal` — operator assignment dropdown
- `ActivateDrawer` — badge activation wizard
- `PlanEditModal` — plan edit form (nested inside elder detail)
- `RecordingDrawer` — recording playback detail
- `WorkerDetailModal` (quality dashboard) — worker quality scores
- ProfileMenu password modal

## 2. DetailPageShell Component

**File:** `src/shared/DetailPageShell.tsx`
**CSS:** `src/shared/detail-page.css`

### Props

```tsx
interface DetailPageShellProps {
  parentLabel: string;    // "长者" | "服务人员" | "站点管理"
  parentPath: string;     // "/elders" | "/workers" | "/admin/sites"
  title: string;          // object name or "新增"
  actions?: ReactNode;    // optional right-side action buttons
  children: ReactNode;    // detail content
}
```

### Layout

```
┌──────────────────────────────────────────────────────┐
│ ← 长者 / 李明                          [编辑] [删除] │  breadcrumb header
├──────────────────────────────────────────────────────┤
│                                                      │
│  (scrollable content area - each page defines its    │
│   own layout: tabs, cards, forms, etc.)              │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Breadcrumb behavior

- Click `←` arrow or parent label: `navigate(parentPath)`
- Parent label renders as gray text; current title as dark bold text
- Separator is ` / ` in muted color

### CSS classes

| Class | Purpose |
|-------|---------|
| `.detail-page` | Root flex column, `height: 100%; overflow: hidden` |
| `.detail-page__header` | Breadcrumb bar, `padding: 16px 24px`, bottom border, `background: var(--site-card)` |
| `.detail-page__back` | Arrow button, 28px, `border-radius: 6px`, hover background |
| `.detail-page__breadcrumb` | Parent label, `font-size: 14px`, `color: var(--site-muted)`, clickable |
| `.detail-page__sep` | Separator ` / `, `color: var(--site-line)` |
| `.detail-page__title` | Current name, `font-size: 15px`, `font-weight: 600`, `color: var(--site-text)` |
| `.detail-page__actions` | Right-aligned button area, `margin-left: auto`, `display: flex; gap: 8px` |
| `.detail-page__body` | Scrollable content, `flex: 1; overflow-y: auto; padding: 24px` |

## 3. Conditional Rendering Pattern

Each Area component changes from:

```tsx
// BEFORE: list always renders, modal floats on top
<section className="sw-page">
  <ListContent />
</section>
{detailObj && <ViewModal object={detailObj} onClose={close} />}
```

To:

```tsx
// AFTER: list OR detail page, not both
{routeId ? (
  routeId === "new"
    ? <CreatePage onClose={close} onCreated={handleCreated} />
    : selectedObj
      ? <DetailPage object={selectedObj} onClose={close} onUpdated={refetch} />
      : <NotFoundOrLoading />
) : (
  <section className="sw-page">
    <ListContent />
  </section>
)}
```

### Key behaviors preserved

- **URL routing**: No changes — `/elders/:id`, `/admin/users/:id` etc. already work
- **Inline editing**: All inline edit interactions remain; only the container wrapper changes
- **Data flow**: Detail pages receive the same props (object data, callbacks) from the parent Area
- **Nested modals**: ConfirmDialog, PlanEditModal etc. still render as modal overlays _on top of_ the detail page
- **Browser back**: Navigating back changes `routeId` to undefined → list re-renders with preserved state

## 4. Per-Component Migration Notes

### ServiceObjectsArea (长者)
- **ViewModal** → `ElderDetailPage`: 4 tabs (overview, plans, history, insights). Tab bar moves from modal header to `detail-page__body` top. All overview inline edit fields, plan cards, history list, insights chart keep their existing JSX.
- **CreateModal** → `ElderCreatePage`: Full form. Replace `sw-scrim` + `so-modal--form` with `DetailPageShell` + form in body.

### SocialWorkersArea (服务人员)
- **ViewModal** → `WorkerDetailPage`: 2 tabs (overview, praise). Inline edit for name/phone/qualifications. EditModal logic is absorbed into the detail page (it was already inline-edit style).
- **CreateModal** → `WorkerCreatePage`: Simple form (name, phone, qualifications).

### SmartBadgesArea (设备)
- **ViewDrawer** → `BadgeDetailPage`: Single info section with worker binding dropdown. Footer action buttons (activate/disable/lost) move to `detail-page__header` actions area or body bottom.

### SchedulesArea (排期)
- **ScheduleDrawer** → `ScheduleDetailPage`: Banner status section + info cards (elder, worker, location) + action bar + details grid + adjustment history. No tabs.

### RecordsArea (服务记录)
- **RecordDrawer** → `RecordDetailPage`: 3 tabs (basic, sop, audio). Audio playback and transcript in audio tab. The most complex migration but structure is the same.

### QualityPage — SitesView (站点管理)
- **SiteDetailModal** → `SiteDetailPage`: Simple view/edit of site name, address, contact, operators list.
- **SiteCreateModal** → `SiteCreatePage`: Name, address, contact fields form.

### QualityPage — UsersView (用户管理)
- **UserDetailModal** → `UserDetailPage`: View/edit username, name, phone, role, status.
- **CreateUserModal** → `UserCreatePage`: Username, password, name, role, phone form.

## 5. Implementation Phases

### Phase 1: Foundation
- Create `DetailPageShell` component + CSS
- Create `detail-page.css` with all shared styles

### Phase 2: Site Operations (5 areas, 7 detail pages)
Order by complexity (simple first):
1. SocialWorkersArea — WorkerDetailPage + WorkerCreatePage
2. SmartBadgesArea — BadgeDetailPage
3. SchedulesArea — ScheduleDetailPage
4. ServiceObjectsArea — ElderDetailPage + ElderCreatePage
5. RecordsArea — RecordDetailPage

### Phase 3: Org Admin (2 views, 4 detail pages)
1. SitesView — SiteDetailPage + SiteCreatePage
2. UsersView — UserDetailPage + UserCreatePage

### Phase 4: E2E Browser Verification
- Screenshot each detail page (expanded sidebar + collapsed sidebar)
- Verify breadcrumb navigation (click back → returns to list)
- Verify inline edit mode works
- Verify URL shows object ID
- Verify browser back button returns to list
- Verify nested modals (ConfirmDialog etc.) still work on top of detail pages

## 6. Additional Features Implemented

### Card-based detail page layout (`dp-*` CSS system)
- `dp-card` — white card with border + rounded corners
- `dp-tabs` / `dp-tabs__btn` — tab bar at card top with rounded top corners
- `dp-card__body` — card content area
- `dp-section` / `dp-section__head` / `dp-section__title` — section grouping with dividers
- `dp-fields` / `dp-field` / `dp-field--full` — 3-column responsive field grid (1-column on mobile)
- `dp-field--editable` — position:relative anchor for floating popovers
- `dp-field-popover` — floating edit panel (position:absolute, shadow, border)
- `dp-section__edit-btn` — pencil icon edit trigger on field labels

### Per-field inline editing (SchedulesArea)
- Worker: searchable dropdown (text filter + multi-line select) in floating popover
- Service time: merged date+time with react-datepicker in floating popover
- Address: inline expanding map with leaflet + 高德 tiles

### Sidebar sub-menu (recordings)
- `/recordings` as independent route with sidebar sub-item under "服务记录"
- Chevron indicator (expand/collapse) on parent menu item
- RecordingDrawer converted to DetailPageShell full-page detail

### Compact layout
- All content padding: 24px → 16px
- Page titles + subtitles: vertical → horizontal inline
- Header min-height: 36px for consistency with/without buttons

### Performance optimizations
- Recordings list API: Prisma `select` excludes heavy fields (419KB → 15KB)
- 18 database indexes added for query performance
- Shared `AddressMap` component extracted for reuse

## 7. Files Changed

### New files
- `src/shared/DetailPageShell.tsx` — breadcrumb header wrapper
- `src/shared/detail-page.css` — full dp-* CSS system
- `src/shared/AddressMap.tsx` — shared leaflet + 高德 map component
- `src/shared/__tests__/DetailPageShell.test.tsx` — unit tests
- `prisma/migrations/20260528160000_add_database_indexes/migration.sql` — 18 indexes

### Modified files
- `src/features/siteOperations/ServiceObjectsArea.tsx` — dp-card layout, inline edit
- `src/features/siteOperations/SocialWorkersArea.tsx` — dp-card layout, URL-based create
- `src/features/siteOperations/SmartBadgesArea.tsx` — dp-card layout, activate as full page
- `src/features/siteOperations/SchedulesArea.tsx` — dp-card layout, per-field popover edit, react-datepicker
- `src/features/siteOperations/RecordsArea.tsx` — dp-card layout, recordings sub-menu, URL-based detail
- `src/quality/QualityPage.tsx` — dp-card layout for all admin modals, feishu chip selectors
- `src/features/siteOperations/siteOperations.css` — compact padding, sub-menu styles, header min-height
- `src/quality/quality.css` — compact padding, inline subtitles
- `src/supervisor/supervisor.css` — compact padding, inline subtitle
- `src/layouts/SiteOperationsLayout.tsx` — sub-menu with children + chevron indicator
- `src/router.tsx` — `/recordings` route, removed static `path: "new"` routes
- `server/routes/recordings.ts` — select-only list API
- `prisma/schema.prisma` — 18 @@index declarations
