import { Router } from "express";
import { prisma } from "../db/prisma";

export function homeRoutes() {
  const r = Router();

  r.get("/site-operations/home", async (req, res) => {
    let row = null;
    try {
      const siteId = req.query.siteId as string | undefined;
      const where = siteId ? { siteId } : { id: "current" };
      row = await prisma.homeSummary.findFirst({ where });
    } catch { /* schema mismatch fallback */ }
    if (!row) {
      return res.json({
        summary: { date: new Date().toISOString().slice(0, 10), totalScheduledServices: 0, unassignedServices: 0, activeSocialWorkers: 0, onlineBadges: 0, recordsNeedReview: 0, exportableServiceRecords: 0 },
        highlights: [], activities: [], recommendedActions: [], permissionState: "full",
      });
    }

    res.json({
      summary: {
        date: row.summaryDate,
        totalScheduledServices: row.totalScheduledServices,
        unassignedServices: row.unassignedServices,
        activeSocialWorkers: row.activeSocialWorkers,
        onlineBadges: row.onlineBadges,
        recordsNeedReview: row.recordsNeedReview,
        exportableServiceRecords: row.exportableServiceRecords,
      },
      highlights: row.highlights,
      activities: row.activities,
      recommendedActions: row.recommendedActions,
      permissionState: row.permissionState,
    });
  });

  return r;
}
