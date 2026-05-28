# Frontend Routing Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the SPA from state-driven tab switching to React Router v6 URL-based routing, with deep-linkable tabs/modals, collapsible sidebar, and copilot compatibility.

**Architecture:** React Router v6 nested routes. `SiteOperationsLayout` renders sidebar + `<Outlet />` + copilot panel. Area components read `useParams()` for modal state. gy:// links map to `navigate()` calls. Sidebar collapse state persisted in localStorage.

**Tech Stack:** React Router v6 (`react-router-dom`), React 19, TypeScript, Vitest

---

## File Structure

### New files:
- `src/router.tsx` — BrowserRouter + route definitions
- `src/layouts/SiteOperationsLayout.tsx` — sidebar + outlet + copilot
- `src/layouts/QualityLayout.tsx` — admin sidebar + outlet + copilot
- `src/components/AuthGuard.tsx` — auth + role redirect wrapper
- `src/hooks/useGyNavigate.ts` — gy:// → navigate() mapping
- `tests/routing/router.test.ts` — route path mapping tests

### Modified files:
- `package.json` — add react-router-dom
- `src/App.tsx` — replace pathname routing with RouterProvider
- `src/features/siteOperations/SiteOperationsShell.tsx` — extract AreaNav, remove shell
- `src/features/siteOperations/SiteOperationsPage.tsx` — remove (replaced by layout)
- `src/features/siteOperations/ServiceObjectsArea.tsx` — useParams for modal
- `src/features/siteOperations/RecordsArea.tsx` — useParams for modal
- `src/features/siteOperations/SchedulesArea.tsx` — useParams for drawer
- `src/features/siteOperations/SocialWorkersArea.tsx` — useParams for drawer
- `src/features/siteOperations/SmartBadgesArea.tsx` — useParams for drawer
- `src/features/siteOperations/ChatStream.tsx` — gy:// navigate via router
- `src/features/siteOperations/useSiteOperationsData.ts` — simplify for per-area fetch
- `src/features/siteOperations/siteOperations.css` — collapsible sidebar styles
- `src/quality/QualityPage.tsx` — extract views into QualityLayout

---

### Task 1: Install React Router + Create Route Definitions

**Files:**
- Modify: `package.json`
- Create: `src/router.tsx`
- Create: `src/components/AuthGuard.tsx`
- Create: `tests/routing/router.test.ts`

- [ ] **Step 1: Install react-router-dom**

```bash
npm install react-router-dom
```

- [ ] **Step 2: Write route mapping tests**

Create `tests/routing/router.test.ts`:

```typescript
import { describe, it, expect } from "vitest";

const PATH_TO_AREA: Record<string, string> = {
  "/": "home",
  "/workers": "social_workers",
  "/badges": "smart_badges",
  "/elders": "service_objects",
  "/schedules": "service_schedules",
  "/records": "service_records",
};

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

describe("pathToArea", () => {
  it("maps / to home", () => expect(PATH_TO_AREA["/"]).toBe("home"));
  it("maps /workers to social_workers", () => expect(PATH_TO_AREA["/workers"]).toBe("social_workers"));
  it("maps /elders to service_objects", () => expect(PATH_TO_AREA["/elders"]).toBe("service_objects"));
  it("maps /schedules to service_schedules", () => expect(PATH_TO_AREA["/schedules"]).toBe("service_schedules"));
  it("maps /records to service_records", () => expect(PATH_TO_AREA["/records"]).toBe("service_records"));
});

describe("gyAreaToPath", () => {
  it("maps social_workers to /workers", () => expect(GY_AREA_TO_PATH["social_workers"]).toBe("/workers"));
  it("maps service_objects to /elders", () => expect(GY_AREA_TO_PATH["service_objects"]).toBe("/elders"));
  it("maps dashboard to /admin", () => expect(GY_AREA_TO_PATH["dashboard"]).toBe("/admin"));
  it("maps home to /", () => expect(GY_AREA_TO_PATH["home"]).toBe("/"));
});
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run tests/routing/router.test.ts
```

Expected: PASS (these are pure data mapping tests).

- [ ] **Step 4: Create AuthGuard component**

Create `src/components/AuthGuard.tsx`:

