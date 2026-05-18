# Service Personnel Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the service personnel tab as a professional Table + Drawer interface aligned with the API contract, replacing the current table-with-inline-actions implementation.

**Architecture:** Replace `SocialWorkersArea` with a new implementation that uses a flat Table (no row-level action buttons), dropdown filters, search, and a right-side Drawer for view/edit/create. The `SocialWorker` type in `contracts.ts` is updated to match the API contract (`preferredBadge`, `praiseSummary`, `qualificationLabels`). The `SocialWorkersBundle` type no longer needs a separate `smartBadges` field because badge info is embedded in each worker's `preferredBadge`. Fixture data is updated to cover all status combinations.

**Tech Stack:** React 19, TypeScript, Vite, Vitest + Testing Library, Playwright, lucide-react.

---

## Source Specs

- `docs/superpowers/specs/site-operations/02-service-personnel.md`
- `docs/api-contract/site-operations/02-service-personnel-api.md`
- `docs/api-contract/site-operations/00-global-api.md`
- `docs/global-ui-guidance.md`
- Current implementation:
  - `src/features/siteOperations/SocialWorkersArea.tsx`
  - `src/features/siteOperations/WorkAreaLayout.tsx`
  - `src/features/siteOperations/contracts.ts`
  - `src/features/siteOperations/api.ts`
  - `src/features/siteOperations/useSiteOperationsData.ts`
  - `src/features/siteOperations/siteOperations.css`
  - `src/features/siteOperations/__tests__/SiteOperationsPage.test.tsx`
  - `tests/e2e/site-operations.spec.ts`
  - `deploy/site-operations-api-fixture.mjs`

## File Structure

| File | Responsibility | Action |
| --- | --- | --- |
| `src/features/siteOperations/contracts.ts` | Type definitions | Modify: replace `SocialWorker` fields, add `BadgeBindingSummary`, `WorkerPraiseSummary`, update `SocialWorkersResponse` |
| `src/features/siteOperations/SocialWorkersArea.tsx` | Service personnel tab component | Rewrite: Table + filters + Drawer (view/edit/create) |
| `src/features/siteOperations/siteOperations.css` | Styles | Modify: add Drawer, filter dropdown, table interaction styles |
| `src/features/siteOperations/useSiteOperationsData.ts` | Data fetching | Modify: simplify `SocialWorkersBundle` (no separate smartBadges fetch) |
| `src/features/siteOperations/api.ts` | API boundary | Modify: update request types to match contract |
| `deploy/site-operations-api-fixture.mjs` | Staging fixture | Modify: update social workers to API contract shape |
| `src/features/siteOperations/__tests__/SiteOperationsPage.test.tsx` | Integration tests | Modify: update fixtures and assertions |
| `tests/e2e/site-operations.spec.ts` | E2E tests | Modify: update fixtures and assertions |

## Scenario To Test-Case Mapping

| Scenario | Runner | Test Case |
| --- | --- | --- |
| Table shows 6 columns with contract data | integration | Renders name, phone, qualifications, badge, praise, status |
| Click name opens view Drawer | integration | Drawer shows worker details, actions in header |
| Double-click row opens Drawer | integration | Same Drawer opens |
| Edit mode in Drawer | integration | Switch to form, save returns to view |
| Create mode from header button | integration | Opens empty form, create closes Drawer |
| Archive with confirmation | integration | Danger button triggers confirm |
| Dropdown filters | integration | Status and badge binding filters |
| Search filters | integration | Name/phone search |
| Empty state | integration | No workers message with create entry |
| Permission states | integration | read_only disables mutations, restricted shows banner |
| Desktop Drawer overlay | E2E | Right-side Drawer with scrim |
| Mobile card layout | E2E | Table converts to rich row cards |

---

### Task 1: Update Contract Types And Fixture Data

**Files:**
- Modify: `src/features/siteOperations/contracts.ts`
- Modify: `deploy/site-operations-api-fixture.mjs`
- Modify: `src/features/siteOperations/useSiteOperationsData.ts`
- Modify: `src/features/siteOperations/api.ts`

- [ ] **Step 1: Add BadgeBindingSummary and WorkerPraiseSummary types**

In `src/features/siteOperations/contracts.ts`, add these types after the existing `PermissionState` type:

```ts
export type BadgeBindingSummary = {
  badgeId: string;
  deviceCode: string;
  status: SmartBadgeStatus;
  lastSyncAt?: string;
};

export type WorkerPraiseSummary = {
  praiseCount: number;
  latestPraiseAt?: string;
  latestPraiseExcerpt?: string;
};
```

- [ ] **Step 2: Replace the SocialWorker type**

In `src/features/siteOperations/contracts.ts`, replace the existing `SocialWorker` type with:

```ts
export type SocialWorkerStatus = "active" | "disabled" | "incomplete_profile";

export type SocialWorker = {
  id: string;
  userId: string;
  name: string;
  phone: string;
  siteId: string;
  workerType: "service_personnel";
  qualificationLabels: string[];
  status: SocialWorkerStatus;
  preferredBadge?: BadgeBindingSummary;
  praiseSummary: WorkerPraiseSummary;
};
```

Remove the old fields that no longer exist: `boundBadgeId`, `praiseCount`, `skills`, `todayScheduledCount`, `boundBadgeStatus`, `lastBadgeSyncAt`, and the old wide `status` union.

- [ ] **Step 3: Update CreateSocialWorkerRequest and UpdateSocialWorkerRequest**

In `src/features/siteOperations/contracts.ts`, replace:

```ts
export type CreateSocialWorkerRequest = {
  name: string;
  phone: string;
  workerType: "service_personnel";
  qualificationLabels?: string[];
  preferredBadgeId?: string;
};

export type UpdateSocialWorkerRequest = {
  name?: string;
  phone?: string;
  qualificationLabels?: string[];
  status?: SocialWorkerStatus;
};

export type UpdateWorkerBadgeBindingRequest = {
  preferredBadgeId?: string;
};
```

