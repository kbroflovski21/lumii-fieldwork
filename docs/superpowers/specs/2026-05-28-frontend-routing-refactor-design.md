# Frontend Routing Architecture Refactor — Design Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor the SPA from state-driven tab switching to URL-based routing using React Router v6, enabling deep-linkable tabs and modals, a collapsible sidebar, and preserving copilot panel state across navigation.

**Architecture:** React Router v6 with nested routes. Layout components (`SiteOperationsLayout`, `QualityLayout`) render sidebar + copilot + `<Outlet />`. Child routes render area content. Modal/drawer routes use `useParams()` to sync URL with open state. gy:// links map to `navigate()` calls.

**Tech Stack:** React Router v6 (`react-router-dom`), existing React + TypeScript stack

---

## 1. URL Path Design

### Site Operations (site_operator)

| URL | Component | Description |
|-----|-----------|-------------|
| `/` | HomeArea | 首页 dashboard |
| `/workers` | SocialWorkersArea | 服务人员列表 |
| `/workers/:id` | SocialWorkersArea + modal | 服务人员详情 |
| `/badges` | SmartBadgesArea | 设备列表 |
| `/badges/:id` | SmartBadgesArea + modal | 设备详情 |
| `/elders` | ServiceObjectsArea | 长者列表 |
| `/elders/new` | ServiceObjectsArea + create modal | 新建长者 |
| `/elders/:id` | ServiceObjectsArea + view modal | 长者详情 |
| `/schedules` | SchedulesArea | 服务排期 |
| `/schedules/:id` | SchedulesArea + drawer | 排期详情 |
| `/records` | RecordsArea | 服务记录 |
| `/records/:id` | RecordsArea + drawer | 服务记录详情 |

### Org Admin (org_admin)

| URL | Component | Description |
|-----|-----------|-------------|
| `/admin` | QualityPage dashboard view | 质量总览 |
| `/admin/sop` | SOP management view | 规范管理 |
| `/admin/sites` | Sites management view | 站点管理 |
| `/admin/users` | Users management view | 用户管理 |
| `/admin/feishu` | Feishu management view | 飞书管理 |

### Other

| URL | Component |
|-----|-----------|
| `/login` | LoginPage |
| `/careworker/*` | CareworkerPage |
| `/family/*` | FamilyPage |

## 2. Route Structure

```tsx
<BrowserRouter>
  <Routes>
    {/* Public */}
    <Route path="/login" element={<LoginPage />} />
    <Route path="/careworker/*" element={<CareworkerPage />} />
    <Route path="/family/*" element={<FamilyPage />} />

    {/* Auth guard */}
    <Route element={<AuthGuard />}>
      {/* Site Operations */}
      <Route element={<SiteOperationsLayout />}>
        <Route index element={<HomeArea />} />
        <Route path="workers" element={<SocialWorkersArea />}>
          <Route path=":id" element={null} />
        </Route>
        <Route path="badges" element={<SmartBadgesArea />}>
          <Route path=":id" element={null} />
        </Route>
        <Route path="elders" element={<ServiceObjectsArea />}>
          <Route path="new" element={null} />
          <Route path=":id" element={null} />
        </Route>
        <Route path="schedules" element={<SchedulesArea />}>
          <Route path=":id" element={null} />
        </Route>
        <Route path="records" element={<RecordsArea />}>
          <Route path=":id" element={null} />
        </Route>
      </Route>

      {/* Org Admin */}
      <Route path="admin" element={<QualityLayout />}>
        <Route index element={<DashboardView />} />
        <Route path="sop" element={<SopView />} />
        <Route path="sites" element={<SitesView />} />
        <Route path="users" element={<UsersView />} />
        <Route path="feishu" element={<FeishuView />} />
      </Route>
    </Route>

    {/* Catch-all */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
</BrowserRouter>
```

### AuthGuard component

Wraps authenticated routes. Checks `useAuth()` — redirects to `/login` if not authenticated. Renders `<Outlet />` if authenticated. Also handles role-based redirects (site_operator accessing `/admin` → redirect to `/`).

### Child routes with `element={null}`

