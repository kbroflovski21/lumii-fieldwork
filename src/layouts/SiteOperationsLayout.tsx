import { useState, useCallback, useEffect, useRef, createContext, useContext } from "react";
import { Outlet, useLocation, useNavigate, Link } from "react-router-dom";
import { Bot, UsersRound, Smartphone, UserRound, CalendarDays, FileText, ChevronLeft, ChevronRight, X, ChevronDown, ChevronUp } from "lucide-react";
import { useSite } from "../auth/SiteContext";
import { useAuth } from "../auth/AuthContext";
import { CopilotPanel } from "../features/siteOperations/CopilotPanel";
import { useAgentChat } from "../features/siteOperations/useAgentChat";
import { SITE_OPS_COMMANDS, HeaderCopilotInput } from "../features/siteOperations/CommandInput";
import { ProfileMenu } from "../shared/ProfileMenu";
import { useSiteOperationsData } from "../features/siteOperations/useSiteOperationsData";
import { pathToArea, GY_AREA_TO_PATH } from "../router";
import type { WorkAreaId } from "../features/siteOperations/contracts";
import "../features/siteOperations/siteOperations.css";
import "../shared/shell-profile.css";

/* ── Data context for area components ── */
const SiteOpsDataContext = createContext<ReturnType<typeof useSiteOperationsData> | null>(null);

export function useSiteOpsData() {
  const ctx = useContext(SiteOpsDataContext);
  if (!ctx) throw new Error("useSiteOpsData must be inside SiteOperationsLayout");
  return ctx;
}

/* ── Nav items ── */
const NAV_ITEMS = [
  { id: "home", path: "/", icon: Bot, label: "首页" },
  { id: "social_workers", path: "/workers", icon: UsersRound, label: "服务人员" },
  { id: "smart_badges", path: "/badges", icon: Smartphone, label: "设备" },
  { id: "service_objects", path: "/elders", icon: UserRound, label: "长者" },
  { id: "service_schedules", path: "/schedules", icon: CalendarDays, label: "服务排期" },
  { id: "service_records", path: "/records", icon: FileText, label: "服务记录" },
] as const;

const AREA_LABELS: Record<string, string> = {
  home: "首页",
  social_workers: "服务人员",
  smart_badges: "设备",
  service_objects: "长者",
  service_schedules: "服务排期",
  service_records: "服务记录",
};