Remove the old `UpdateSocialWorkerBadgeBindingRequest` type (renamed to `UpdateWorkerBadgeBindingRequest`).

- [ ] **Step 4: Simplify SocialWorkersResponse**

In `src/features/siteOperations/contracts.ts`, keep `SocialWorkersResponse` as-is (it already has `socialWorkers: SocialWorker[]` and `operationalState`). No change needed since badge data is now embedded.

- [ ] **Step 5: Simplify useSiteOperationsData**

In `src/features/siteOperations/useSiteOperationsData.ts`, change the `SocialWorkersBundle` type and the fetch logic. The social workers tab no longer needs a separate smart badges fetch:

Replace the `SocialWorkersBundle` type:

```ts
export type SocialWorkersBundle = SocialWorkersResponse;
```

Replace the social workers fetch block:

```ts
if (activeArea === "social_workers" && socialWorkers.status === "idle") {
  setSocialWorkers(loading);
  siteOperationsApi
    .getSocialWorkers()
    .then((data) => setSocialWorkers({ status: "success", data }))
    .catch((error: unknown) =>
      setSocialWorkers({ status: "error", error: error instanceof Error ? error.message : "服务人员数据加载失败" })
    );
}
```

Add `import type { SocialWorkersResponse } from "./contracts";` to the imports.

- [ ] **Step 6: Update api.ts request type**

In `src/features/siteOperations/api.ts`, replace the import of `UpdateSocialWorkerBadgeBindingRequest` with `UpdateWorkerBadgeBindingRequest`, and update the `updateSocialWorkerBadgeBinding` method signature:

```ts
updateSocialWorkerBadgeBinding: (id: string, request: UpdateWorkerBadgeBindingRequest) =>
  sendJson<SocialWorker>(`/api/social-workers/${id}/badge-binding`, "PUT", request),
```

- [ ] **Step 7: Update fixture data**

In `deploy/site-operations-api-fixture.mjs`, replace the `socialWorkers` array with:

```js
const socialWorkers = [
  {
    id: "worker-001",
    userId: "user-001",
    name: "王丽",
    phone: "13800000001",
    siteId: "site-001",
    workerType: "service_personnel",
    qualificationLabels: ["助餐", "陪诊"],
    status: "active",
    preferredBadge: {
      badgeId: "badge-021",
      deviceCode: "FW-021",
      status: "available",
      lastSyncAt: "2026-05-13T08:50:00+08:00"
    },
    praiseSummary: {
      praiseCount: 42,
      latestPraiseAt: "2026-05-12T16:30:00+08:00",
      latestPraiseExcerpt: "服务细心周到，阿姨很满意"
    }
  },
  {
    id: "worker-002",
    userId: "user-002",
    name: "张敏",
    phone: "13800000002",
    siteId: "site-001",
    workerType: "service_personnel",
    qualificationLabels: ["助洁"],
    status: "active",
    praiseSummary: {
      praiseCount: 17,
      latestPraiseAt: "2026-05-10T11:00:00+08:00"
    }
  },
  {
    id: "worker-003",
    userId: "user-003",
    name: "李芳",
    phone: "13900000003",
    siteId: "site-001",
    workerType: "service_personnel",
    qualificationLabels: ["助餐"],
    status: "incomplete_profile",
    preferredBadge: {
      badgeId: "badge-030",
      deviceCode: "FW-030",
      status: "pending_activation"
    },
    praiseSummary: { praiseCount: 3 }
  },
  {
    id: "worker-004",
    userId: "user-004",
    name: "周建国",
    phone: "13700000004",
    siteId: "site-001",
    workerType: "service_personnel",
    qualificationLabels: [],
    status: "disabled",
    praiseSummary: { praiseCount: 0 }
  }
];
```

- [ ] **Step 8: Run TypeScript check**

Run:

```bash
npx tsc --noEmit
```

Expected: type errors in `SocialWorkersArea.tsx` and test files (they still reference old fields). That is correct — those files are updated in subsequent tasks.

- [ ] **Step 9: Commit contract and fixture changes**

```bash
git add src/features/siteOperations/contracts.ts src/features/siteOperations/useSiteOperationsData.ts src/features/siteOperations/api.ts deploy/site-operations-api-fixture.mjs
git commit -m "refactor: align SocialWorker type with API contract, simplify data hook"
```

---

### Task 2: Rewrite SocialWorkersArea Component

**Files:**
- Modify: `src/features/siteOperations/SocialWorkersArea.tsx`

- [ ] **Step 1: Replace the entire SocialWorkersArea.tsx**

Replace the contents of `src/features/siteOperations/SocialWorkersArea.tsx` with:

