import { useCallback, useEffect, useState } from "react";
import { siteOperationsApi } from "./api";
import type {
  ServiceObjectsResponse,
  ServiceRecordsResponse,
  ServiceSchedulesResponse,
  SiteOperationsHomeResponse,
  SmartBadgesResponse,
  SocialWorkersResponse,
  WorkAreaId
} from "./contracts";

export type SocialWorkersBundle = SocialWorkersResponse;

export type Resource<T> =
  | { status: "idle" | "loading"; data?: undefined; error?: undefined }
  | { status: "success"; data: T; error?: undefined }
  | { status: "error"; data?: undefined; error: string };

const idle = { status: "idle" } as const;
const loading = { status: "loading" } as const;

export function useSiteOperationsData(activeArea: WorkAreaId, siteId?: string) {
  const [home, setHome] = useState<Resource<SiteOperationsHomeResponse>>(idle);
  const [socialWorkers, setSocialWorkers] = useState<Resource<SocialWorkersBundle>>(idle);
  const [smartBadges, setSmartBadges] = useState<Resource<SmartBadgesResponse>>(idle);
  const [serviceSchedules, setServiceSchedules] = useState<Resource<ServiceSchedulesResponse>>(idle);
  const [serviceRecords, setServiceRecords] = useState<Resource<ServiceRecordsResponse>>(idle);
  const [serviceObjects, setServiceObjects] = useState<Resource<ServiceObjectsResponse>>(idle);
  const [refetchKey, setRefetchKey] = useState(0);

  const refetch = useCallback(() => {
    setRefetchKey(k => k + 1);
    // Reset the active area's resource to trigger refetch
    if (activeArea === "social_workers") setSocialWorkers(idle);
    else if (activeArea === "smart_badges") setSmartBadges(idle);
    else if (activeArea === "service_objects") setServiceObjects(idle);
    else if (activeArea === "service_schedules") setServiceSchedules(idle);
    else if (activeArea === "service_records") setServiceRecords(idle);
    else if (activeArea === "home") setHome(idle);
  }, [activeArea]);

  useEffect(() => {
    if (home.status !== "idle") return;
    let cancelled = false;
    setHome(loading);
    siteOperationsApi
      .getHome(siteId)
      .then((data) => { if (!cancelled) setHome({ status: "success", data }); })
      .catch((error: unknown) => { if (!cancelled) setHome({ status: "error", error: error instanceof Error ? error.message : "首页数据加载失败" }); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refetchKey]);

  useEffect(() => {
    if (activeArea === "social_workers" && socialWorkers.status === "idle") {
      setSocialWorkers(loading);
      siteOperationsApi
        .getSocialWorkers(siteId)
        .then((data) => setSocialWorkers({ status: "success", data }))
        .catch((error: unknown) => setSocialWorkers({ status: "error", error: error instanceof Error ? error.message : "服务人员数据加载失败" }));
    }

    if (activeArea === "smart_badges" && smartBadges.status === "idle") {
      setSmartBadges(loading);
      siteOperationsApi
        .getSmartBadges(siteId)
        .then((data) => setSmartBadges({ status: "success", data }))
        .catch((error: unknown) => setSmartBadges({ status: "error", error: error instanceof Error ? error.message : "设备数据加载失败" }));
    }

    if (activeArea === "service_schedules" && serviceSchedules.status === "idle") {
      setServiceSchedules(loading);
      siteOperationsApi
        .getServiceScheduleOccurrences(siteId)
        .then((data) => setServiceSchedules({ status: "success", data }))
        .catch((error: unknown) => setServiceSchedules({ status: "error", error: error instanceof Error ? error.message : "排期数据加载失败" }));
    }

    if (activeArea === "service_records" && serviceRecords.status === "idle") {
      setServiceRecords(loading);
      siteOperationsApi
        .getServiceRecords(siteId)
        .then((data) => setServiceRecords({ status: "success", data }))
        .catch((error: unknown) => setServiceRecords({ status: "error", error: error instanceof Error ? error.message : "记录数据加载失败" }));
    }

    if (activeArea === "service_objects" && serviceObjects.status === "idle") {
      setServiceObjects(loading);
      siteOperationsApi
        .getServiceObjects(siteId)
        .then((data) => setServiceObjects({ status: "success", data }))
        .catch((error: unknown) => setServiceObjects({ status: "error", error: error instanceof Error ? error.message : "对象数据加载失败" }));
    }
  }, [
    activeArea,
    serviceObjects.status,
    serviceRecords.status,
    serviceSchedules.status,
    smartBadges.status,
    socialWorkers.status,
    refetchKey
  ]);

  return {
    home,
    serviceObjects,
    serviceRecords,
    serviceSchedules,
    smartBadges,
    socialWorkers,
    refetch
  };
}
