# Shared Component Extraction — Design Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract 13 reusable components, hooks, and utilities from duplicated code across Area files into `src/shared/`, eliminating redundancy while preserving identical behavior.

**Architecture:** Pure extraction refactor — no new features, no behavior changes. Each shared item replaces inline duplicates in 2-5 Area files. TDD: write tests first, then extract, then replace call sites.

**Tech Stack:** React, TypeScript, Vitest, react-router-dom, Lucide icons, existing CSS class system.

---

## 1. File Structure

```
src/shared/
  components/
    StatusBadge.tsx          ← Phase 1
    AvatarInitial.tsx        ← Phase 1
    FilterDropdown.tsx       ← Phase 1
    EmptyState.tsx           ← Phase 2
    OperationalBanner.tsx    ← Phase 2
    ConfirmAction.tsx        ← Phase 2
    ListToolbar.tsx          ← Phase 2
  hooks/
    useInlineEdit.ts         ← Phase 2
    useEscClose.ts           ← move from features (already exists)
    useFetch.ts              ← Phase 3
    useCopyToClipboard.ts    ← Phase 3
    useRouteDetail.ts        ← Phase 3
  utils/
    dateTimeUtils.ts         ← Phase 1
  utilities.css              ← Phase 3
  __tests__/
    StatusBadge.test.tsx
    AvatarInitial.test.tsx
    FilterDropdown.test.tsx
    dateTimeUtils.test.ts
    EmptyState.test.tsx
    OperationalBanner.test.tsx
    ConfirmAction.test.tsx
    ListToolbar.test.tsx
    useInlineEdit.test.ts
    useFetch.test.ts
    useCopyToClipboard.test.ts
    useRouteDetail.test.ts
    DetailPageShell.test.tsx  (existing)
```

## 2. Phase 1 — High Priority (heaviest duplication)

### 2.1 StatusBadge

**Replaces:** 23+ inline `<span className="sw-status-badge" data-tone={...}>` across all Area files.

**Interface:**
```tsx
interface StatusBadgeProps {
  tone: string;        // "success" | "warning" | "danger" | "accent" | "info" | "muted"
  children: ReactNode; // display text
}
```

**Renders:**
```tsx
<span className="sw-status-badge" data-tone={tone}>{children}</span>
```

**What stays in Area files:** Domain-specific tone functions (`statusTone`, `badgeStatusTone`, `scheduleTone`, `reviewTone`, `compositeStateTone`) — each has different domain logic. The `statusText` mapping stays in `contracts.ts`.

**Call site change:**
```tsx
// Before (in each Area):
<span className="sw-status-badge" data-tone={statusTone(w.status)}>{statusText[w.status] ?? w.status}</span>

// After:
<StatusBadge tone={statusTone(w.status)}>{statusText[w.status] ?? w.status}</StatusBadge>
```

### 2.2 AvatarInitial

**Replaces:** 4 identical `avatarColor()` + 4 identical `getInitials()` functions in SocialWorkersArea, SmartBadgesArea (via SchedulesArea), SchedulesArea, RecordsArea, ServiceObjectsArea.

**Interface:**
```tsx
interface AvatarInitialProps {
  name: string;
  size?: "sm" | "md" | "lg";  // 28px | 36px | 48px, default "md"
  className?: string;
}
```

**Internal logic (extracted from existing code):**
```ts
const AVATAR_COLORS = [
  { bg: "#EEF2FF", text: "#4F46E5" },
  { bg: "#F0FDF4", text: "#16A34A" },
  { bg: "#FFF7ED", text: "#EA580C" },
  { bg: "#FDF2F8", text: "#DB2777" },
  { bg: "#ECFEFF", text: "#0891B2" },
  { bg: "#F5F3FF", text: "#7C3AED" },
];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
```

**Renders:**
```tsx
<div className={`sw-avatar ${className ?? ""}`} style={{ background: color.bg, color: color.text, width: px, height: px, ... }}>
  {name.slice(0, 1)}
</div>
```

**Scope:** ProfileMenu keeps its own HSL algorithm (different visual style, no change).

### 2.3 dateTimeUtils

**Replaces:** 7 formatting functions scattered across 5 files (2 `formatSyncTime`, 2 `formatDate`, 2 `formatTime`, 1 `toBjStr`, 1 `formatWindow`).

