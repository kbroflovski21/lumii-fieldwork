import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../db/prisma";

function genId() {
  return `user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function adminRoutes() {
  const r = Router();

  r.get("/admin/users", async (req, res) => {
    const user = (req as any).authUser;
    if (!user || user.role !== "org_admin") {
      res.status(403).json({ error: "无权限" });
      return;
    }

    const rows = await prisma.user.findMany({
      where: { orgId: user.orgId },
      orderBy: { createdAt: "desc" },
      select: { id: true, username: true, name: true, role: true, orgId: true, siteIds: true, phone: true, status: true, createdAt: true },
    });

    res.json({
      users: rows.map((r) => ({
        id: r.id,
        username: r.username,
        name: r.name,
        role: r.role,
        orgId: r.orgId,
        siteIds: r.siteIds as string[],
        phone: r.phone,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  });

  r.post("/admin/users", async (req, res) => {
    const user = (req as any).authUser;
    if (!user || user.role !== "org_admin") {
      res.status(403).json({ error: "无权限" });
      return;
    }

    const { username, password, name, role, siteIds, phone } = req.body ?? {};
    if (!username || !password || !name || !role) {
      res.status(400).json({ error: "用户名、密码、姓名和角色为必填" });
      return;
    }

    if (!["org_admin", "site_operator", "service_supervisor", "careworker"].includes(role)) {
      res.status(400).json({ error: "无效的角色" });
      return;
    }

    const existing = await prisma.user.findFirst({ where: { username } });
    if (existing) {
      res.status(409).json({ error: "用户名已存在" });
      return;
    }

    const id = genId();
    const hash = bcrypt.hashSync(password, 10);
    await prisma.user.create({
      data: {
        id,
        username,
        passwordHash: hash,
        name,
        role: role as any,
        orgId: user.orgId,
        siteIds: siteIds ?? [],
        phone: phone ?? "",
        createdBy: user.id,
      },
    });

    res.status(201).json({ id, username, name, role });
  });

  r.patch("/admin/users/:id", async (req, res) => {
    const user = (req as any).authUser;
    if (!user || user.role !== "org_admin") {
      res.status(403).json({ error: "无权限" });
      return;
    }

    const { name, role, siteIds, phone, status } = req.body ?? {};
    const target = await prisma.user.findFirst({ where: { id: req.params.id, orgId: user.orgId } });
    if (!target) {
      res.status(404).json({ error: "用户不存在" });
      return;
    }

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (role !== undefined) data.role = role;
    if (siteIds !== undefined) data.siteIds = siteIds;
    if (phone !== undefined) data.phone = phone;
    if (status !== undefined) data.status = status;

    if (Object.keys(data).length > 0) {
      await prisma.user.update({ where: { id: req.params.id }, data });
    }

    res.json({ ok: true });
  });

  r.post("/admin/users/:id/reset-password", async (req, res) => {
    const user = (req as any).authUser;
    if (!user || user.role !== "org_admin") {
      res.status(403).json({ error: "无权限" });
      return;
    }

    const { password } = req.body ?? {};
    if (!password || password.length < 6) {
      res.status(400).json({ error: "密码至少6位" });
      return;
    }

    const target = await prisma.user.findFirst({ where: { id: req.params.id, orgId: user.orgId } });
    if (!target) {
      res.status(404).json({ error: "用户不存在" });
      return;
    }

    const hash = bcrypt.hashSync(password, 10);
    await prisma.user.update({ where: { id: req.params.id }, data: { passwordHash: hash } });

    res.json({ ok: true });
  });

  r.delete("/admin/users/:id", async (req, res) => {
    const user = (req as any).authUser;
    if (!user || user.role !== "org_admin") {
      res.status(403).json({ error: "无权限" });
      return;
    }

    const target = await prisma.user.findFirst({
      where: { id: req.params.id, orgId: user.orgId },
      select: { id: true, username: true },
    });
    if (!target) {
      res.status(404).json({ error: "用户不存在" });
      return;
    }

    if (target.username === user.username) {
      res.status(400).json({ error: "不能删除自己的账号" });
      return;
    }

    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  });

  return r;
}