The `:id` and `new` child routes don't render their own component. Instead, the parent area component reads `useParams()` and opens the modal/drawer accordingly. This keeps the modal rendering logic inside the area component where it belongs.

## 3. Layout Components

### SiteOperationsLayout

Replaces `SiteOperationsShell`. Renders:

```
┌─────┬──────────────────────────┬───────────┐
│ Nav │      <Outlet />          │ Copilot   │
│     │  (area content swaps    │ Panel     │
│     │   on route change)      │ (sticky)  │
│     │                         │           │
│  ☰  │                         │           │
│     │                         │           │
└─────┴──────────────────────────┴───────────┘
```

- Sidebar (`nav`): collapsible, icons + optional labels
- Main area: `<Outlet />` — React Router swaps child route component
- Copilot panel: rendered once in layout, never unmounts on tab switch

**Active tab detection:** Use `useLocation()` to determine which nav item is active:
```typescript
const location = useLocation();
const activeArea = pathToArea(location.pathname);
// "/" → "home", "/workers" → "social_workers", etc.
```

No more `activeArea` state — derived from URL.

### QualityLayout

Similar structure for org admin. Sidebar with admin nav items, `<Outlet />` for content, copilot panel.

## 4. Modal/Drawer URL Sync

Each area component handles its own modal state based on URL params:

```typescript
function ServiceObjectsArea() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [drawerData, setDrawerData] = useState<ServiceObject | null>(null);

  // URL → modal state
  useEffect(() => {
    if (id === "new") {
      setDrawerData(null); // create mode
    } else if (id) {
      // fetch object by id, then open drawer
      fetchObject(id).then(setDrawerData);
    } else {
      setDrawerData(null); // closed
    }
  }, [id]);

  const isDrawerOpen = !!id;
  const isCreateMode = id === "new";

  // Close modal → navigate back to list
  const handleClose = () => navigate("/elders");

  // Open modal → navigate to detail URL
  const handleRowClick = (obj: ServiceObject) => navigate(`/elders/${obj.id}`);

  return (
    <>
      {/* List content always visible */}
      <ObjectList onRowClick={handleRowClick} />

      {/* Modal renders based on URL */}
      {isDrawerOpen && (
        <>
          <div className="sw-scrim" onClick={handleClose} />
          {isCreateMode
            ? <CreateModal onClose={handleClose} />
            : <ViewModal object={drawerData} onClose={handleClose} />
          }
        </>
      )}
    </>
  );
}
```

**Browser back button:** Closing modal navigates to the list URL, so back button works naturally.

**Right-click "open in new tab":** Row links use `<Link to={`/elders/${id}`}>` so the browser context menu works for opening in a new tab.

## 5. gy:// Smart Link Migration

`parseGyLink()` remains the same. The `onNavigate` handler changes from setting state to calling `navigate()`:

```typescript
const GY_AREA_TO_PATH: Record<string, string> = {
  home: "/",
  social_workers: "/workers",
  smart_badges: "/badges",
  service_objects: "/elders",
  service_schedules: "/schedules",
  service_records: "/records",
  dashboard: "/admin",
  sites: "/admin/sites",
  users: "/admin/users",
  sop: "/admin/sop",
};

function useGyNavigate() {
  const navigate = useNavigate();
  return useCallback((area: string, params: Record<string, string>) => {
    const base = GY_AREA_TO_PATH[area] ?? "/";
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.set("search", params.search);
    const qs = searchParams.toString();
    navigate(base + (qs ? `?${qs}` : ""));
  }, [navigate]);
}
```

Search params (`?search=王丽`) are read by area components via `useSearchParams()`.

## 6. Collapsible Sidebar

### State

```typescript
const [collapsed, setCollapsed] = useState(() => localStorage.getItem("gy_sidebar_collapsed") === "true");
const toggleSidebar = () => setCollapsed(prev => {
  const next = !prev;
  localStorage.setItem("gy_sidebar_collapsed", String(next));
  return next;
});
```

### Layout

| State | Width | Content |
|-------|-------|---------|
| Collapsed | 56px | Icons only |
| Expanded | 200px | Icons + labels |