**Interface:**
```ts
// SchedulesArea pattern: "5/28 周三"
export function formatDateWithDay(d: string): string;

// RecordsArea pattern: "5/28"
export function formatDateShort(d: string): string;

// SocialWorkersArea + SmartBadgesArea pattern: "5/28 14:30"
export function formatSyncTime(iso?: string): string;

// RecordsArea + ServiceObjectsArea pattern: "5/28 14:30" (with Asia/Shanghai TZ)
export function formatTime(iso?: string): string;

// RecordsArea: Beijing timezone conversion
export function toBjStr(d: Date): { date: string; time: string; full: string };

// SchedulesArea: time window label or start-end range
export function formatWindow(s: {
  timeWindow?: { label?: string; start?: string; end?: string };
  startTime?: string;
  endTime?: string;
}): string;
```

**Implementation:** Exact copy of existing functions, consolidated into one module.

### 2.4 FilterDropdown

**Replaces:** 4 identical component definitions in SocialWorkersArea, SmartBadgesArea, RecordsArea, ServiceObjectsArea.

**Interface:**
```tsx
interface FilterDropdownProps {
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}
```

**Renders:**
```tsx
<div className="sw-filter">
  <select className={value ? "sw-filter--active" : ""} onChange={e => onChange(e.target.value)} value={value}>
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
  <ChevronDown size={14} />
</div>
```

**Dependency:** Imports `ChevronDown` from lucide-react (already a project dep).

## 3. Phase 2 — Medium Priority

### 3.1 EmptyState

**Replaces:** 25+ empty/loading/error state blocks across all list views.

**Interface:**
```tsx
interface EmptyStateProps {
  icon: LucideIcon;
  title?: string;
  description?: string;
  action?: ReactNode;
  isError?: boolean;
}
```

**Renders:**
```tsx
<div className="sw-empty">
  <div className={`sw-empty__icon${isError ? " sw-empty__icon--error" : ""}`}>
    <Icon size={32} />
  </div>
  {title && <strong>{title}</strong>}
  {description && <span>{description}</span>}
  {action}
</div>
```

### 3.2 OperationalBanner

**Replaces:** 5 nearly identical `OperationalBanner` components across all Area files. Differences are only in the resource label and hint text.

**Interface:**
```tsx
interface OperationalBannerProps {
  state: WorkAreaOperationalState;
  resourceLabel: string;         // "服务人员" | "设备" | "长者" etc.
  readOnlyHint?: string;         // default: "可查看数据，新增、编辑等操作已禁用。"
  restrictedHint?: string;       // default: "敏感信息已隐藏，部分操作不可用。"
}
```

**Renders:** Same `sw-banner` structure. Title auto-generates as `{resourceLabel}暂不可用` / `只读模式` / `权限受限`.

### 3.3 ConfirmAction

**Replaces:** 12+ inline confirmation toggle patterns (归档、停用、删除、取消等).

**Interface:**
```tsx
interface ConfirmActionProps {
  label: string;                   // "归档" | "停用" | "删除"
  confirmLabel?: string;           // default: `确认${label}`
  tone?: "danger" | "warning";     // default: "danger"
  onConfirm: () => void;
  disabled?: boolean;
  buttonStyle?: React.CSSProperties;
}
```

**Behavior:** Click → shows inline `确认{label}？` + confirm button + cancel button. Confirm → calls `onConfirm`. Cancel → resets. Identical to existing inline pattern.

### 3.4 useInlineEdit

**Replaces:** 6+ manual `editing*` + `edit*` + save/cancel state patterns in detail pages.

**Interface:**
```ts
function useInlineEdit<T>(
  initialValue: T,
  onSave: (value: T) => Promise<void>
): {
  editing: boolean;
  draft: T;
  setDraft: React.Dispatch<React.SetStateAction<T>>;
  startEdit: () => void;
  cancel: () => void;
  save: () => Promise<void>;
  saving: boolean;
};
```

**Behavior:**
- `startEdit()` → sets `editing=true`, copies `initialValue` to `draft`
- `cancel()` → resets `draft` to `initialValue`, sets `editing=false`
- `save()` → sets `saving=true`, calls `onSave(draft)`, on success sets `editing=false` and `saving=false`. On rejection, sets `saving=false` but keeps `editing=true` (user can retry or cancel).
- When `initialValue` changes and not editing, `draft` stays in sync

### 3.5 ListToolbar

**Replaces:** 5 identical search + filter toolbar layouts.

**Interface:**
```tsx
interface ListToolbarProps {
  searchValue: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;      // default: "搜索..."
  filters?: ReactNode;
  actions?: ReactNode;
}
```

**Renders:**
```tsx
<div className="sw-toolbar">
  <label className="sw-search">
    <Search size={16} />
    <input aria-label={searchPlaceholder} onChange={...} placeholder={searchPlaceholder} value={searchValue} />
  </label>
  {filters && <div className="sw-toolbar__filters">{filters}</div>}
  {actions}
</div>
```

## 4. Phase 3 — Low Priority

### 4.1 useFetch

