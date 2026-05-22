import { Router } from "express";
import { prisma } from "../db/prisma";

export function feishuUsersRoutes() {
  const r = Router();

  // Admin: list all feishu users
  r.get("/admin/feishu-users", async (req, res) => {
    const user = (req as any).authUser;
    if (!user || user.role !== "org_admin") {
      res.status(403).json({ error: "无权限" });
      return;
    }
    const name = req.query.name as string | undefined;
    const where: any = {};
    if (name) where.name = { contains: name };
    const rows = await prisma.feishuUser.findMany({ where, orderBy: { createdAt: "desc" } });
    res.json({ feishuUsers: rows });
  });

  // Admin: update role + siteIds
  r.patch("/admin/feishu-users/:id", async (req, res) => {
    const user = (req as any).authUser;
    if (!user || user.role !== "org_admin") {
      res.status(403).json({ error: "无权限" });
      return;
    }
    const { role, siteIds, name } = req.body;
    const data: any = {};
    if (role !== undefined) data.role = role;
    if (siteIds !== undefined) data.siteIds = siteIds;
    if (name !== undefined) data.name = name;
    if (Object.keys(data).length > 0) {
      await prisma.feishuUser.update({ where: { id: req.params.id }, data });
    }
    const row = await prisma.feishuUser.findFirst({ where: { id: req.params.id } });
    res.json(row);
  });

  // Admin: delete
  r.delete("/admin/feishu-users/:id", async (req, res) => {
    const user = (req as any).authUser;
    if (!user || user.role !== "org_admin") {
      res.status(403).json({ error: "无权限" });
      return;
    }
    await prisma.feishuUser.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  });

  // Agent: lookup by openId
  r.get("/feishu-users", async (req, res) => {
    const openId = req.query.openId as string | undefined;
    if (!openId) {
      res.status(400).json({ error: "openId required" });
      return;
    }
    const row = await prisma.feishuUser.findFirst({ where: { openId } });
    res.json({ feishuUser: row });
  });

  // Agent: auto-register
  r.post("/feishu-users", async (req, res) => {
    const { openId, name } = req.body;
    if (!openId) {
      res.status(400).json({ error: "openId required" });
      return;
    }
    const existing = await prisma.feishuUser.findFirst({ where: { openId } });
    if (existing) {
      res.json(existing);
      return;
    }
    const row = await prisma.feishuUser.create({
      data: { openId, name: name ?? openId, role: "unset", siteIds: [] },
    });
    res.status(201).json(row);
  });

  return r;
}
