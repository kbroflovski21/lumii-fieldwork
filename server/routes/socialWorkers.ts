import { Router } from "express";
import { prisma } from "../db/prisma";
import { genId, withOperationalState } from "./helpers";

function toApi(row: any) {
  if (!row) return row;
  return {
    id: row.id, userId: row.userId, name: row.name, phone: row.phone, siteId: row.siteId,
    workerType: row.workerType, qualificationLabels: row.qualificationLabels,
    status: row.status,
    preferredBadge: row.preferredBadgeId ? { badgeId: row.preferredBadgeId, deviceCode: row.preferredBadgeDeviceCode, status: row.preferredBadgeStatus, lastSyncAt: row.preferredBadgeLastSyncAt } : undefined,
    praiseSummary: { praiseCount: row.praiseCount, latestPraiseAt: row.latestPraiseAt, latestPraiseExcerpt: row.latestPraiseExcerpt },
  };
}

export function socialWorkersRoutes() {
  const r = Router();

  r.get("/social-workers", async (_req, res) => {
    const rows = await prisma.socialWorker.findMany({ orderBy: { createdAt: "desc" } });
    res.json(withOperationalState({ socialWorkers: rows.map(toApi) }));
  });

  r.post("/social-workers", async (req, res) => {
    const id = genId("worker");
    const b = req.body;
    await prisma.socialWorker.create({
      data: {
        id,
        userId: `user-${id}`,
        name: b.name ?? "",
        phone: b.phone ?? "",
        siteId: "site-001",
        workerType: b.workerType ?? "service_personnel",
        qualificationLabels: b.qualificationLabels ?? [],
        status: "active",
      },
    });
    const row = await prisma.socialWorker.findFirst({ where: { id } });
    res.json(toApi(row));
  });

  r.patch("/social-workers/:id", async (req, res) => {
    const b = req.body;
    const data: any = {};
    if (b.name !== undefined) data.name = b.name;
    if (b.phone !== undefined) data.phone = b.phone;
    if (b.qualificationLabels !== undefined) data.qualificationLabels = b.qualificationLabels;
    if (b.status !== undefined) data.status = b.status;
    if (Object.keys(data).length > 0) {
      await prisma.socialWorker.update({ where: { id: req.params.id }, data });
    }
    const row = await prisma.socialWorker.findFirst({ where: { id: req.params.id } });
    res.json(toApi(row));
  });

  r.put("/social-workers/:id/badge-binding", async (req, res) => {
    const b = req.body;
    const badgeId = b.preferredBadgeId ?? b.badgeId ?? null;
    if (badgeId) {
      const badge = await prisma.smartBadge.findFirst({ where: { id: badgeId }, select: { deviceCode: true, status: true, lastSyncAt: true } });
      await prisma.socialWorker.update({
        where: { id: req.params.id },
        data: {
          preferredBadgeId: badgeId,
          preferredBadgeDeviceCode: badge?.deviceCode ?? null,
          preferredBadgeStatus: badge?.status ?? null,
          preferredBadgeLastSyncAt: badge?.lastSyncAt ?? null,
        },
      });
    } else {
      await prisma.socialWorker.update({
        where: { id: req.params.id },
        data: {
          preferredBadgeId: null,
          preferredBadgeDeviceCode: null,
          preferredBadgeStatus: null,
          preferredBadgeLastSyncAt: null,
        },
      });
    }
    const row = await prisma.socialWorker.findFirst({ where: { id: req.params.id } });
    res.json(toApi(row));
  });

  r.post("/social-workers/:id/archive", async (req, res) => {
    await prisma.socialWorker.update({ where: { id: req.params.id }, data: { status: "disabled" } });
    res.json({ ok: true, id: req.params.id, message: "archived" });
  });

  return r;
}