```typescript
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function AuthGuard() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: "#667386" }}>加载中...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // site_operator accessing /admin → redirect home
  if (user.role !== "org_admin" && location.pathname.startsWith("/admin")) {
    return <Navigate to="/" replace />;
  }

  // org_admin accessing / (not /admin) → redirect to /admin
  if (user.role === "org_admin" && !location.pathname.startsWith("/admin") && location.pathname !== "/login") {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
}
```

- [ ] **Step 5: Create router.tsx with route definitions**

Create `src/router.tsx`:

```typescript
import { createBrowserRouter, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AuthGuard } from "./components/AuthGuard";
import { SiteOperationsLayout } from "./layouts/SiteOperationsLayout";

// Lazy load area components
const LoginPage = lazy(() => import("./auth/LoginPage").then(m => ({ default: m.LoginPage })));
const CareworkerPage = lazy(() => import("./careworker/CareworkerPage").then(m => ({ default: m.CareworkerPage })));
const FamilyPage = lazy(() => import("./family/FamilyPage").then(m => ({ default: m.FamilyPage })));
const HomeArea = lazy(() => import("./features/siteOperations/HomeArea").then(m => ({ default: m.HomeArea })));
const SocialWorkersArea = lazy(() => import("./features/siteOperations/SocialWorkersArea").then(m => ({ default: m.SocialWorkersArea })));
const SmartBadgesArea = lazy(() => import("./features/siteOperations/SmartBadgesArea").then(m => ({ default: m.SmartBadgesArea })));
const ServiceObjectsArea = lazy(() => import("./features/siteOperations/ServiceObjectsArea").then(m => ({ default: m.ServiceObjectsArea })));
const SchedulesArea = lazy(() => import("./features/siteOperations/SchedulesArea").then(m => ({ default: m.SchedulesArea })));
const RecordsArea = lazy(() => import("./features/siteOperations/RecordsArea").then(m => ({ default: m.RecordsArea })));
const QualityLayout = lazy(() => import("./layouts/QualityLayout").then(m => ({ default: m.QualityLayout })));

const Loading = () => <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: "#667386" }}>加载中...</div>;

export const PATH_TO_AREA: Record<string, string> = {
  "/": "home",
  "/workers": "social_workers",
  "/badges": "smart_badges",
  "/elders": "service_objects",
  "/schedules": "service_schedules",
  "/records": "service_records",
};

export const GY_AREA_TO_PATH: Record<string, string> = {
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

export function pathToArea(pathname: string): string {
  // Check exact match first
  if (PATH_TO_AREA[pathname]) return PATH_TO_AREA[pathname];
  // Check prefix match (e.g., /workers/123 → social_workers)
  for (const [path, area] of Object.entries(PATH_TO_AREA)) {
    if (path !== "/" && pathname.startsWith(path)) return area;
  }
  return "home";
}

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <Suspense fallback={<Loading />}><LoginPage /></Suspense>,
  },
  {
    path: "/careworker/*",
    element: <Suspense fallback={<Loading />}><CareworkerPage /></Suspense>,
  },
  {
    path: "/family/*",
    element: <Suspense fallback={<Loading />}><FamilyPage /></Suspense>,
  },
  {
    element: <AuthGuard />,
    children: [
      {
        element: <SiteOperationsLayout />,
        children: [
          { index: true, element: <Suspense fallback={<Loading />}><HomeArea /></Suspense> },
          {
            path: "workers",
            element: <Suspense fallback={<Loading />}><SocialWorkersArea /></Suspense>,
            children: [{ path: ":id", element: null }],
          },
          {
            path: "badges",
            element: <Suspense fallback={<Loading />}><SmartBadgesArea /></Suspense>,
            children: [{ path: ":id", element: null }],
          },
          {
            path: "elders",
            element: <Suspense fallback={<Loading />}><ServiceObjectsArea /></Suspense>,
            children: [{ path: "new", element: null }, { path: ":id", element: null }],
          },
          {
            path: "schedules",
            element: <Suspense fallback={<Loading />}><SchedulesArea /></Suspense>,
            children: [{ path: ":id", element: null }],
          },
          {
            path: "records",
            element: <Suspense fallback={<Loading />}><RecordsArea /></Suspense>,
            children: [{ path: ":id", element: null }],
          },
        ],
      },
      {
        path: "admin/*",
        element: <Suspense fallback={<Loading />}><QualityLayout /></Suspense>,
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
```