Toggle button at the bottom of the sidebar (chevron icon).

### CSS

```css
.site-operations-layout {
  display: grid;
  grid-template-columns: var(--sidebar-width) 1fr var(--copilot-width, 0px);
}
.site-operations-layout[data-sidebar="collapsed"] { --sidebar-width: 56px; }
.site-operations-layout[data-sidebar="expanded"]  { --sidebar-width: 200px; }
```

Transition: `transition: grid-template-columns 200ms ease`.

### Mobile

On mobile (< 768px), sidebar collapses to bottom tab bar (current behavior preserved). Collapse/expand only applies to desktop.

## 7. Data Fetching Strategy

Current: `useSiteOperationsData(activeArea, siteId)` fetches all data types eagerly on `refetch()`.

Change: Each area component fetches its own data independently. This is already partially the case — `useSiteOperationsData` returns separate resources. With routing, each area component mounts/unmounts on navigation, so data fetching happens on mount.

The `refetch` callback is replaced by each area calling its own fetch on mount and after mutations. Cross-area refresh (e.g., creating a plan in elders → schedules update) is handled by invalidating a shared `refetchKey` in context.

## 8. Migration Strategy

### Phase 1: Install React Router + wrap App
- `npm install react-router-dom`
- Wrap `<App>` in `<BrowserRouter>`
- Replace `window.location.pathname` checks with `<Routes>`
- Keep existing components unchanged initially

### Phase 2: SiteOperationsLayout with Outlet
- Create `SiteOperationsLayout` with sidebar + copilot + `<Outlet />`
- Replace `SiteOperationsPage` conditional rendering with nested routes
- Sidebar reads `useLocation()` for active state (no more `activeArea` state)

### Phase 3: Modal URL sync
- Each area component reads `useParams()` for `:id`
- Modals open/close via `navigate()` instead of `setDrawer()`
- Row clicks use `<Link>` or `navigate()` for right-click support

### Phase 4: Collapsible sidebar
- Add collapse/expand state with localStorage persistence
- CSS grid transition
- Toggle button

### Phase 5: QualityLayout
- Same pattern for org admin routes
- Extract QualityPage views into separate components

### Phase 6: gy:// link migration
- Update `ChatStream.onNavigate` to use `navigate()`
- Update `GY_AREA_TO_PATH` mapping
- Verify copilot panel stays open during navigation

## 9. Files to Create/Modify

### New files:
- `src/router.tsx` — route definitions
- `src/layouts/SiteOperationsLayout.tsx` — sidebar + outlet + copilot
- `src/layouts/QualityLayout.tsx` — admin sidebar + outlet + copilot
- `src/components/AuthGuard.tsx` — auth + role guard

### Modified files:
- `src/App.tsx` — replace pathname routing with `<RouterProvider>` or `<BrowserRouter>`
- `src/features/siteOperations/SiteOperationsPage.tsx` — remove, replaced by layout
- `src/features/siteOperations/SiteOperationsShell.tsx` — refactor into layout
- `src/features/siteOperations/ServiceObjectsArea.tsx` — add useParams/useNavigate for modal
- `src/features/siteOperations/RecordsArea.tsx` — same
- `src/features/siteOperations/SchedulesArea.tsx` — same
- `src/features/siteOperations/SocialWorkersArea.tsx` — same
- `src/features/siteOperations/SmartBadgesArea.tsx` — same
- `src/features/siteOperations/ChatStream.tsx` — gy:// navigate via router
- `src/features/siteOperations/useSiteOperationsData.ts` — refactor to per-area hooks
- `src/features/siteOperations/siteOperations.css` — collapsible sidebar styles
- `src/quality/QualityPage.tsx` — extract views, add router
- `server/index.ts` — ensure SPA fallback (serve index.html for all unmatched routes)

### Server SPA fallback
The Express server must serve `index.html` for any route that doesn't match an API endpoint, so browser refreshes on `/elders/object-001` work:

```typescript
app.get("*", (req, res) => {
  res.sendFile(join(STATIC_ROOT, "index.html"));
});
```

This should already be handled by the static file serving, but needs verification.
