import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function AuthGuard() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: "#667386" }}>
        加载中...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // site_operator accessing /admin or /gov -> redirect home
  if (user.role === "site_operator" && (location.pathname.startsWith("/admin") || location.pathname.startsWith("/gov"))) {
    return <Navigate to="/" replace />;
  }

  // gov_auditor can only access /gov
  if (user.role === "gov_auditor" && !location.pathname.startsWith("/gov")) {
    return <Navigate to="/gov" replace />;
  }

  // org_admin default to /admin, but can also access /
  if (user.role === "org_admin" && location.pathname === "/") {
    return <Navigate to="/admin" replace />;
  }

  // non-admin/non-gov users accessing /admin -> redirect home
  if (user.role !== "org_admin" && user.role !== "gov_auditor" && location.pathname.startsWith("/admin")) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
