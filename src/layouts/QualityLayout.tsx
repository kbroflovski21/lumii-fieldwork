import { useState, useCallback, useEffect, useRef } from "react";
import { Outlet, useLocation, useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import { Bot, Shield, FileText, MapPin, Users, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { CopilotPanel } from "../features/siteOperations/CopilotPanel";
import { useAgentChat } from "../features/siteOperations/useAgentChat";
import { ADMIN_COMMANDS, HeaderCopilotInput } from "../features/siteOperations/CommandInput";
import { ProfileMenu } from "../shared/ProfileMenu";
import { QualityPage } from "../quality/QualityPage";
import { GY_AREA_TO_PATH } from "../router";
import { DetailPageProvider, useDetailEntity } from "../shared/DetailPageContext";
import "../features/siteOperations/siteOperations.css";
import "../shared/shell-profile.css";

type View = "dashboard" | "sop" | "sites" | "users" | "feishu";

const ADMIN_NAV = [
  { id: "dashboard", path: "/admin", icon: Shield, label: "质量总览" },
  { id: "sop", path: "/admin/sop", icon: FileText, label: "规范管理" },
  { id: "sites", path: "/admin/sites", icon: MapPin, label: "站点管理" },
  { id: "users", path: "/admin/users", icon: Users, label: "用户管理" },
  { id: "feishu", path: "/admin/feishu", icon: Bot, label: "飞书管理" },
];

const VIEW_TO_PATH: Record<View, string> = {
  dashboard: "/admin",
  sop: "/admin/sop",
  sites: "/admin/sites",
  users: "/admin/users",
  feishu: "/admin/feishu",
};

function pathToView(pathname: string): View {
  if (pathname.startsWith("/admin/sop")) return "sop";
  if (pathname.startsWith("/admin/sites")) return "sites";
  if (pathname.startsWith("/admin/users")) return "users";
  if (pathname.startsWith("/admin/feishu")) return "feishu";
  return "dashboard";
}

function QualityLayoutInner() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const activeView = pathToView(location.pathname);

  const [copilotOpen, setCopilotOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("gy_sidebar_collapsed") === "true");

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem("gy_sidebar_collapsed", String(next));
      return next;
    });
  }, []);

  const [refetchKey, setRefetchKey] = useState(0);
  const qualityRefetch = useCallback(() => setRefetchKey(k => k + 1), []);

  const getToken = useCallback(() => localStorage.getItem("gy_chat_token") ?? "", []);
  const { messages, connected, wip, handleSend, sendCardAction, endRef } = useAgentChat({
    agentId: "lumii-goldenyears",
    sessionId: "copilot:admin",
    getToken,
    onRefetch: qualityRefetch,
  });

  const detailEntity = useDetailEntity();
  const sendWithContext = useCallback((msg: string) => {
    const label = ADMIN_NAV.find(n => n.id === activeView)?.label ?? "质量总览";
    if (detailEntity) {
      handleSend(`[ctx:${label}/${detailEntity.entityName}/${detailEntity.entityId}] ${msg}`);
    } else {
      handleSend(`[ctx:${label}] ${msg}`);
    }
  }, [activeView, detailEntity, handleSend]);

  const openCopilotWithMessage = useCallback((msg: string) => {
    setCopilotOpen(true);
    sendWithContext(msg);
  }, [sendWithContext]);

  const handleCopilotNavigate = useCallback((area: string, params: Record<string, string>) => {
    const base = GY_AREA_TO_PATH[area] ?? VIEW_TO_PATH[area as View] ?? "/admin";
    const qs = params.search ? `?search=${encodeURIComponent(params.search)}` : "";
    navigate(base + qs);
  }, [navigate]);

  const handleSelectView = useCallback((v: string) => {
    navigate(VIEW_TO_PATH[v as View] ?? "/admin");
  }, [navigate]);

  return (
    <div className="site-operations-root">
      {/* Header */}
      <header className="site-operations-header">
        <div className="quality-header__logo">
          <Shield size={16} stroke="white" />
        </div>
        <span style={{ fontWeight: 600, fontSize: 15, color: "#0F172A" }}>金色年华 · 集团管理</span>
        <div style={{ flex: 1 }} />
        <div className="site-operations-header__actions">
          <HeaderCopilotInput
            onSend={openCopilotWithMessage}
            onOpenPanel={() => setCopilotOpen(true)}
            commands={ADMIN_COMMANDS}
            panelOpen={copilotOpen}
          />
        </div>
      </header>

      {/* Body: sidebar + main + copilot */}
      <div className="site-operations-body" data-sidebar={sidebarCollapsed ? "collapsed" : "expanded"} data-copilot-open={copilotOpen}>
        {/* Sidebar */}
        <nav className="site-operations-sidebar" aria-label="集团管理导航">
          <div className="site-operations-sidebar__items">
            {ADMIN_NAV.map(item => {
              const Icon = item.icon;
              const isActive = item.id === activeView;
              return (
                <Link key={item.id} to={item.path} className="site-operations-sidebar__item" data-active={isActive} title={sidebarCollapsed ? item.label : undefined}>
                  <Icon size={20} />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
          <div className="site-operations-sidebar__footer">
            <ProfileMenu expanded={!sidebarCollapsed} roleName="集团管理" />
          </div>
          <button className="site-operations-sidebar__divider-toggle" onClick={toggleSidebar} type="button" title={sidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}>
            {sidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </button>
        </nav>

        {/* Main content */}
        <main className="site-operations-main site-operations-main--layout">
          <div className="site-operations-content">
            <QualityPage activeView={activeView} onSelectView={handleSelectView} onNavigate={handleCopilotNavigate} refetchKey={refetchKey} />
            <Outlet />
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
          commands={ADMIN_COMMANDS}
        />

        {!copilotOpen && (
          <button className="copilot-mobile-fab" onClick={() => setCopilotOpen(true)} type="button" aria-label="打开 AI 助手">
            <Bot size={24} color="#FFFCF8" />
          </button>
        )}
      </div>
    </div>
  );
}

export function QualityLayout() {
  return (
    <DetailPageProvider>
      <QualityLayoutInner />
    </DetailPageProvider>
  );
}
