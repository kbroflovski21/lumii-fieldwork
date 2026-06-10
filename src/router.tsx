import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { AuthGuard } from "./components/AuthGuard";
import { SiteOperationsLayout } from "./layouts/SiteOperationsLayout";
import { QualityLayout } from "./layouts/QualityLayout";
import { GovAuditLayout } from "./layouts/GovAuditLayout";
import { LoginPage } from "./auth/LoginPage";
import { CareworkerPage } from "./careworker/CareworkerPage";
import { FamilyPage } from "./family/FamilyPage";
import { HomeArea } from "./features/siteOperations/HomeArea";
import { SocialWorkersArea } from "./features/siteOperations/SocialWorkersArea";
import { SmartBadgesArea } from "./features/siteOperations/SmartBadgesArea";
import { ServiceObjectsArea } from "./features/siteOperations/ServiceObjectsArea";
import { SchedulesArea } from "./features/siteOperations/SchedulesArea";
import { RecordsArea } from "./features/siteOperations/RecordsArea";
import { LiveServicesArea } from "./features/siteOperations/LiveServicesArea";
import { CompletedServicesArea } from "./features/siteOperations/CompletedServicesArea";
import { FollowUpsArea } from "./features/siteOperations/FollowUpsArea";
import { FamilyFeedbackArea } from "./features/siteOperations/FamilyFeedbackArea";
import { TrainingArea } from "./features/siteOperations/TrainingArea";
import { GovOverviewPage } from "./gov/GovOverviewPage";
import { GovAuditPage } from "./gov/GovAuditPage";
import { GovInstitutionsPage } from "./gov/GovInstitutionsPage";

export const PATH_TO_AREA: Record<string, string> = {
  "/": "home",
  "/workers": "social_workers",
  "/devices": "smart_badges",
  "/elders": "service_objects",
  "/schedules": "service_schedules",
  "/live": "live_services",
  "/completed": "completed_services",
  "/followups": "follow_ups",
  "/feedback": "family_feedback",
  "/training": "training",
};

export const GY_AREA_TO_PATH: Record<string, string> = {
  home: "/",
  social_workers: "/workers",
  smart_badges: "/devices",
  service_objects: "/elders",
  service_schedules: "/schedules",
  live_services: "/live",
  completed_services: "/completed",
  follow_ups: "/followups",
  family_feedback: "/feedback",
  dashboard: "/admin",
  catalog: "/admin/catalog",
  admin_live: "/admin/live",
  admin_completed: "/admin/completed",
  sites: "/admin/sites",
  users: "/admin/users",
  sop: "/admin/sop",
  training: "/training",
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
            path: "devices",
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
            path: "live",
            element: <LiveServicesArea />,
          },
          {
            path: "completed",
            element: <CompletedServicesArea />,
          },
          {
            path: "followups",
            element: <FollowUpsArea />,
          },
          {
            path: "feedback",
            element: <FamilyFeedbackArea />,
          },
          {
            path: "training",
            element: <TrainingArea />,
          },
        ],
      },
      {
        path: "admin",
        element: <QualityLayout />,
        children: [
          { index: true, element: null },
          {
            path: "catalog",
            element: null,
          },
          {
            path: "live",
            element: null,
          },
          {
            path: "completed",
            element: null,
          },
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
      {
        path: "gov",
        element: <GovAuditLayout />,
        children: [
          { index: true, element: <GovOverviewPage /> },
          { path: "institutions", element: <GovInstitutionsPage /> },
          { path: "audit", element: <GovAuditPage /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