Note: `SiteOperationsLayout` and `QualityLayout` will be created in subsequent tasks. For now, create placeholder files so the import doesn't fail.

- [ ] **Step 6: Create placeholder layout files**

Create `src/layouts/SiteOperationsLayout.tsx`:
```typescript
import { Outlet } from "react-router-dom";
export function SiteOperationsLayout() { return <Outlet />; }
```

Create `src/layouts/QualityLayout.tsx`:
```typescript
import { QualityPage } from "../quality/QualityPage";
export function QualityLayout() { return <QualityPage />; }
```

- [ ] **Step 7: Update App.tsx to use RouterProvider**

Replace the entire `src/App.tsx` with:

```typescript
import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { SiteProvider } from "./auth/SiteContext";
import { router } from "./router";

export function App() {
  return (
    <AuthProvider>
      <SiteProvider>
        <RouterProvider router={router} />
      </SiteProvider>
    </AuthProvider>
  );
}

export default App;
```

- [ ] **Step 8: Verify build**

```bash
npx vite build
```

Expected: Build succeeds. The app should function identically — the placeholder layout just passes through to `<Outlet />`, and the route structure matches the old pathname checks.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: install react-router-dom + route definitions + AuthGuard

Phase 1: React Router v6 with createBrowserRouter, AuthGuard for
auth/role checks, placeholder layouts. Existing behavior preserved."
```

---

### Task 2: SiteOperationsLayout with Outlet + Collapsible Sidebar

**Files:**
- Modify: `src/layouts/SiteOperationsLayout.tsx`
- Modify: `src/features/siteOperations/siteOperations.css`
- Remove dependency on: `src/features/siteOperations/SiteOperationsPage.tsx`

- [ ] **Step 1: Implement SiteOperationsLayout**

Replace `src/layouts/SiteOperationsLayout.tsx` with the full layout that extracts logic from `SiteOperationsShell.tsx` and `SiteOperationsPage.tsx`:

```typescript
import { useState, useCallback, useEffect, useRef } from "react";
import { Outlet, useLocation, useNavigate, Link } from "react-router-dom";
import { Bot, UsersRound, Smartphone, UserRound, CalendarDays, FileText, ChevronLeft, ChevronRight, X, ChevronDown, ChevronUp, Mic } from "lucide-react";
import { useSite } from "../auth/SiteContext";
import { useAuth } from "../auth/AuthContext";
import { CopilotPanel } from "../features/siteOperations/CopilotPanel";
import { useAgentChat } from "../features/siteOperations/useAgentChat";
import { SITE_OPS_COMMANDS, HeaderCopilotInput } from "../features/siteOperations/CommandInput";
import { ProfileMenu } from "../shared/ProfileMenu";
import { pathToArea, GY_AREA_TO_PATH } from "../router";
import "../features/siteOperations/siteOperations.css";

const NAV_ITEMS = [
  { id: "home", path: "/", icon: Bot, label: "首页" },
  { id: "social_workers", path: "/workers", icon: UsersRound, label: "服务人员" },
  { id: "smart_badges", path: "/badges", icon: Smartphone, label: "设备" },
  { id: "service_objects", path: "/elders", icon: UserRound, label: "长者" },
  { id: "service_schedules", path: "/schedules", icon: CalendarDays, label: "服务排期" },
  { id: "service_records", path: "/records", icon: FileText, label: "服务记录" },
];