export function SiteOperationsLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeArea = pathToArea(location.pathname) as WorkAreaId;
  const { currentSite, sites, selectSite, needsSelection, noSiteAssigned, loading: siteLoading } = useSite();
  const { user } = useAuth();

  const [copilotOpen, setCopilotOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem("gy_sidebar_collapsed") === "true"
  );
  const [siteDropdownOpen, setSiteDropdownOpen] = useState(false);
  const siteDropRef = useRef<HTMLDivElement>(null);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("gy_sidebar_collapsed", String(next));
      return next;
    });
  }, []);

  // Close site dropdown on outside click
  useEffect(() => {
    if (!siteDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (siteDropRef.current && !siteDropRef.current.contains(e.target as Node))
        setSiteDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [siteDropdownOpen]);

  // Copilot chat
  const getToken = useCallback(() => localStorage.getItem("gy_chat_token") ?? "", []);
  const { messages, connected, wip, handleSend, sendCardAction, endRef } = useAgentChat({
    agentId: "lumii-goldenyears",
    sessionId: `copilot:${currentSite?.id ?? "home"}`,
    siteId: currentSite?.id,
    getToken,
  });

  const handleCopilotNavigate = useCallback(
    (area: string, params: Record<string, string>) => {
      const base = GY_AREA_TO_PATH[area] ?? "/";
      const searchParams = new URLSearchParams();
      if (params.search) searchParams.set("search", params.search);
      const qs = searchParams.toString();
      navigate(base + (qs ? `?${qs}` : ""));
    },
    [navigate]
  );

  const sendWithContext = useCallback(
    (content: string) => {
      const label = AREA_LABELS[activeArea] ?? activeArea;
      handleSend(`[ctx:${label}] ${content}`);
    },
    [activeArea, handleSend]
  );

  const openCopilotWithMessage = useCallback(
    (msg: string) => {
      sendWithContext(msg);
      setCopilotOpen(true);
    },
    [sendWithContext]
  );

  // Data hook for area components
  const data = useSiteOperationsData(activeArea, currentSite?.id);

  if (siteLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: "#667386" }}>
        加载中...
      </div>
    );
  }

  if (needsSelection) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: "32px 28px", width: 400, maxWidth: "90vw", boxShadow: "0 16px 48px rgba(0,0,0,0.2)" }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700 }}>选择站点</h2>
          <p style={{ margin: "0 0 20px", fontSize: 14, color: "#64748B" }}>
            您有多个站点的运营权限，请选择要进入的站点
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {sites.map((s) => (
              <button
                key={s.id}
                onClick={() => selectSite(s)}
                type="button"
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
                  border: "1px solid #E2E8F0", borderRadius: 10, background: "#FAFBFC",
                  cursor: "pointer", textAlign: "left",
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 10, background: "#0052CC",
                  color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: 16, flexShrink: 0,
                }}>
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
      {/* Header — full width, above sidebar+main */}
      <header className="site-operations-header">
            {currentSite && sites.length > 0 && (
              <div className="so-site-picker" ref={siteDropRef}>
                <button
                  className="so-site-picker__trigger"
                  onClick={() => sites.length > 1 && setSiteDropdownOpen(!siteDropdownOpen)}
                  type="button"
                  data-open={siteDropdownOpen}
                >
                  <span className="so-site-picker__avatar">{currentSite.name.charAt(0)}</span>
                  <span className="so-site-picker__name">{currentSite.name}</span>
                  {sites.length > 1 &&
                    (siteDropdownOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                </button>
                {siteDropdownOpen && sites.length > 1 && (
                  <div className="so-site-picker__panel">
                    <div className="so-site-picker__panel-header">
                      <span>切换站点</span>
                      <button
                        type="button"
                        className="so-site-picker__close"
                        onClick={() => setSiteDropdownOpen(false)}
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div className="so-site-picker__list">
                      {sites.map((s) => (
                        <button
                          key={s.id}
                          className="so-site-picker__item"
                          data-active={s.id === currentSite.id}
                          onClick={() => {
                            selectSite(s);
                            setSiteDropdownOpen(false);
                          }}
                          type="button"
                        >
                          <span className="so-site-picker__item-avatar">{s.name.charAt(0)}</span>
                          <span className="so-site-picker__item-info">
                            <span className="so-site-picker__item-name">{s.name}</span>
                            <span className="so-site-picker__item-meta">
                              <span className="so-site-picker__dot" />
                              运行中
                            </span>
                          </span>
                          {s.id === currentSite.id && (
                            <span className="so-site-picker__badge">当前</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="site-operations-header__actions">
              <HeaderCopilotInput
                onSend={openCopilotWithMessage}
                onOpenPanel={() => setCopilotOpen(true)}
                commands={SITE_OPS_COMMANDS}
                panelOpen={copilotOpen}
              />
            </div>
      </header>

      {/* Sidebar + Main body */}
      <div
        className="site-operations-body"
        data-sidebar={sidebarCollapsed ? "collapsed" : "expanded"}
        data-copilot-open={copilotOpen}
      >
        {/* Sidebar */}
        <nav className="site-operations-sidebar" aria-label="站点运营导航">
          <div className="site-operations-sidebar__items">
            {NAV_ITEMS.map((item) => {
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
            <ProfileMenu />
          </div>
          {/* Floating collapse toggle on divider */}
          <button className="site-operations-sidebar__divider-toggle" onClick={toggleSidebar} type="button" title={sidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}>
            {sidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </button>
        </nav>

        {/* Main content */}
        <main className="site-operations-main site-operations-main--layout">
          <div className="site-operations-content">
            <SiteOpsDataContext.Provider value={data}>
              <Outlet />
            </SiteOpsDataContext.Provider>
          </div>
        </main>

        {/* Copilot panel */}
        <CopilotPanel
          isOpen={copilotOpen}
          onClose={() => setCopilotOpen(false)}
          messages={messages}
          connected={connected}
          wip={wip}
          endRef={endRef}
          onSend={sendWithContext}
          onNavigate={handleCopilotNavigate}
          onCardAction={sendCardAction}
          title="AI 助手"
          commands={SITE_OPS_COMMANDS}
        />

        {!copilotOpen && (
          <button
            className="copilot-mobile-fab"
            onClick={() => setCopilotOpen(true)}
            type="button"
            aria-label="打开 AI 助手"
          >
            <Bot size={24} color="#FFFCF8" />
          </button>
        )}
      </div> {/* end site-operations-body */}

      {/* Mobile bottom nav */}
      <nav className="site-operations-mobile-nav" aria-label="移动端导航">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              to={item.path}
              className="site-operations-mobile-nav__item"
              data-active={item.id === activeArea}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
