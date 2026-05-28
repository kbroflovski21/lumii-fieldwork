import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { AuthGuard } from "./components/AuthGuard";
import { SiteOperationsLayout } from "./layouts/SiteOperationsLayout";
import { QualityLayout } from "./layouts/QualityLayout";
import { LoginPage } from "./auth/LoginPage";
import { CareworkerPage } from "./careworker/CareworkerPage";
import { FamilyPage } from "./family/FamilyPage";
import { HomeArea } from "./features/siteOperations/HomeArea";
import { SocialWorkersArea } from "./features/siteOperations/SocialWorkersArea";
import { SmartBadgesArea } from "./features/siteOperations/SmartBadgesArea";
import { ServiceObjectsArea } from "./features/siteOperations/ServiceObjectsArea";
import { SchedulesArea } from "./features/siteOperations/SchedulesArea";
import { RecordsArea } from "./features/siteOperations/RecordsArea";

export const PATH_TO_AREA: Record<string, string> = {
  "/": "home",
  "/workers": "social_workers",
  "/badges": "smart_badges",
  "/elders": "service_objects",
  "/schedules": "service_schedules",
  "/records": "service_records",
  "/recordings": "recordings",
};

export const GY_AREA_TO_PATH: Record<string, string> = {
  home: "/",
  social_workers: "/workers",
  smart_badges: "/badges",
  service_objects: "/elders",
  service_schedules: "/schedules",
  service_records: "/records",
  recordings: "/recordings",
  dashboard: "/admin",
  sites: "/admin/sites",
  users: "/admin/users",
  sop: "/admin/sop",
};

export function pathToArea(pathname: string): string {
  // Check exact match first
  if (PATH_TO_AREA[pathname]) return PATH_TO_AREA[pathname];
  // Check prefix match (e.g., /workers/123 -> social_workers)
  for (const [path, area] of Object.entries(PATH_TO_AREA)) {
    if (path !== "/" && pathname.startsWith(path)) return area;
  }
  return "home";
}

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/careworker/*",
    element: <CareworkerPage />,
  },
  {
    path: "/family/*",
    element: <FamilyPage />,
  },
  {
    element: <AuthGuard />,
    children: [
      {
        element: <SiteOperationsLayout />,
        children: [
          { index: true, element: <HomeArea /> },
          {
            path: "workers",
            element: <SocialWorkersArea />,
            children: [{ path: ":id", element: null }],
          },
          {
            path: "badges",
            element: <SmartBadgesArea />,
            children: [{ path: ":id", element: null }],
          },
          {
            path: "elders",
            element: <ServiceObjectsArea />,
            children: [
              { path: ":id", element: null },
            ],
          },
          {
            path: "schedules",
            element: <SchedulesArea />,
            children: [{ path: ":id", element: null }],
          },
          {
            path: "records",
            element: <RecordsArea />,
            children: [{ path: ":id", element: null }],
          },
          {
            path: "recordings",
            element: <RecordsArea />,
          },
        ],
      },
      {
        path: "admin",
        element: <QualityLayout />,
        children: [
          { index: true, element: null },
          {
            path: "sop",
            element: null,
          },
          {
            path: "sites",
            element: <Outlet />,
            children: [
              { index: true, element: null },
              { path: ":id", element: null },
            ],
          },
          {
            path: "users",
            element: <Outlet />,
            children: [
              { index: true, element: null },
              { path: ":id", element: null },
            ],
          },
          {
            path: "feishu",
            element: null,
          },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