```tsx
import { useState, useCallback } from "react";
import { Search, X, ChevronDown } from "lucide-react";
import type {
  SocialWorker,
  SocialWorkerStatus,
  WorkAreaOperationalState,
  CreateSocialWorkerRequest,
  UpdateSocialWorkerRequest,
  UpdateWorkerBadgeBindingRequest,
  SocialWorkersResponse
} from "./contracts";
import { statusText } from "./contracts";
import { siteOperationsApi } from "./api";
import { isMutationDisabled } from "./WorkAreaLayout";
import type { Resource } from "./useSiteOperationsData";

type DrawerMode =
  | { kind: "closed" }
  | { kind: "view"; worker: SocialWorker }
  | { kind: "edit"; worker: SocialWorker }
  | { kind: "create" };

type StatusFilter = "" | SocialWorkerStatus;
type BadgeFilter = "" | "bound" | "unbound";

const statusFilterOptions: Array<{ label: string; value: StatusFilter }> = [
  { label: "全部状态", value: "" },
  { label: "在职", value: "active" },
  { label: "已停用", value: "disabled" },
  { label: "资料待补全", value: "incomplete_profile" }
];

const badgeFilterOptions: Array<{ label: string; value: BadgeFilter }> = [
  { label: "全部", value: "" },
  { label: "已绑定工牌", value: "bound" },
  { label: "未绑定工牌", value: "unbound" }
];

function statusTone(status: SocialWorkerStatus) {
  if (status === "active") return "success";
  if (status === "incomplete_profile") return "warning";
  return "muted";
}

function badgeStatusTone(status: string) {
  if (status === "available" || status === "in_use") return "success";
  if (status === "offline" || status === "sync_delayed" || status === "low_battery") return "warning";
  return "muted";
}

function formatSyncTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
}

export function SocialWorkersArea({ resource }: { resource: Resource<SocialWorkersResponse> }) {
  const [drawer, setDrawer] = useState<DrawerMode>({ kind: "closed" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [badgeFilter, setBadgeFilter] = useState<BadgeFilter>("");

  const operationalState = resource.status === "success" ? resource.data.operationalState : undefined;
  const mutationsDisabled = isMutationDisabled(operationalState);

  const openDrawer = useCallback((worker: SocialWorker) => {
    setDrawer({ kind: "view", worker });
  }, []);

  const workers = resource.status === "success" ? resource.data.socialWorkers : [];

  const filtered = workers.filter((w) => {
    if (statusFilter && w.status !== statusFilter) return false;
    if (badgeFilter === "bound" && !w.preferredBadge) return false;
    if (badgeFilter === "unbound" && w.preferredBadge) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!w.name.toLowerCase().includes(q) && !w.phone.includes(q)) return false;
    }
    return true;
  });

  return (
    <section aria-label="服务人员" className="site-work">
      <header className="site-work__header">
        <div>
          <h2>服务人员</h2>
          <p>管理站点人员目录、联系方式和常用工牌关系</p>
        </div>
        <div className="site-work__tools">
          <label className="site-work__search">
            <Search size={15} />
            <input
              aria-label="搜索服务人员"
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索姓名或电话"
              value={searchQuery}
            />
          </label>
          <FilterDropdown
            onChange={(v) => setStatusFilter(v as StatusFilter)}
            options={statusFilterOptions}
            value={statusFilter}
          />
          <FilterDropdown
            onChange={(v) => setBadgeFilter(v as BadgeFilter)}
            options={badgeFilterOptions}
            value={badgeFilter}
          />
          <button
            className="site-primary-btn"
            disabled={mutationsDisabled}
            onClick={() => setDrawer({ kind: "create" })}
            type="button"
          >
            新增服务人员
          </button>
        </div>
      </header>

      <div className="site-card site-work__card">
        <div aria-label="服务人员内容" className="site-work__content">
          {operationalState ? <OperationalBanner state={operationalState} /> : null}
          <WorkerContent
            filtered={filtered}
            loading={resource.status === "loading" || resource.status === "idle"}
            error={resource.status === "error" ? resource.error : undefined}
            isEmpty={resource.status === "success" && workers.length === 0}
            isFilterEmpty={resource.status === "success" && workers.length > 0 && filtered.length === 0}
            mutationsDisabled={mutationsDisabled}
            onCreateClick={() => setDrawer({ kind: "create" })}
            onRowClick={(worker) => setSelectedId(worker.id)}
            onNameClick={openDrawer}
            onRowDoubleClick={openDrawer}
            selectedId={selectedId}
          />
        </div>
      </div>

      {drawer.kind !== "closed" ? (
        <>
          <button
            aria-label="关闭抽屉遮罩"
            className="site-drawer-scrim"
            onClick={() => setDrawer({ kind: "closed" })}
            type="button"
          />
          <WorkerDrawer
            drawer={drawer}
            mutationsDisabled={mutationsDisabled}
            onClose={() => setDrawer({ kind: "closed" })}
            onEdit={(worker) => setDrawer({ kind: "edit", worker })}
            onViewAfterSave={(worker) => setDrawer({ kind: "view", worker })}
          />
        </>
      ) : null}
    </section>
  );
}

function FilterDropdown({
  onChange,
  options,
  value
}: {
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  const isFiltered = value !== "";
  return (
    <div className="site-filter-dropdown">
      <select
        className={isFiltered ? "site-filter-dropdown--active" : ""}
        onChange={(e) => onChange(e.target.value)}
        value={value}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown size={14} />
    </div>
  );
}

function OperationalBanner({ state }: { state: WorkAreaOperationalState }) {
  if (state.unavailableMessage) {
    return (
      <div className="site-empty-state" role="status">
        <strong>服务人员暂不可用</strong>
        <span>{state.unavailableMessage}</span>
      </div>
    );
  }
  if (state.permission === "read_only") {
    return (
      <div className="site-empty-state" role="status">
        <strong>只读模式</strong>
        <span>可查看数据，新增、编辑、归档等操作已禁用。</span>
      </div>
    );
  }
  if (state.permission === "restricted") {
    return (
      <div className="site-empty-state" role="status">
        <strong>权限受限</strong>
        <span>敏感信息已隐藏，部分操作不可用。</span>
      </div>
    );
  }
  return null;
}

function WorkerContent({
  filtered,
  loading,
  error,
  isEmpty,
  isFilterEmpty,
  mutationsDisabled,
  onCreateClick,
  onRowClick,
  onNameClick,
  onRowDoubleClick,
  selectedId
}: {
  filtered: SocialWorker[];
  loading: boolean;
  error?: string;
  isEmpty: boolean;
  isFilterEmpty: boolean;
  mutationsDisabled: boolean;
  onCreateClick: () => void;
  onRowClick: (worker: SocialWorker) => void;
  onNameClick: (worker: SocialWorker) => void;
  onRowDoubleClick: (worker: SocialWorker) => void;
  selectedId: string | null;
}) {
  if (loading) {
    return <div className="site-empty-state">服务人员数据加载中</div>;
  }
  if (error) {
    return <div className="site-empty-state">{error}</div>;
  }
  if (isEmpty) {
    return (
      <div className="site-empty-state site-empty-state--action">
        <strong>暂无服务人员</strong>
        <span>点击新增创建第一条记录</span>
        <button className="site-primary-btn" disabled={mutationsDisabled} onClick={onCreateClick} type="button">
          新增服务人员
        </button>
      </div>
    );
  }
  if (isFilterEmpty) {
    return <div className="site-empty-state">没有匹配的服务人员</div>;
  }

  return (
    <>
      <div className="site-table site-table--workers" role="table">
        <div className="site-table__head site-table__head--workers" role="row">
          <span role="columnheader">姓名</span>
          <span role="columnheader">联系方式</span>
          <span role="columnheader">资质</span>
          <span role="columnheader">常用工牌</span>
          <span role="columnheader">表扬</span>
          <span role="columnheader">状态</span>
        </div>
        {filtered.map((worker) => (
          <div
            className="site-table__row site-table__row--workers"
            data-selected={selectedId === worker.id}
            key={worker.id}
            onClick={() => onRowClick(worker)}
            onDoubleClick={() => onRowDoubleClick(worker)}
            role="row"
          >
            <div role="cell">
              <span className="site-primary-line">
                <button
                  className="site-name-link"
                  onClick={(e) => { e.stopPropagation(); onNameClick(worker); }}
                  type="button"
                >
                  {worker.name}
                </button>
                <small>{worker.workerType === "service_personnel" ? "服务人员" : worker.workerType}</small>
              </span>
            </div>
            <div role="cell">{worker.phone}</div>
            <div role="cell">
              {worker.qualificationLabels.length > 0
                ? worker.qualificationLabels.join("、")
                : <span className="site-text-muted">—</span>}
            </div>
            <div role="cell">
              {worker.preferredBadge ? (
                <span className="site-badge-cell">
                  <span>{worker.preferredBadge.deviceCode}</span>
                  <span className="site-status" data-tone={badgeStatusTone(worker.preferredBadge.status)}>
                    {statusText[worker.preferredBadge.status] ?? worker.preferredBadge.status}
                  </span>
                </span>
              ) : (
                <span className="site-text-muted">未绑定</span>
              )}
            </div>
            <div role="cell">{worker.praiseSummary.praiseCount} 次</div>
            <div role="cell">
              <span className="site-status" data-tone={statusTone(worker.status)}>
                {statusText[worker.status] ?? worker.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="site-table--workers-mobile">
        {filtered.map((worker) => (
          <button
            className="site-worker-card"
            key={worker.id}
            onClick={() => onNameClick(worker)}
            type="button"
          >
            <div className="site-worker-card__row1">
              <strong>{worker.name}</strong>
              <span className="site-status" data-tone={statusTone(worker.status)}>
                {statusText[worker.status] ?? worker.status}
              </span>
            </div>
            <span>{worker.phone}</span>
            <span className="site-text-muted">
              {worker.qualificationLabels.length > 0 ? worker.qualificationLabels.join("、") : "无资质"}
              {worker.preferredBadge ? ` · ${worker.preferredBadge.deviceCode}` : " · 未绑定工牌"}
            </span>
            <span className="site-text-muted">{worker.praiseSummary.praiseCount} 次表扬</span>
          </button>
        ))}
      </div>
    </>
  );
}

function WorkerDrawer({
  drawer,
  mutationsDisabled,
  onClose,
  onEdit,
  onViewAfterSave
}: {
  drawer: Exclude<DrawerMode, { kind: "closed" }>;
  mutationsDisabled: boolean;
  onClose: () => void;
  onEdit: (worker: SocialWorker) => void;
  onViewAfterSave: (worker: SocialWorker) => void;
}) {
  if (drawer.kind === "view") {
    return <ViewDrawer mutationsDisabled={mutationsDisabled} onClose={onClose} onEdit={() => onEdit(drawer.worker)} worker={drawer.worker} />;
  }
  if (drawer.kind === "edit") {
    return <EditDrawer onCancel={() => onViewAfterSave(drawer.worker)} onClose={onClose} onSaved={onViewAfterSave} worker={drawer.worker} />;
  }
  return <CreateDrawer onClose={onClose} />;
}

function ViewDrawer({
  mutationsDisabled,
  onClose,
  onEdit,
  worker
}: {
  mutationsDisabled: boolean;
  onClose: () => void;
  onEdit: () => void;
  worker: SocialWorker;
}) {
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  return (
    <aside aria-label="服务人员详情" className="site-drawer">
      <div className="site-drawer__header">
        <div>
          <h3>{worker.name}</h3>
          <p className="site-text-muted">
            {worker.workerType === "service_personnel" ? "服务人员" : worker.workerType} ·{" "}
            <span className="site-status site-status--inline" data-tone={statusTone(worker.status)}>
              {statusText[worker.status] ?? worker.status}
            </span>
          </p>
        </div>
        <button aria-label="关闭" className="site-drawer__close" onClick={onClose} type="button">
          <X size={18} />
        </button>
      </div>
      <div className="site-drawer__actions">
        <button className="site-secondary-btn" disabled={mutationsDisabled} onClick={onEdit} type="button">编辑档案</button>
        <button className="site-secondary-btn" disabled={mutationsDisabled} type="button">更新常用工牌</button>
        {showArchiveConfirm ? (
          <span className="site-drawer__confirm">
            <span>确认归档此人员？</span>
            <button className="site-danger-btn" type="button">确认归档</button>
            <button className="site-secondary-btn" onClick={() => setShowArchiveConfirm(false)} type="button">取消</button>
          </span>
        ) : (
          <button className="site-danger-btn-ghost" disabled={mutationsDisabled} onClick={() => setShowArchiveConfirm(true)} type="button">归档人员</button>
        )}
      </div>
      <div className="site-drawer__body">
        <section className="site-drawer__section">
          <h4>基础信息</h4>
          <dl className="site-drawer__fields">
            <div><dt>姓名</dt><dd>{worker.name}</dd></div>
            <div><dt>电话</dt><dd>{worker.phone}</dd></div>
            <div><dt>资质</dt><dd>{worker.qualificationLabels.length > 0 ? worker.qualificationLabels.join("、") : "—"}</dd></div>
            <div><dt>状态</dt><dd>{statusText[worker.status] ?? worker.status}</dd></div>
          </dl>
        </section>
        <section className="site-drawer__section">
          <h4>常用工牌</h4>
          {worker.preferredBadge ? (
            <dl className="site-drawer__fields">
              <div><dt>设备编号</dt><dd>{worker.preferredBadge.deviceCode}</dd></div>
              <div>
                <dt>状态</dt>
                <dd>
                  <span className="site-status" data-tone={badgeStatusTone(worker.preferredBadge.status)}>
                    {statusText[worker.preferredBadge.status] ?? worker.preferredBadge.status}
                  </span>
                </dd>
              </div>
              {worker.preferredBadge.lastSyncAt ? (
                <div><dt>最近同步</dt><dd>{formatSyncTime(worker.preferredBadge.lastSyncAt)}</dd></div>
              ) : null}
            </dl>
          ) : (
            <p className="site-text-muted">未绑定常用工牌</p>
          )}
        </section>
        <section className="site-drawer__section">
          <h4>正向反馈</h4>
          <p><strong>{worker.praiseSummary.praiseCount}</strong> 次表扬</p>
          {worker.praiseSummary.latestPraiseExcerpt ? (
            <p className="site-text-muted">
              "{worker.praiseSummary.latestPraiseExcerpt}"
              {worker.praiseSummary.latestPraiseAt ? ` · ${formatSyncTime(worker.praiseSummary.latestPraiseAt)}` : ""}
            </p>
          ) : null}
        </section>
      </div>
    </aside>
  );
}

function EditDrawer({
  onCancel,
  onClose,
  onSaved,
  worker
}: {
  onCancel: () => void;
  onClose: () => void;
  onSaved: (worker: SocialWorker) => void;
  worker: SocialWorker;
}) {
  const [name, setName] = useState(worker.name);
  const [phone, setPhone] = useState(worker.phone);
  const [qualifications, setQualifications] = useState(worker.qualificationLabels.join("、"));
  const [status, setStatus] = useState(worker.status);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await siteOperationsApi.updateSocialWorker(worker.id, {
        name: name.trim(),
        phone: phone.trim(),
        qualificationLabels: qualifications.split(/[、,，]/).map((s) => s.trim()).filter(Boolean),
        status
      });
      onSaved(updated);
    } catch {
      setSaving(false);
    }
  };

  return (
    <aside aria-label="编辑服务人员" className="site-drawer">
      <div className="site-drawer__header">
        <h3>编辑服务人员</h3>
        <button aria-label="关闭" className="site-drawer__close" onClick={onClose} type="button">
          <X size={18} />
        </button>
      </div>
      <div className="site-drawer__actions">
        <button className="site-secondary-btn" onClick={onCancel} type="button">取消</button>
        <button className="site-primary-btn" disabled={saving} onClick={handleSave} type="button">
          {saving ? "保存中..." : "保存"}
        </button>
      </div>
      <div className="site-drawer__body">
        <DrawerFormFields
          name={name}
          onNameChange={setName}
          onPhoneChange={setPhone}
          onQualificationsChange={setQualifications}
          phone={phone}
          qualifications={qualifications}
        />
        <label className="site-drawer__field">
          <span>状态</span>
          <select onChange={(e) => setStatus(e.target.value as SocialWorkerStatus)} value={status}>
            <option value="active">在职</option>
            <option value="disabled">已停用</option>
            <option value="incomplete_profile">资料待补全</option>
          </select>
        </label>
      </div>
    </aside>
  );
}

function CreateDrawer({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !phone.trim()) return;
    setCreating(true);
    try {
      await siteOperationsApi.createSocialWorker({
        name: name.trim(),
        phone: phone.trim(),
        workerType: "service_personnel",
        qualificationLabels: qualifications.split(/[、,，]/).map((s) => s.trim()).filter(Boolean)
      });
      onClose();
    } catch {
      setCreating(false);
    }
  };

  return (
    <aside aria-label="新增服务人员" className="site-drawer">
      <div className="site-drawer__header">
        <h3>新增服务人员</h3>
        <button aria-label="关闭" className="site-drawer__close" onClick={onClose} type="button">
          <X size={18} />
        </button>
      </div>
      <div className="site-drawer__actions">
        <button className="site-secondary-btn" onClick={onClose} type="button">取消</button>
        <button className="site-primary-btn" disabled={creating || !name.trim() || !phone.trim()} onClick={handleCreate} type="button">
          {creating ? "创建中..." : "创建"}
        </button>
      </div>
      <div className="site-drawer__body">
        <DrawerFormFields
          name={name}
          onNameChange={setName}
          onPhoneChange={setPhone}
          onQualificationsChange={setQualifications}
          phone={phone}
          qualifications={qualifications}
        />
      </div>
    </aside>
  );
}

function DrawerFormFields({
  name,
  onNameChange,
  onPhoneChange,
  onQualificationsChange,
  phone,
  qualifications
}: {
  name: string;
  onNameChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onQualificationsChange: (v: string) => void;
  phone: string;
  qualifications: string;
}) {
  return (
    <>
      <label className="site-drawer__field">
        <span>姓名</span>
        <input onChange={(e) => onNameChange(e.target.value)} placeholder="输入姓名" value={name} />
      </label>
      <label className="site-drawer__field">
        <span>电话</span>
        <input onChange={(e) => onPhoneChange(e.target.value)} placeholder="输入电话" value={phone} />
      </label>
      <label className="site-drawer__field">
        <span>资质</span>
        <input onChange={(e) => onQualificationsChange(e.target.value)} placeholder="用顿号分隔，如：助餐、陪诊" value={qualifications} />
      </label>
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:

```bash
npx tsc --noEmit
```

Expected: PASS (or only errors in test files that reference old shapes).

- [ ] **Step 3: Commit**

```bash
git add src/features/siteOperations/SocialWorkersArea.tsx
git commit -m "feat: rewrite SocialWorkersArea with Table + Drawer pattern"
```

---

### Task 3: Add Drawer And Filter CSS

**Files:**
- Modify: `src/features/siteOperations/siteOperations.css`

- [ ] **Step 1: Add new CSS rules**

Append the following CSS rules to the end of `src/features/siteOperations/siteOperations.css` (before the `@media` block):

```css
.site-primary-btn {
  background: var(--site-accent);
  border: 0;
  border-radius: 10px;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  height: 34px;
  padding: 0 14px;
}

