import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../db/prisma";
import { genId, withOperationalState } from "./helpers";

function toApi(row: any) {
  if (!row) return row;
  const base: any = {
    id: row.id, userId: row.userId, name: row.name, phone: row.phone, siteId: row.siteId,
    workerType: row.workerType, qualificationLabels: row.qualificationLabels,
    status: row.status,
    preferredBadge: row.preferredBadgeId ? { badgeId: row.preferredBadgeId, deviceCode: row.preferredBadgeDeviceCode, status: row.preferredBadgeStatus, lastSyncAt: row.preferredBadgeLastSyncAt } : undefined,
    praiseSummary: { praiseCount: row.praiseCount, latestPraiseAt: row.latestPraiseAt, latestPraiseExcerpt: row.latestPraiseExcerpt },
  };
  if (row.user) {
    base.account = {
      username: row.user.username,
      mustChangePassword: row.user.mustChangePassword,
      initialPassword: row.user.initialPassword,
    };
  }
  return base;
}

function generatePassword(): string {
  return Math.random().toString(36).slice(2, 10);
}

async function nextCwUsername(): Promise<string> {
  const lastCw = await prisma.user.findFirst({
    where: { username: { startsWith: "CW" } },
    orderBy: { username: "desc" },
  });
  if (lastCw) {
    const num = parseInt(lastCw.username.slice(2), 10);
    return `CW${(isNaN(num) ? 100000 : num) + 1}`;
  }
  return "CW100001";
}

export function socialWorkersRoutes() {
  const r = Router();

  r.get("/social-workers", async (_req, res) => {
    const rows = await prisma.socialWorker.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: { select: { username: true, mustChangePassword: true, initialPassword: true } } },
    });
    res.json(withOperationalState({ socialWorkers: rows.map(toApi) }));
  });

  r.post("/social-workers", async (req, res) => {
    const id = genId("worker");
    const b = req.body;

    // Auto-create careworker user account
    const username = await nextCwUsername();
    const password = generatePassword();
    const hash = bcrypt.hashSync(password, 10);
    const userId = `user-cw-${Date.now().toString(36)}`;

    await prisma.user.create({
      data: {
        id: userId,
        username,
        passwordHash: hash,
        name: b.name ?? "",
        role: "careworker",
        orgId: "org-001",
        siteIds: [b.siteId ?? "site-001"],
        phone: b.phone ?? "",
        mustChangePassword: true,
        initialPassword: password,
      },
    });

    await prisma.socialWorker.create({
      data: {
        id,
        userId,
        name: b.name ?? "",
        phone: b.phone ?? "",
        siteId: b.siteId ?? "site-001",
        workerType: b.workerType ?? "service_personnel",
        qualificationLabels: b.qualificationLabels ?? [],
        status: "active",
      },
    });
    const row = await prisma.socialWorker.findFirst({
      where: { id },
      include: { user: { select: { username: true, mustChangePassword: true, initialPassword: true } } },
    });
    res.status(201).json({ ...toApi(row), account: { username, initialPassword: password } });
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
    const row = await prisma.socialWorker.findFirst({
      where: { id: req.params.id },
      include: { user: { select: { username: true, mustChangePassword: true, initialPassword: true } } },
    });
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
    const row = await prisma.socialWorker.findFirst({
      where: { id: req.params.id },
      include: { user: { select: { username: true, mustChangePassword: true, initialPassword: true } } },
    });
    res.json(toApi(row));
  });

  r.post("/social-workers/:id/reset-password", async (req, res) => {
    const worker = await prisma.socialWorker.findFirst({ where: { id: req.params.id } });
    if (!worker) {
      res.status(404).json({ error: "护工不存在" });
      return;
    }
    const user = await prisma.user.findFirst({ where: { id: worker.userId } });
    if (!user) {
      res.status(404).json({ error: "该护工没有关联账号" });
      return;
    }
    const password = generatePassword();
    const hash = bcrypt.hashSync(password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hash, initialPassword: password, mustChangePassword: true },
    });
    res.json({ username: user.username, initialPassword: password });
  });

  r.post("/social-workers/:id/archive", async (req, res) => {
    await prisma.socialWorker.update({ where: { id: req.params.id }, data: { status: "disabled" } });
    res.json({ ok: true, id: req.params.id, message: "archived" });
  });

  return r;
}
