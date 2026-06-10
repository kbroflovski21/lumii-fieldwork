import { Link, Outlet, useLocation } from "react-router-dom";
import { BarChart3, Search, Shield, Building2 } from "lucide-react";
import { ProfileMenu } from "../shared/ProfileMenu";
import "../gov/gov.css";
import "../shared/shell-profile.css";

const GOV_NAV = [
  { id: "overview", path: "/gov", icon: BarChart3, label: "审计总揽" },
  { id: "institutions", path: "/gov/institutions", icon: Building2, label: "机构与站点" },
  { id: "audit", path: "/gov/audit", icon: Search, label: "服务审计" },
];

function pathToNavId(pathname: string): string {
  if (pathname.startsWith("/gov/audit")) return "audit";
  if (pathname.startsWith("/gov/institutions")) return "institutions";
  return "overview";
}

export function GovAuditLayout() {
  const location = useLocation();
  const activeNav = pathToNavId(location.pathname);

  return (
    <div className="gov-layout">
      {/* Header */}
      <header className="gov-header">
        <div className="gov-header__logo">
          <Shield size={16} stroke="white" />
        </div>
        <span className="gov-header__title">服务审计入口</span>
        <div className="gov-header__spacer" />
      </header>

      {/* Body: sidebar + main */}
      <div className="gov-body">
        {/* Sidebar */}
        <nav className="gov-sidebar" aria-label="审计导航">
          <div className="gov-sidebar__items">
            {GOV_NAV.map(item => {
              const Icon = item.icon;
              const isActive = item.id === activeNav;
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className="gov-sidebar__item"
                  data-active={isActive}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
          <div className="gov-sidebar__footer">
            <ProfileMenu expanded roleName="审计员" />
          </div>
        </nav>

        {/* Main content */}
        <main className="gov-main">
          <div className="gov-content">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
