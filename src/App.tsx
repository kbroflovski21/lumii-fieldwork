import { lazy, Suspense } from "react";
import { AuthProvider, useAuth } from "./auth/AuthContext";
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

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
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
  if (path.startsWith("/careworker/hardware")) {
    return <HardwareSimulator />;
  }
  if (path.startsWith("/careworker")) {
    return <CareworkerPage />;
  }

  // Family page — public H5, no auth required
  if (path.startsWith("/family")) {
    return <FamilyPage />;
  }

  // Not logged in → show login
  if (!user) {
    return <LoginPage />;
  }

  // Logged in on root or /login → redirect by role
  if (path === "/" || path === "/login") {
    if (user.role === "org_admin") return <QualityPage />;
    return <SiteOperationsPage />;
  }

  // Quality management page (org_admin only — includes SOP management tab)
  if (path.startsWith("/quality") || path.startsWith("/supervisor") || path.startsWith("/sop-management")) {
    if (user.role !== "org_admin") {
      return <div style={{ padding: 40, textAlign: "center" }}><h2>403 无权访问</h2><p>您的角色无权访问集团管理</p><a href="/site-operations">返回站点运营</a></div>;
    }
    return <QualityPage />;
  }

  if (path.startsWith("/admin")) {
    if (user.role !== "org_admin") {
      return <div style={{ padding: 40, textAlign: "center" }}><h2>403 无权访问</h2><p>您的角色无权访问管理后台</p><a href="/site-operations">返回站点运营</a></div>;
    }
    return <QualityPage />;
  }

  // Default: site-operations (site_operator)
  return <SiteOperationsPage />;
}

export function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
