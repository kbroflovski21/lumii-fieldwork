import { Router } from "express";
import { prisma } from "../db/prisma";
import { genId, withOperationalState } from "./helpers";

function toApi(row: any) {
  if (!row) return row;
  return {
    id: row.id, deviceCode: row.deviceCode, orgId: row.orgId, siteId: row.siteId, siteName: row.siteName,
    status: row.status, batteryPercent: row.batteryPercent, activatedAt: row.activatedAt,
    lastSyncAt: row.lastSyncAt, lastRecordingAt: row.lastRecordingAt,
    preferredWorkerId: row.preferredWorkerId, preferredWorkerName: row.preferredWorkerName,
    recentServiceRecordIds: row.recentServiceRecordIds,
  };
}

export function smartBadgesRoutes() {
  const r = Router();

  r.get("/smart-badges", async (req, res) => {
    try {
      const siteId = req.query.siteId as string | undefined;
      const where = siteId ? { siteId } : {};
      const rows = await prisma.smartBadge.findMany({ where, orderBy: { createdAt: "desc" } });
      res.json(withOperationalState({ smartBadges: rows.map(toApi) }));
    } catch {
      res.json({ badges: [] });
    }
  });

  r.get("/smart-badges/:id", async (req, res) => {
    const row = await prisma.smartBadge.findFirst({ where: { id: req.params.id } });
    if (!row) return res.status(404).json({ error: "not found" });
    res.json(toApi(row));
  });

  r.post("/smart-badges/activations", async (req, res) => {
    const b = req.body;
    const deviceCode = (b.deviceCode ?? "").trim();
    if (!deviceCode) { res.status(400).json({ error: "工牌号不能为空" }); return; }

    const existing = await prisma.smartBadge.findFirst({ where: { deviceCode } });
    if (existing) { res.status(409).json({ error: `工牌号 ${deviceCode} 已存在，不能重复激活` }); return; }

    const id = genId("badge");
    const now = new Date().toISOString();
    const siteId = b.siteId ?? "site-001";
    const site = await prisma.site.findUnique({ where: { id: siteId }, select: { name: true } });
    await prisma.smartBadge.create({
      data: {
        id,
        deviceCode,
        orgId: "org-001",
        siteId,
        siteName: site?.name ?? siteId,
        status: "available",
        batteryPercent: 100,
        activatedAt: now,
        lastSyncAt: now,
        preferredWorkerId: b.preferredWorkerId ?? null,
      },
    });
    const row = await prisma.smartBadge.findFirst({ where: { id } });
    res.json({ ok: true, id, message: "activated", smartBadge: toApi(row) });
  });

  r.patch("/smart-badges/:id", async (req, res) => {
    const b = req.body;
    const data: any = {};
    if (b.status !== undefined) data.status = b.status;
    if (b.preferredWorkerId !== undefined) {
      data.preferredWorkerId = b.preferredWorkerId || null;
      if (b.preferredWorkerId) {
        const existing = await prisma.smartBadge.findFirst({
          where: { preferredWorkerId: b.preferredWorkerId, id: { not: req.params.id } },
        });
        if (existing) {
          res.status(409).json({ error: `该人员已绑定工牌 ${existing.deviceCode}，请先解绑后再操作` });
          return;
        }
        const worker = await prisma.socialWorker.findFirst({ where: { id: b.preferredWorkerId } });
        data.preferredWorkerName = worker?.name ?? null;
      } else {
        data.preferredWorkerName = null;
      }
    }
    if (Object.keys(data).length > 0) {
      await prisma.smartBadge.update({ where: { id: req.params.id }, data });
    }
    const row = await prisma.smartBadge.findFirst({ where: { id: req.params.id } });
    res.json(toApi(row));
  });

  r.get("/smart-badges/:id/service-records", async (req, res) => {
    const rows = await prisma.serviceRecord.findMany({
      where: { badgeId: req.params.id },
      orderBy: { serviceDate: "desc" },
      take: 10,
      select: { id: true, serviceDate: true, serviceObjectName: true, reviewStatus: true },
    });
    res.json(rows.map((r) => ({ serviceRecordId: r.id, serviceDate: r.serviceDate, serviceObjectName: r.serviceObjectName, reviewStatus: r.reviewStatus })));
  });

  return r;
}