.site-primary-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.site-secondary-btn {
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid var(--site-line);
  border-radius: 10px;
  color: var(--site-text);
  font-size: 12px;
  font-weight: 650;
  height: 32px;
  padding: 0 12px;
}

.site-danger-btn-ghost {
  background: transparent;
  border: 1px solid var(--site-danger-text);
  border-radius: 10px;
  color: var(--site-danger-text);
  font-size: 12px;
  font-weight: 650;
  height: 32px;
  padding: 0 12px;
}

.site-danger-btn-ghost:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.site-danger-btn {
  background: var(--site-danger-bg);
  border: 1px solid var(--site-danger-text);
  border-radius: 10px;
  color: var(--site-danger-text);
  font-size: 12px;
  font-weight: 700;
  height: 32px;
  padding: 0 12px;
}

.site-filter-dropdown {
  align-items: center;
  display: inline-flex;
  position: relative;
}

.site-filter-dropdown select {
  appearance: none;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid var(--site-line);
  border-radius: 12px;
  color: var(--site-text);
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  height: 36px;
  padding: 0 28px 0 12px;
}

.site-filter-dropdown select.site-filter-dropdown--active {
  color: var(--site-accent);
  font-weight: 650;
}

.site-filter-dropdown svg {
  color: var(--site-muted);
  pointer-events: none;
  position: absolute;
  right: 9px;
}

