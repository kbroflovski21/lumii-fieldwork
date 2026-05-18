import { useState } from "react";
import type { WorkAreaId } from "./contracts";
import { HomeArea } from "./HomeArea";
import { RecordsArea } from "./RecordsArea";
import { SchedulesArea } from "./SchedulesArea";
import { ServiceObjectsArea } from "./ServiceObjectsArea";
import { SiteOperationsShell } from "./SiteOperationsShell";
import { SmartBadgesArea } from "./SmartBadgesArea";
import { SocialWorkersArea } from "./SocialWorkersArea";
import { useSiteOperationsData } from "./useSiteOperationsData";
import "./siteOperations.css";
import "../../shared/shell-profile.css";

export function SiteOperationsPage() {
  const [activeArea, setActiveArea] = useState<WorkAreaId>("home");
  const data = useSiteOperationsData(activeArea);

  return (
    <SiteOperationsShell activeArea={activeArea} onSelectArea={setActiveArea}>
      {activeArea === "home" ? <HomeArea onRoute={(area) => setActiveArea(area as WorkAreaId)} resource={data.home} /> : null}
      {activeArea === "social_workers" ? <SocialWorkersArea resource={data.socialWorkers} onMutate={data.refetch} /> : null}
      {activeArea === "smart_badges" ? <SmartBadgesArea onOpenRecords={() => setActiveArea("service_records")} resource={data.smartBadges} onMutate={data.refetch} /> : null}
      {activeArea === "service_objects" ? <ServiceObjectsArea resource={data.serviceObjects} onMutate={data.refetch} /> : null}
      {activeArea === "service_schedules" ? <SchedulesArea resource={data.serviceSchedules} onMutate={data.refetch} /> : null}
      {activeArea === "service_records" ? <RecordsArea resource={data.serviceRecords} onMutate={data.refetch} /> : null}
    </SiteOperationsShell>
  );
}
