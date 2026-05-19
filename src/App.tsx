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
  const { needsSelection, sites, selectSite, loading: siteLoading } = useSite();

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

  // Site selector for operators with multiple sites
  if (needsSelection) {
    return <SiteSelectorModal sites={sites} onSelect={selectSite} />;
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