.site-text-muted {
  color: var(--site-muted);
}

.site-name-link {
  background: none;
  border: 0;
  color: var(--site-accent);
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
  padding: 0;
  text-align: left;
  text-decoration: none;
}

.site-name-link:hover {
  text-decoration: underline;
}

.site-badge-cell {
  align-items: center;
  display: inline-flex;
  gap: 6px;
}

.site-table__row--workers[data-selected="true"] {
  background: var(--site-accent-soft);
}

.site-table__head--workers,
.site-table__row--workers {
  grid-template-columns: 1.1fr 0.9fr 0.9fr 1fr 0.6fr 0.7fr;
}

.site-table__row--workers {
  cursor: default;
}

.site-table--workers-mobile {
  display: none;
}

.site-drawer-scrim {
  background: rgba(17, 24, 39, 0.22);
  border: 0;
  bottom: 0;
  left: 0;
  padding: 0;
  position: fixed;
  right: 0;
  top: 0;
  z-index: 30;
}

.site-drawer {
  background: var(--site-card-strong);
  border-left: 1px solid var(--site-line);
  bottom: 0;
  box-shadow: -8px 0 30px rgba(36, 48, 70, 0.12);
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  position: fixed;
  right: 0;
  top: 0;
  width: 400px;
  z-index: 31;
}