**Replaces:** 12+ `authFetch → json → setState` chains.

**Interface:**
```ts
function useFetch<T>(
  url: string | null,
  deps?: any[]
): {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
};
```

**Behavior:** `url` is null → skip fetch. Deps change → re-fetch. Uses `authFetch` from `api.ts` internally.

### 4.2 useCopyToClipboard

**Replaces:** Manual textarea fallback + clipboard API pattern in SocialWorkersArea.

**Interface:**
```ts
function useCopyToClipboard(): {
  copy: (text: string) => void;
  copied: boolean;   // true for 1.5s after copy
};
```

### 4.3 CSS Utility Classes

**File:** `src/shared/utilities.css`

**Replaces:** 41+ repeated inline styles for button sizing and flex layouts.

```css
.btn--compact { height: 28px; font-size: 12px; }
.btn--xs { height: 26px; font-size: 11px; padding: 0 10px; }
.flex-end { display: flex; justify-content: flex-end; }
.flex-end-gap-8 { display: flex; gap: 8px; justify-content: flex-end; }
.flex-center-gap-8 { display: flex; align-items: center; gap: 8px; }
.mt-12 { margin-top: 12px; }
```

### 4.4 useRouteDetail

**Replaces:** 4 identical `routeId → drawer state → navigate` patterns in Area files.

**Interface:**
```ts
function useRouteDetail<T>(
  basePath: string,
  items: T[],
  getId: (item: T) => string
): {
  routeId: string | undefined;
  selectedItem: T | undefined;
  isCreate: boolean;
  close: () => void;
  open: (id: string) => void;
  openCreate: () => void;
};
```

### 4.5 Move useEscClose

Move existing `src/features/siteOperations/useEscClose.ts` to `src/shared/hooks/useEscClose.ts`. Update all imports. No logic change.

## 5. Migration Rules

1. **Exact behavioral parity:** Every extracted component must produce the same DOM output as the inline version it replaces. No "improvements" during extraction.
2. **One component at a time:** Extract → replace all call sites → test → commit. Never leave partial migrations.
3. **TDD:** Write failing test → implement shared component → verify test passes → replace call sites → verify existing tests still pass.
4. **No new CSS:** Shared components use existing `sw-*` CSS classes. The only new CSS file is `utilities.css` (Phase 3).
5. **Import path convention:** `import { StatusBadge } from "../shared/components/StatusBadge"` (relative from feature files).

## 6. What Does NOT Change

- `DetailPageShell` — already shared, stays as-is
- `AddressMap` — already shared, stays as-is
- `ProfileMenu` — keeps its own HSL avatar algorithm
- `dp-*` CSS class system — stays as CSS classes, not wrapped in React components
- Domain-specific tone functions — stay in their Area files
- `statusText` mapping — stays in `contracts.ts`
- `contracts.ts` types — no changes
- `api.ts` — no changes (useFetch wraps it, doesn't modify it)
- All modal/drawer JSX structure — only the duplicated helper functions/components are extracted

## 7. Testing Strategy

Each shared item gets:
1. **Unit tests** (Vitest + Testing Library) covering:
   - Default rendering
   - All prop variations
   - Edge cases (empty string, null, undefined)
   - Callback behavior (for interactive components)
2. **Integration verification:** After replacing call sites, run `npm test` to confirm all existing tests pass.
3. **E2E browser verification:** After all phases complete, visual check of every Area page in browser to confirm no visual regression.

## 8. Duplication Inventory

| Shared Item | Files with Duplicates | Instances |
|-------------|----------------------|-----------|
| StatusBadge | 5 Area files | 23+ |
| AvatarInitial (avatarColor + getInitials) | SocialWorkers, SmartBadges (via Schedules), Schedules, Records, ServiceObjects | 4 + 4 |
| dateTimeUtils | SocialWorkers, SmartBadges, Schedules, Records, ServiceObjects | 7 functions |
| FilterDropdown | SocialWorkers, SmartBadges, Records, ServiceObjects | 4 |
| EmptyState | All 5 Area files | 25+ blocks |
| OperationalBanner | All 5 Area files | 5 |
| ConfirmAction | SocialWorkers, SmartBadges, ServiceObjects, Schedules | 12+ |
| useInlineEdit | SocialWorkers, SmartBadges, Schedules, ServiceObjects | 6+ |
| ListToolbar | All 5 Area files | 5 |
| useFetch | SmartBadges, Schedules, ServiceObjects, Records | 12+ chains |
| useCopyToClipboard | SocialWorkers | 1 |
| CSS utilities | All Area files | 41+ inline styles |
| useRouteDetail | SocialWorkers, SmartBadges, Schedules, ServiceObjects, Records | 4-5 |
