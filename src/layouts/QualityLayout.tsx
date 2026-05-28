import { useLocation, useNavigate } from "react-router-dom";
import { useCallback } from "react";
import { QualityPage } from "../quality/QualityPage";
import { GY_AREA_TO_PATH } from "../router";

type View = "dashboard" | "sop" | "sites" | "users" | "feishu";

function pathToView(pathname: string): View {
  if (pathname.startsWith("/admin/sop")) return "sop";
  if (pathname.startsWith("/admin/sites")) return "sites";
  if (pathname.startsWith("/admin/users")) return "users";
  if (pathname.startsWith("/admin/feishu")) return "feishu";
  return "dashboard";
}

const VIEW_TO_PATH: Record<View, string> = {
  dashboard: "/admin",
  sop: "/admin/sop",
  sites: "/admin/sites",
  users: "/admin/users",
  feishu: "/admin/feishu",
};

export function QualityLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeView = pathToView(location.pathname);

  const handleSelectView = useCallback((v: string) => {
    const path = VIEW_TO_PATH[v as View] ?? "/admin";
    navigate(path);
  }, [navigate]);

  const handleNavigate = useCallback((area: string, params: Record<string, string>) => {
    const base = GY_AREA_TO_PATH[area] ?? VIEW_TO_PATH[area as View] ?? "/admin";
    const qs = params.search ? `?search=${encodeURIComponent(params.search)}` : "";
    navigate(base + qs);
  }, [navigate]);

  return <QualityPage activeView={activeView} onSelectView={handleSelectView} onNavigate={handleNavigate} />;
}
