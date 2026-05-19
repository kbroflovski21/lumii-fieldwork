import { lazy, Suspense } from "react";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { SiteProvider, useSite, type SiteInfo } from "./auth/SiteContext";
import { LoginPage } from "./auth/LoginPage";
import { QualityPage } from "./quality/QualityPage";
import { FamilyPage } from "./family/FamilyPage";
import { CareworkerPage } from "./careworker/CareworkerPage";
import { HardwareSimulator } from "./careworker/HardwareSimulator";
import { SiteOperationsPage } from "./components/SiteOperations/SiteOperationsPage";

const SiteOperationsRedpeiMock = lazy(() =>
  import("./mock/site-operations-redpei/SiteOperationsRedpeiMock").then((module) => ({
    default: module.SiteOperationsRedpeiMock
  }))
);

function SiteSelectorModal({ sites, onSelect }: { sites: SiteInfo[]; onSelect: (s: SiteInfo) => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "32px 28px", width: 400, maxWidth: "90vw", boxShadow: "0 16px 48px rgba(0,0,0,0.2)" }}>
        <h2 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700 }}>选择站点</h2>
        <p style={{ margin: "0 0 20px", fontSize: 14, color: "#64748B" }}>您有多个站点的运营权限，请选择要进入的站点</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {sites.map(s => (
            <button
              key={s.id}
              onClick={() => onSelect(s)}
              type="button"
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", border: "1px solid #E2E8F0", borderRadius: 10, background: "#FAFBFC", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}
              onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = "#0052CC"; (e.currentTarget as HTMLElement).style.background = "#EFF6FF"; }}
              onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = "#E2E8F0"; (e.currentTarget as HTMLElement).style.background = "#FAFBFC"; }}
            >
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

function AppRoutes() {
  const { user, loading } = useAuth();
  const { needsSelection, noSiteAssigned, sites, selectSite, loading: siteLoading } = useSite();

  if (loading || siteLoading) {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: "#667386" }}>加载中...</div>;
  }

  const path = window.location.pathname.replace(/\/$/, "") || "/";

  // Mock route — no auth required
  if (path === "/site-operations-redpei-mock") {
    return (
      <Suspense fallback={<main>Mock UI loading</main>}>
        <SiteOperationsRedpeiMock />
      </Suspense>
    );
  }

  // Careworker pages — own demo login, no auth required
  if (path.startsWith("/careworker/hardware")) return <HardwareSimulator />;
  if (path.startsWith("/careworker")) return <CareworkerPage />;
  if (path.startsWith("/family")) return <FamilyPage />;

  if (!user) return <LoginPage />;

  // No site assigned — show error
  if (noSiteAssigned) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#F7F9FB" }}>
        <div style={{ textAlign: "center", maxWidth: 400, padding: 40 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: "#FEE2E2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#B42318" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700, color: "#0F172A" }}>暂无站点权限</h2>
          <p style={{ margin: "0 0 24px", fontSize: 14, color: "#64748B", lineHeight: 1.6 }}>您的账号尚未分配到任何站点。请联系集团管理员将您的账号分配到对应的运营站点。</p>
          <button onClick={() => { localStorage.removeItem("gy_auth_token"); localStorage.removeItem("gy_current_site"); window.location.href = "/"; }} style={{ padding: "10px 24px", background: "#0052CC", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>退出登录</button>
        </div>
      </div>
    );
  }

  // Site selector for operators with multiple sites
  if (needsSelection) {
    return <SiteSelectorModal sites={sites} onSelect={selectSite} />;
  }

  // Admin entering site-operations with ?siteId= parameter
  if (path.startsWith("/site-operations") && user.role === "org_admin") {
    const urlSiteId = new URLSearchParams(window.location.search).get("siteId");
    if (urlSiteId) {
      const site = sites.find(s => s.id === urlSiteId);
      if (site) selectSite(site);
    }
  }

  if (path === "/" || path === "/login") {
    if (user.role === "org_admin") return <QualityPage />;
    return <SiteOperationsPage />;
  }

  if (path.startsWith("/quality") || path.startsWith("/supervisor") || path.startsWith("/sop-management") || path.startsWith("/admin")) {
    if (user.role !== "org_admin") {
      return <div style={{ padding: 40, textAlign: "center" }}><h2>403 无权访问</h2><p>您的角色无权访问集团管理</p><a href="/site-operations">返回站点运营</a></div>;
    }
    return <QualityPage />;
  }

  return <SiteOperationsPage />;
}

export function App() {
  return (
    <AuthProvider>
      <SiteProvider>
        <AppRoutes />
      </SiteProvider>
    </AuthProvider>
  );
}

export default App;
