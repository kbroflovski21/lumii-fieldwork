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

  // site_operator accessing /admin -> redirect home
  if (user.role !== "org_admin" && location.pathname.startsWith("/admin")) {
    return <Navigate to="/" replace />;
  }

  // org_admin accessing / (not /admin) -> redirect to /admin
  if (
    user.role === "org_admin" &&
    !location.pathname.startsWith("/admin") &&
    location.pathname !== "/login"
  ) {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
}