.site-drawer__header {
  align-items: start;
  border-bottom: 1px solid var(--site-line);
  display: flex;
  gap: 12px;
  justify-content: space-between;
  padding: 18px 20px 14px;
}

.site-drawer__header h3 {
  font-size: 16px;
  font-weight: 720;
  margin: 0;
}

.site-drawer__header p {
  margin: 4px 0 0;
}

.site-drawer__close {
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: 8px;
  color: var(--site-muted);
  display: flex;
  height: 32px;
  justify-content: center;
  padding: 0;
  width: 32px;
}

.site-drawer__close:hover {
  background: var(--site-accent-soft);
}

.site-drawer__actions {
  align-items: center;
  border-bottom: 1px solid var(--site-line);
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 20px;
}

.site-drawer__confirm {
  align-items: center;
  display: flex;
  gap: 8px;
  font-size: 12px;
}

.site-drawer__body {
  display: grid;
  gap: 16px;
  grid-auto-rows: max-content;
  overflow-y: auto;
  padding: 18px 20px;
  -webkit-overflow-scrolling: touch;
}

.site-drawer__section {
  display: grid;
  gap: 10px;
}

.site-drawer__section h4 {
  border-bottom: 1px solid var(--site-line);
  color: var(--site-muted);
  font-size: 12px;
  font-weight: 650;
  margin: 0;
  padding-bottom: 6px;
  text-transform: uppercase;
}

.site-drawer__fields {
  display: grid;
  gap: 8px;
  margin: 0;
}

.site-drawer__fields > div {
  display: grid;
  gap: 4px;
  grid-template-columns: 80px minmax(0, 1fr);
}

.site-drawer__fields dt {
  color: var(--site-muted);
  font-size: 12px;
  padding-top: 2px;
}

