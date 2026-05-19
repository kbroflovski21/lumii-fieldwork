import { Router } from "express";
import { prisma } from "../db/prisma";

export function homeRoutes() {
  const r = Router();

  r.get("/site-operations/home", async (_req, res) => {
    const row = await prisma.homeSummary.findFirst({ where: { id: "current" } });
    if (!row) return res.status(404).json({ error: "no home summary" });

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
