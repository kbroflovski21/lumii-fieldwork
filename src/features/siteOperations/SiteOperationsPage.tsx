import { useState, useCallback } from "react";
import type { WorkAreaId } from "./contracts";
import { HomeArea } from "./HomeArea";
import { RecordsArea } from "./RecordsArea";
import { SchedulesArea } from "./SchedulesArea";
import { ServiceObjectsArea } from "./ServiceObjectsArea";
import { SiteOperationsShell } from "./SiteOperationsShell";
import { SmartBadgesArea } from "./SmartBadgesArea";
import { SocialWorkersArea } from "./SocialWorkersArea";
import { useSiteOperationsData } from "./useSiteOperationsData";
import { useSite } from "../../auth/SiteContext";
import "./siteOperations.css";
import "../../shared/shell-profile.css";

export function SiteOperationsPage() {
  const [activeArea, setActiveArea] = useState<WorkAreaId>("home");
  const [searchFilter, setSearchFilter] = useState("");
  const { currentSite } = useSite();
  const data = useSiteOperationsData(activeArea, currentSite?.id);

  const handleCopilotNavigate = useCallback((area: string, search?: string) => {
    setSearchFilter(search ?? "");
  }, []);

  const handleSelectArea = useCallback((area: WorkAreaId) => {
    setActiveArea(area);
    setSearchFilter("");
  }, []);

  return (
    <SiteOperationsShell activeArea={activeArea} onSelectArea={handleSelectArea} onCopilotNavigate={handleCopilotNavigate}>
      {activeArea === "home" ? <HomeArea onRoute={(area) => handleSelectArea(area as WorkAreaId)} resource={data.home} /> : null}
      {activeArea === "social_workers" ? <SocialWorkersArea resource={data.socialWorkers} onMutate={data.refetch} initialSearch={searchFilter} /> : null}
      {activeArea === "smart_badges" ? <SmartBadgesArea onOpenRecords={() => handleSelectArea("service_records")} resource={data.smartBadges} onMutate={data.refetch} initialSearch={searchFilter} /> : null}
      {activeArea === "service_objects" ? <ServiceObjectsArea resource={data.serviceObjects} onMutate={data.refetch} initialSearch={searchFilter} /> : null}
      {activeArea === "service_schedules" ? <SchedulesArea resource={data.serviceSchedules} onMutate={data.refetch} /> : null}
      {activeArea === "service_records" ? <RecordsArea resource={data.serviceRecords} onMutate={data.refetch} /> : null}
    </SiteOperationsShell>
  );
}
