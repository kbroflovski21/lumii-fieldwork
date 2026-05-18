import { Router } from "express";
import { getDb } from "../db/init";
import { jsonParse } from "./helpers";

export function homeRoutes() {
  const r = Router();

  r.get("/site-operations/home", (_req, res) => {
    const db = getDb();
    const row = db.prepare("SELECT * FROM home_summary WHERE id = 'current'").get() as any;
    if (!row) return res.status(404).json({ error: "no home summary" });

    res.json({
      summary: {
        date: row.summary_date,
        totalScheduledServices: row.total_scheduled_services,
        unassignedServices: row.unassigned_services,
        activeSocialWorkers: row.active_social_workers,
        onlineBadges: row.online_badges,
        recordsNeedReview: row.records_need_review,
        exportableServiceRecords: row.exportable_service_records,
      },
      highlights: jsonParse(row.highlights, []),
      activities: jsonParse(row.activities, []),
      recommendedActions: jsonParse(row.recommended_actions, []),
      permissionState: row.permission_state,
    });
  });

  return r;
}