.site-drawer__fields dd {
  font-size: 13px;
  margin: 0;
}

.site-drawer__field {
  display: grid;
  gap: 6px;
}

.site-drawer__field span {
  color: var(--site-muted);
  font-size: 12px;
  font-weight: 650;
}

.site-drawer__field input,
.site-drawer__field select {
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid var(--site-line);
  border-radius: 10px;
  color: var(--site-text);
  font-family: inherit;
  font-size: 13px;
  height: 38px;
  outline: 0;
  padding: 0 12px;
}

.site-drawer__field input:focus,
.site-drawer__field select:focus {
  border-color: var(--site-accent);
  box-shadow: 0 0 0 2px rgba(11, 91, 211, 0.12);
}

.site-empty-state--action {
  flex-direction: column;
  gap: 10px;
  text-align: center;
}

.site-status--inline {
  display: inline;
  padding: 0;
}

.site-worker-card {
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid var(--site-line);
  border-radius: 14px;
  color: var(--site-text);
  cursor: pointer;
  display: grid;
  gap: 6px;
  padding: 14px;
  text-align: left;
  width: 100%;
}

.site-worker-card__row1 {
  align-items: center;
  display: flex;
  justify-content: space-between;
}

.site-worker-card__row1 strong {
  font-size: 14px;
}
```

- [ ] **Step 2: Add mobile overrides inside the existing @media block**

Inside the existing `@media (max-width: 767px)` block at the end of the file, add:

```css
.site-table--workers {
  display: none;
}

.site-table--workers-mobile {
  display: grid;
  gap: 10px;
}

.site-drawer {
  border-left: 0;
  border-radius: 18px 18px 0 0;
  border-top: 1px solid rgba(255, 255, 255, 0.86);
  bottom: 0;
  box-shadow: 0 -18px 40px rgba(36, 48, 70, 0.16);
  left: 0;
  max-height: 86vh;
  right: 0;
  top: auto;
  width: 100%;
}

.site-drawer__header {
  padding: 14px 16px 12px;
}

.site-drawer__actions {
  padding: 8px 16px;
}