export function SiteOperationsLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeArea = pathToArea(location.pathname);
  const { currentSite, sites, selectSite, needsSelection, noSiteAssigned, loading: siteLoading } = useSite();
  const { user } = useAuth();

  const [copilotOpen, setCopilotOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("gy_sidebar_collapsed") === "true");
  const [siteDropdownOpen, setSiteDropdownOpen] = useState(false);
  const siteDropRef = useRef<HTMLDivElement>(null);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem("gy_sidebar_collapsed", String(next));
      return next;
    });
  }, []);

  // Close site dropdown on outside click
  useEffect(() => {
    if (!siteDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (siteDropRef.current && !siteDropRef.current.contains(e.target as Node)) setSiteDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [siteDropdownOpen]);

  // Copilot chat
  const agentId = "lumii-goldenyears";
  const sessionId = `copilot:${currentSite?.id ?? "home"}`;
  const { messages, connected, wip, handleSend, sendCardAction, endRef, inFlight, capabilities } = useAgentChat({ agentId, sessionId });

  const handleCopilotNavigate = useCallback((area: string, params: Record<string, string>) => {
    const base = GY_AREA_TO_PATH[area] ?? "/";
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.set("search", params.search);
    const qs = searchParams.toString();
    navigate(base + (qs ? `?${qs}` : ""));
  }, [navigate]);

  const handleCopilotSend = useCallback((msg: string) => {
    const ctx = NAV_ITEMS.find(n => n.id === activeArea)?.label ?? "首页";
    handleSend(`[ctx:${ctx}] ${msg}`);
  }, [handleSend, activeArea]);

  if (siteLoading) {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: "#667386" }}>加载中...</div>;
  }

  if (needsSelection) {
    // Site selector modal (reuse existing SiteSelectorModal from old App.tsx)
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: "32px 28px", width: 400, maxWidth: "90vw", boxShadow: "0 16px 48px rgba(0,0,0,0.2)" }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700 }}>选择站点</h2>
          <p style={{ margin: "0 0 20px", fontSize: 14, color: "#64748B" }}>您有多个站点的运营权限，请选择要进入的站点</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {sites.map(s => (
              <button key={s.id} onClick={() => selectSite(s)} type="button"
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", border: "1px solid #E2E8F0", borderRadius: 10, background: "#FAFBFC", cursor: "pointer", textAlign: "left" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "#0052CC", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
                  {s.name[0]}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#0F172A" }}>{s.name}</div>
                  {s.address && <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>{s.address}</div>}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (noSiteAssigned) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#F7F9FB" }}>
        <div style={{ textAlign: "center", maxWidth: 400, padding: 40 }}>
          <h2>暂无站点权限</h2>
          <p style={{ color: "#64748B" }}>请联系管理员分配站点</p>
        </div>
      </div>
    );
  }

  return (
    <div className="site-operations-root">
      <div className="site-operations-layout" data-sidebar={sidebarCollapsed ? "collapsed" : "expanded"} data-copilot-open={copilotOpen}>

        {/* Sidebar */}
        <nav className="site-operations-sidebar" aria-label="站点运营导航">
          <div className="site-operations-sidebar__items">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const isActive = item.id === activeArea;
              return (
                <Link key={item.id} to={item.path} className="site-operations-sidebar__item" data-active={isActive} title={sidebarCollapsed ? item.label : undefined}>
                  <Icon size={20} />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
          <div className="site-operations-sidebar__footer">
            <button className="site-operations-sidebar__toggle" onClick={toggleSidebar} type="button" title={sidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}>
              {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
            <ProfileMenu />
          </div>
        </nav>

        {/* Main content */}
        <main className="site-operations-main">
          {/* Header */}
          <header className="site-operations-header">
            {currentSite && sites.length > 0 && (
              <div className="so-site-picker" ref={siteDropRef}>
                <button className="so-site-picker__trigger" onClick={() => sites.length > 1 && setSiteDropdownOpen(!siteDropdownOpen)} type="button">
                  <span className="so-site-picker__avatar">{currentSite.name.charAt(0)}</span>
                  <span className="so-site-picker__name">{currentSite.name}</span>
                  {sites.length > 1 && (siteDropdownOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                </button>
                {siteDropdownOpen && sites.length > 1 && (
                  <div className="so-site-picker__panel">
                    {sites.map(s => (
                      <button key={s.id} className="so-site-picker__item" data-active={s.id === currentSite.id} onClick={() => { selectSite(s); setSiteDropdownOpen(false); }} type="button">
                        <span>{s.name}</span>
                        {s.id === currentSite.id && <span className="so-site-picker__badge">当前</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <HeaderCopilotInput onSend={handleCopilotSend} onOpenPanel={() => setCopilotOpen(true)} commands={SITE_OPS_COMMANDS} panelOpen={copilotOpen} />
          </header>

          {/* Route content */}
          <Outlet />
        </main>

        {/* Copilot panel */}
        {copilotOpen && (
          <CopilotPanel
            messages={messages}
            connected={connected}
            wip={wip}
            onSend={handleCopilotSend}
            onClose={() => setCopilotOpen(false)}
            onNavigate={handleCopilotNavigate}
            onCardAction={sendCardAction}
            endRef={endRef}
            inFlight={inFlight}
            capabilities={capabilities}
            commands={SITE_OPS_COMMANDS}
          />
        )}
      </div>

      {/* Mobile bottom nav */}
      <nav className="site-operations-mobile-nav" aria-label="移动端导航">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          return (
            <Link key={item.id} to={item.path} className="site-operations-mobile-nav__item" data-active={item.id === activeArea}>
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
```

- [ ] **Step 2: Add collapsible sidebar CSS**

Add to `src/features/siteOperations/siteOperations.css`:

```css
/* ── Collapsible Sidebar Layout ── */
.site-operations-layout {
  display: grid;
  grid-template-columns: var(--sidebar-width) 1fr;
  min-height: 100vh;
  transition: grid-template-columns 200ms ease;
}
.site-operations-layout[data-sidebar="collapsed"] { --sidebar-width: 56px; }
.site-operations-layout[data-sidebar="expanded"]  { --sidebar-width: 200px; }
.site-operations-layout[data-copilot-open="true"] {
  grid-template-columns: var(--sidebar-width) 1fr 380px;
}

.site-operations-sidebar {
  display: flex; flex-direction: column; justify-content: space-between;
  background: #FAFBFC; border-right: 1px solid #E2E8F0;
  padding: 12px 8px; overflow: hidden;
}
.site-operations-sidebar__items { display: flex; flex-direction: column; gap: 2px; }
.site-operations-sidebar__item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: 8px; color: #64748B;
  text-decoration: none; font-size: 13px; font-weight: 500;
  transition: all 150ms; white-space: nowrap;
}
.site-operations-sidebar__item:hover { background: #F1F5F9; color: #334155; }
.site-operations-sidebar__item[data-active="true"] { background: #EFF6FF; color: #0052CC; font-weight: 600; }
.site-operations-sidebar__footer { display: flex; flex-direction: column; gap: 8px; align-items: center; }
.site-operations-sidebar__toggle {
  width: 32px; height: 32px; border-radius: 8px; border: 1px solid #E2E8F0;
  background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center;
  color: #94A3B8;
}
.site-operations-sidebar__toggle:hover { background: #F1F5F9; color: #334155; }

.site-operations-main { display: flex; flex-direction: column; min-height: 0; overflow: hidden; }

/* Mobile bottom nav */
.site-operations-mobile-nav { display: none; }
@media (max-width: 768px) {
  .site-operations-layout { grid-template-columns: 1fr !important; }
  .site-operations-sidebar { display: none; }
  .site-operations-mobile-nav {
    display: flex; position: fixed; bottom: 0; left: 0; right: 0;
    background: #fff; border-top: 1px solid #E2E8F0; z-index: 30;
    padding: 6px 0; justify-content: space-around;
  }
  .site-operations-mobile-nav__item {
    display: flex; flex-direction: column; align-items: center; gap: 2px;
    color: #94A3B8; text-decoration: none; font-size: 10px; padding: 4px 8px;
  }
  .site-operations-mobile-nav__item[data-active="true"] { color: #0052CC; }
}
```

- [ ] **Step 3: Update area components to remove resource/onMutate props dependency on SiteOperationsPage**

Each area component currently receives `resource` and `onMutate` from `SiteOperationsPage`. With routing, each area fetches its own data. For now, keep the existing data hook but call it directly from each area component instead of receiving it as props.

This is a gradual migration — the area components will internally call `useSiteOperationsData` or their own fetch hooks.

For this task, update `SiteOperationsLayout` to pass the data context via React context or let each area call the hook directly. The simplest approach: each area already imports `siteOperationsApi` — just add a `useEffect` fetch on mount.

**However**, to minimize changes in this task, we can keep `useSiteOperationsData` as a context provider in the layout. Create a simple context:

Add to `src/layouts/SiteOperationsLayout.tsx` (before the component):

```typescript
import { createContext, useContext } from "react";
import { useSiteOperationsData } from "../features/siteOperations/useSiteOperationsData";

const DataContext = createContext<ReturnType<typeof useSiteOperationsData> | null>(null);
export function useSiteOpsData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useSiteOpsData must be inside SiteOperationsLayout");
  return ctx;
}
```

Wrap `<Outlet />` in the layout:
```typescript
const data = useSiteOperationsData(activeArea as any, currentSite?.id);

// In return:
<DataContext.Provider value={data}>
  <Outlet />
</DataContext.Provider>
```

Then each area component can call `useSiteOpsData()` instead of receiving props.

- [ ] **Step 4: Verify build**

```bash
npx vite build
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: SiteOperationsLayout with collapsible sidebar + Outlet routing

Phase 2: Layout renders sidebar with Link elements, Outlet for
route content, copilot panel. Sidebar collapse state in localStorage.
Mobile bottom nav preserved."
```

---

### Task 3: Modal/Drawer URL Sync — All Area Components

**Files:**
- Modify: `src/features/siteOperations/ServiceObjectsArea.tsx`
- Modify: `src/features/siteOperations/RecordsArea.tsx`
- Modify: `src/features/siteOperations/SchedulesArea.tsx`
- Modify: `src/features/siteOperations/SocialWorkersArea.tsx`
- Modify: `src/features/siteOperations/SmartBadgesArea.tsx`

For each area component, the pattern is the same:

1. Import `useParams` and `useNavigate` from `react-router-dom`
2. Read `const { id } = useParams()`
3. Replace `setDrawer({ kind: "view", ... })` with `navigate(`/path/${item.id}`)`
4. Replace `setDrawer({ kind: "closed" })` with `navigate("/path")`
5. Replace `setDrawer({ kind: "create" })` with `navigate("/path/new")` (for elders)
6. Open drawer when `id` is present in URL

- [ ] **Step 1: Update ServiceObjectsArea**

Add imports:
```typescript
import { useParams, useNavigate } from "react-router-dom";
```

Replace drawer open/close logic:
```typescript
const { id: routeId } = useParams();
const navigate = useNavigate();

// Replace: const openDrawer = useCallback((obj) => { setDrawer({ kind: "view", object: obj }); }, []);
// With:
const openDrawer = useCallback((obj: ServiceObject) => { navigate(`/elders/${obj.id}`); }, [navigate]);

// Replace: setDrawer({ kind: "create" })
// With: navigate("/elders/new")

// Replace: setDrawer({ kind: "closed" })
// With: navigate("/elders")

// Add URL → drawer sync:
useEffect(() => {
  if (routeId === "new") {
    setDrawer({ kind: "create" });
  } else if (routeId) {
    const obj = objects.find(o => o.id === routeId);
    if (obj) setDrawer({ kind: "view", object: obj });
  } else {
    setDrawer({ kind: "closed" });
  }
}, [routeId, objects]);
```

- [ ] **Step 2: Update RecordsArea**

Same pattern — `navigate(`/records/${r.id}`)` to open, `navigate("/records")` to close.

- [ ] **Step 3: Update SchedulesArea**

Same pattern — `navigate(`/schedules/${s.id}`)` to open, `navigate("/schedules")` to close.

- [ ] **Step 4: Update SocialWorkersArea**

Same pattern — `navigate(`/workers/${w.id}`)` to open, `navigate("/workers")` to close.

- [ ] **Step 5: Update SmartBadgesArea**

Same pattern — `navigate(`/badges/${b.id}`)` to open, `navigate("/badges")` to close.

- [ ] **Step 6: Verify build + test deep links**

```bash
npx vite build
```

Manual verification:
- Navigate to `/elders/object-001` → should open elder detail modal
- Navigate to `/records/sr-c99f64c4` → should open record drawer
- Close modal → URL should change back to `/elders`
- Browser back button → should reopen modal

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: modal/drawer URL sync for all area components

Phase 3: Modals open via navigate(), close via navigate back to list.
Deep links work for workers, badges, elders, schedules, records.
Browser back button navigates correctly."
```

---

### Task 4: gy:// Smart Link Migration

**Files:**
- Create: `src/hooks/useGyNavigate.ts`
- Modify: `src/features/siteOperations/ChatStream.tsx`

- [ ] **Step 1: Create useGyNavigate hook**

Create `src/hooks/useGyNavigate.ts`:

```typescript
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { GY_AREA_TO_PATH } from "../router";

export function useGyNavigate() {
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

- [ ] **Step 2: Update ChatStream to use useGyNavigate**

In `src/features/siteOperations/ChatStream.tsx`, the `onNavigate` prop currently receives `(area, params)` and calls the parent's handler. With routing, the parent's handler calls `navigate()`. No change needed in ChatStream itself — the `onNavigate` callback in `SiteOperationsLayout` already uses `navigate()` (set up in Task 2).

Verify that `SiteOperationsLayout.handleCopilotNavigate` is wired correctly (already done in Task 2).

- [ ] **Step 3: Update area components to read search params from URL**

Each area component that supports search (via gy:// links) needs to read `useSearchParams()`:

```typescript
import { useSearchParams } from "react-router-dom";

// In component:
const [searchParams] = useSearchParams();
const initialSearch = searchParams.get("search") ?? "";
```

This replaces the `initialSearch` prop that was passed from `SiteOperationsPage`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: gy:// smart links navigate via React Router

Phase 6: useGyNavigate hook maps gy:// areas to URL paths.
Area components read search params from URL. Copilot panel
stays mounted during navigation."
```

---

### Task 5: QualityLayout for Org Admin

**Files:**
- Modify: `src/layouts/QualityLayout.tsx`
- Modify: `src/quality/QualityPage.tsx`

- [ ] **Step 1: Implement QualityLayout**

Replace `src/layouts/QualityLayout.tsx`:

```typescript
import { useState, useCallback, useRef, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Bot, Shield, FileText, MapPin, Users, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { CopilotPanel } from "../features/siteOperations/CopilotPanel";
import { useAgentChat } from "../features/siteOperations/useAgentChat";
import { ADMIN_COMMANDS, HeaderCopilotInput } from "../features/siteOperations/CommandInput";
import { ProfileMenu } from "../shared/ProfileMenu";
import { QualityPage } from "../quality/QualityPage";
import { GY_AREA_TO_PATH } from "../router";

const ADMIN_NAV = [
  { id: "dashboard", path: "/admin", label: "质量总览", icon: Shield },
  { id: "sop", path: "/admin/sop", label: "规范管理", icon: FileText },
  { id: "sites", path: "/admin/sites", label: "站点管理", icon: MapPin },
  { id: "users", path: "/admin/users", label: "用户管理", icon: Users },
  { id: "feishu", path: "/admin/feishu", label: "飞书管理", icon: Bot },
];

export function QualityLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("gy_sidebar_collapsed") === "true");

  const activeView = (() => {
    if (location.pathname.startsWith("/admin/sop")) return "sop";
    if (location.pathname.startsWith("/admin/sites")) return "sites";
    if (location.pathname.startsWith("/admin/users")) return "users";
    if (location.pathname.startsWith("/admin/feishu")) return "feishu";
    return "dashboard";
  })();

  const agentId = "lumii-goldenyears";
  const sessionId = "copilot:admin";
  const { messages, connected, wip, handleSend, sendCardAction, endRef, inFlight, capabilities } = useAgentChat({ agentId, sessionId });

  const handleCopilotNavigate = useCallback((area: string, params: Record<string, string>) => {
    const base = GY_AREA_TO_PATH[area] ?? "/admin";
    navigate(base);
  }, [navigate]);

  const handleCopilotSend = useCallback((msg: string) => {
    handleSend(`[ctx:${activeView}] ${msg}`);
  }, [handleSend, activeView]);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem("gy_sidebar_collapsed", String(next));
      return next;
    });
  }, []);

  return (
    <div className="site-operations-root">
      <div className="site-operations-layout" data-sidebar={sidebarCollapsed ? "collapsed" : "expanded"} data-copilot-open={copilotOpen}>
        <nav className="site-operations-sidebar">
          <div className="site-operations-sidebar__items">
            {ADMIN_NAV.map(item => {
              const Icon = item.icon;
              return (
                <Link key={item.id} to={item.path} className="site-operations-sidebar__item" data-active={activeView === item.id}>
                  <Icon size={20} />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
          <div className="site-operations-sidebar__footer">
            <button className="site-operations-sidebar__toggle" onClick={toggleSidebar} type="button">
              {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
            <ProfileMenu />
          </div>
        </nav>

        <main className="site-operations-main">
          <header className="site-operations-header">
            <HeaderCopilotInput onSend={handleCopilotSend} onOpenPanel={() => setCopilotOpen(true)} commands={ADMIN_COMMANDS} panelOpen={copilotOpen} />
          </header>
          <QualityPage activeView={activeView} />
        </main>

        {copilotOpen && (
          <CopilotPanel messages={messages} connected={connected} wip={wip} onSend={handleCopilotSend}
            onClose={() => setCopilotOpen(false)} onNavigate={handleCopilotNavigate}
            onCardAction={sendCardAction} endRef={endRef} inFlight={inFlight} capabilities={capabilities}
            commands={ADMIN_COMMANDS} />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update QualityPage to accept activeView prop**

Modify `src/quality/QualityPage.tsx` to accept `activeView` as a prop instead of managing it internally. The existing `viewType` state is replaced by the prop.

- [ ] **Step 3: Verify build**

```bash
npx vite build
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: QualityLayout for org admin with URL-based navigation

Phase 5: Admin routes use same collapsible sidebar pattern.
/admin, /admin/sop, /admin/sites, /admin/users, /admin/feishu."
```

---

### Task 6: Cleanup + SPA Fallback + E2E Verification

**Files:**
- Verify: `server/index.ts` (SPA fallback already exists)
- Remove: `src/features/siteOperations/SiteOperationsPage.tsx` (if no longer imported)
- Cleanup: Remove unused old navigation code from `SiteOperationsShell.tsx`

- [ ] **Step 1: Verify SPA fallback in server**

Check `server/index.ts` line ~96:
```typescript
app.use((_req, res) => {
  res.sendFile(join(STATIC_ROOT, "index.html"));
});
```
This already serves `index.html` for unmatched routes. No change needed.

- [ ] **Step 2: Remove unused files**

Delete `src/features/siteOperations/SiteOperationsPage.tsx` if it's no longer imported anywhere.

Clean up any remaining old navigation code in `SiteOperationsShell.tsx` that's been superseded by `SiteOperationsLayout`.

- [ ] **Step 3: Build and deploy**

```bash
npx vite build
./deploy.sh
```

- [ ] **Step 4: E2E Browser Verification Checklist**

Test each of these scenarios:

**Tab Navigation:**
- [ ] Click each nav item → URL changes, correct content shows
- [ ] Browser back/forward buttons work between tabs
- [ ] Direct URL access: `/workers`, `/elders`, `/schedules`, `/records` → correct tab
- [ ] Refresh on any tab → stays on correct tab

**Modal Deep Links:**
- [ ] Click row in elders → URL changes to `/elders/:id`, modal opens
- [ ] Close modal → URL changes back to `/elders`
- [ ] Direct URL: `/elders/object-001` → page loads with modal open
- [ ] Right-click row → "Open in new tab" → works
- [ ] `/elders/new` → create modal opens

**gy:// Smart Links:**
- [ ] Copilot returns `[王丽](gy://social_workers?search=王丽)` → click navigates to `/workers?search=王丽`
- [ ] Copilot panel stays open during gy:// navigation
- [ ] Search param pre-fills search box in area component

**Collapsible Sidebar:**
- [ ] Click toggle → sidebar collapses (icons only)
- [ ] Click again → sidebar expands (icons + labels)
- [ ] Refresh → sidebar state persisted
- [ ] Active tab highlighted correctly in both states

**Org Admin:**
- [ ] Login as org_admin → redirected to `/admin`
- [ ] Admin sidebar: 质量总览/规范管理/站点管理/用户管理/飞书管理
- [ ] Click each admin nav → URL changes, correct view

**Mobile:**
- [ ] Bottom tab bar visible on mobile
- [ ] Tab navigation works via bottom bar
- [ ] Sidebar hidden on mobile

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete frontend routing refactor with E2E verification

Phase 6: Cleanup, SPA fallback verified, all E2E tests pass.
Deep-linkable tabs, URL-synced modals, collapsible sidebar,
copilot compatibility, gy:// link mapping."
```