.site-drawer__body {
  padding: 14px 16px;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/siteOperations/siteOperations.css
git commit -m "style: add Drawer, filter dropdown, and worker table styles"
```

---

### Task 4: Update Integration Tests

**Files:**
- Modify: `src/features/siteOperations/__tests__/SiteOperationsPage.test.tsx`

- [ ] **Step 1: Update the socialWorkersResponse fixture**

In `src/features/siteOperations/__tests__/SiteOperationsPage.test.tsx`, replace the `socialWorkersResponse` constant:

```ts
const socialWorkersResponse = {
  socialWorkers: [
    {
      id: "worker-001",
      userId: "user-001",
      name: "王丽",
      phone: "13800000001",
      siteId: "site-001",
      workerType: "service_personnel",
      qualificationLabels: ["助餐", "陪诊"],
      status: "active",
      preferredBadge: {
        badgeId: "badge-021",
        deviceCode: "FW-021",
        status: "available",
        lastSyncAt: "2026-05-13T08:50:00+08:00"
      },
      praiseSummary: {
        praiseCount: 42,
        latestPraiseAt: "2026-05-12T16:30:00+08:00",
        latestPraiseExcerpt: "服务细心周到"
      }
    },
    {
      id: "worker-002",
      userId: "user-002",
      name: "张敏",
      phone: "13800000002",
      siteId: "site-001",
      workerType: "service_personnel",
      qualificationLabels: ["助洁"],
      status: "active",
      praiseSummary: { praiseCount: 17 }
    }
  ],
  operationalState
};
```

- [ ] **Step 2: Update the "covers 服务人员" test**

Replace the existing "covers 服务人员" test:

```ts
it("covers 服务人员", async () => {
  mockSiteOperationsFetch();
  const user = userEvent.setup();
  render(<SiteOperationsPage />);

  await user.click(screen.getAllByRole("button", { name: "服务人员" })[0]);

  expect(await screen.findByRole("region", { name: "服务人员" })).toBeInTheDocument();
  expect(screen.getByText("王丽")).toBeInTheDocument();
  expect(screen.getByText("13800000001")).toBeInTheDocument();
  expect(screen.getByText("助餐、陪诊")).toBeInTheDocument();
  expect(screen.getByText("FW-021")).toBeInTheDocument();
  expect(screen.getByText("42 次")).toBeInTheDocument();
  expect(screen.getByText("新增服务人员")).toBeInTheDocument();
  expect(screen.queryByText("归档")).not.toBeInTheDocument();
  expect(screen.queryByText("编辑")).not.toBeInTheDocument();
  expect(screen.queryByText("绑定工牌")).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "王丽" }));
  expect(await screen.findByLabelText("服务人员详情")).toBeInTheDocument();
  expect(screen.getByText("服务细心周到", { exact: false })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "编辑档案" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "更新常用工牌" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "归档人员" })).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "关闭" }));
  expect(screen.queryByLabelText("服务人员详情")).not.toBeInTheDocument();
});
```

- [ ] **Step 3: Update the SocialWorkersArea state handling case**

In the `cases` array within the `state handling` describe block, replace the SocialWorkersArea case:

```ts
{
  Component: SocialWorkersArea,
  data: () => clone(socialWorkersResponse),
  emptyText: "暂无服务人员",
  loadingText: "服务人员数据加载中",
  mutationAction: "新增服务人员",
  primaryAction: "新增服务人员",
  setEmpty: (data: any) => {
    data.socialWorkers = [];
  },
  setState: (data: any, state: any) => {
    data.operationalState = { ...data.operationalState, ...state };
  },
  title: "服务人员"
},
```

Note: `mutationAction` is now `"新增服务人员"` since there are no row-level mutation buttons — the primary action button is both the `primaryAction` and the testable `mutationAction` for permission checks.

- [ ] **Step 4: Remove old batch action assertion from the state handling test**

In the state handling `it.each` test body, the assertion `expect(screen.getByLabelText(\`${title}批量操作\`))` will fail for SocialWorkersArea because the batch bar has been removed. The current test uses `getByLabelText` which will fail for the social workers case.

Update the batch-action assertions in the `it.each` body by wrapping them in a conditional. Replace the two lines:

```ts
expect(screen.getByLabelText(`${title}批量操作`)).toHaveTextContent("权限：只读");
```

and:

```ts
expect(screen.getByLabelText(`${title}批量操作`)).toHaveTextContent("全选当前页");
expect(screen.getByLabelText(`${title}批量操作`)).toHaveTextContent("查看已选");
```

with:

```ts
if (screen.queryByLabelText(`${title}批量操作`)) {
  expect(screen.getByLabelText(`${title}批量操作`)).toHaveTextContent("权限：只读");
}
```

and:

```ts
if (screen.queryByLabelText(`${title}批量操作`)) {
  expect(screen.getByLabelText(`${title}批量操作`)).toHaveTextContent("全选当前页");
  expect(screen.getByLabelText(`${title}批量操作`)).toHaveTextContent("查看已选");
}
```

- [ ] **Step 5: Run the integration tests**

Run:

```bash
npm test -- src/features/siteOperations/__tests__/SiteOperationsPage.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/siteOperations/__tests__/SiteOperationsPage.test.tsx
git commit -m "test: update service personnel integration tests for Table + Drawer"
```

---

### Task 5: Update E2E Tests

**Files:**
- Modify: `tests/e2e/site-operations.spec.ts`

- [ ] **Step 1: Update the E2E socialWorkersResponse fixture**

In `tests/e2e/site-operations.spec.ts`, replace the `socialWorkersResponse` constant:

```ts
const socialWorkersResponse = {
  socialWorkers: [
    {
      id: "worker-001",
      userId: "user-001",
      name: "王丽",
      phone: "13800000001",
      siteId: "site-001",
      workerType: "service_personnel",
      qualificationLabels: ["助餐", "陪诊"],
      status: "active",
      preferredBadge: {
        badgeId: "badge-021",
        deviceCode: "FW-021",
        status: "available",
        lastSyncAt: "2026-05-13T08:50:00+08:00"
      },
      praiseSummary: {
        praiseCount: 42,
        latestPraiseAt: "2026-05-12T16:30:00+08:00",
        latestPraiseExcerpt: "服务细心周到"
      }
    },
    {
      id: "worker-002",
      userId: "user-002",
      name: "张敏",
      phone: "13800000002",
      siteId: "site-001",
      workerType: "service_personnel",
      qualificationLabels: ["助洁"],
      status: "active",
      praiseSummary: { praiseCount: 17 }
    }
  ],
  operationalState
};
```

- [ ] **Step 2: Update the service worker assertions in the covers test**

In the `covers service worker, badge, object, schedule, and record work-area flows` test, replace the service worker section:

```ts
await page.getByRole("button", { name: "服务人员" }).first().click();
await expect(page.getByRole("region", { exact: true, name: "服务人员" })).toBeVisible();
await expect(page.getByText("王丽").first()).toBeVisible();
await expect(page.getByText("13800000001").first()).toBeVisible();
await expect(page.getByText("助餐、陪诊")).toBeVisible();
await expect(page.getByText("FW-021").first()).toBeVisible();
await expect(page.getByText("42 次")).toBeVisible();
await expect(page.getByRole("button", { name: "新增服务人员" })).toBeVisible();

await page.getByRole("button", { name: "王丽" }).click();
await expect(page.getByLabel("服务人员详情")).toBeVisible();
await expect(page.getByRole("button", { name: "编辑档案" })).toBeVisible();
await expect(page.getByRole("button", { name: "归档人员" })).toBeVisible();
await page.getByRole("button", { name: "关闭" }).click();
await expect(page.getByLabel("服务人员详情")).not.toBeVisible();
```

- [ ] **Step 3: Run E2E tests**

Run:

```bash
npm run test:e2e
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/site-operations.spec.ts
git commit -m "test: update service personnel E2E tests for Table + Drawer"
```

---

### Task 6: Final Verification

**Files:**
- Verify: all modified files

- [ ] **Step 1: Run full unit suite**

Run:

```bash
npm test
```

Expected: all test files pass.

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

Expected: all E2E tests pass.

- [ ] **Step 4: Inspect diff**

Run:

```bash
git diff main -- src/features/siteOperations/SocialWorkersArea.tsx src/features/siteOperations/contracts.ts src/features/siteOperations/siteOperations.css src/features/siteOperations/useSiteOperationsData.ts src/features/siteOperations/api.ts deploy/site-operations-api-fixture.mjs
```

Expected: diff only covers service personnel contract alignment, component rewrite, CSS additions, data hook simplification, and fixture updates. No unrelated files changed.

## Acceptance Checklist

- Table shows 6 columns: 姓名, 联系方式, 资质, 常用工牌, 表扬, 状态.
- No action buttons in table rows.
- Desktop: single-click selects row, click name or double-click opens Drawer.
- Mobile: single-click opens bottom Drawer, table converts to card list.
- Drawer view mode shows worker details with actions in fixed header.
- Drawer edit mode provides form, save returns to view.
- Drawer create mode provides empty form, create closes Drawer.
- Archive button shows confirmation before executing.
- Two dropdown filters (status + badge binding) work independently and together.
- Search filters by name or phone.
- Empty state shows message with create entry.
- Permission states (read_only, restricted) disable mutations.
- `SocialWorker` type matches API contract: `preferredBadge`, `praiseSummary`, `qualificationLabels`.
- Fixture data covers all status combinations.
- Full unit, build, and E2E pass.
