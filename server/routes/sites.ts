import { Router } from "express";
import { prisma } from "../db/prisma";
import { randomUUID } from "crypto";

export function siteRoutes() {
  const r = Router();

  r.get("/admin/sites", async (req, res) => {
    const user = (req as any).authUser;
    if (!user || user.role !== "org_admin") { res.status(403).json({ error: "无权限" }); return; }

    const sites = await prisma.site.findMany({
      where: { orgId: user.orgId },
      include: { siteUsers: { include: { user: { select: { id: true, username: true, name: true, role: true } } } } },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      sites: sites.map(s => ({
        ...s,
        operators: s.siteUsers.map(su => su.user),
        siteUsers: undefined,
      })),
    });
  });

  r.post("/admin/sites", async (req, res) => {
    const user = (req as any).authUser;
    if (!user || user.role !== "org_admin") { res.status(403).json({ error: "无权限" }); return; }

    const { name, address, contactName, contactPhone } = req.body ?? {};
    if (!name) { res.status(400).json({ error: "站点名称为必填" }); return; }

    const id = `site-${randomUUID().slice(0, 8)}`;
    const site = await prisma.site.create({
      data: { id, name, address: address ?? "", contactName: contactName ?? "", contactPhone: contactPhone ?? "", orgId: user.orgId },
    });
    res.status(201).json(site);
  });

  r.patch("/admin/sites/:id", async (req, res) => {
    const user = (req as any).authUser;
    if (!user || user.role !== "org_admin") { res.status(403).json({ error: "无权限" }); return; }

    const existing = await prisma.site.findFirst({ where: { id: req.params.id, orgId: user.orgId } });
    if (!existing) { res.status(404).json({ error: "站点不存在" }); return; }

    const { name, address, contactName, contactPhone, status } = req.body ?? {};
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (address !== undefined) data.address = address;
    if (contactName !== undefined) data.contactName = contactName;
    if (contactPhone !== undefined) data.contactPhone = contactPhone;
    if (status !== undefined) data.status = status;

    await prisma.site.update({ where: { id: req.params.id }, data });
    res.json({ ok: true });
  });

  r.delete("/admin/sites/:id", async (req, res) => {
    const user = (req as any).authUser;
    if (!user || user.role !== "org_admin") { res.status(403).json({ error: "无权限" }); return; }

    const existing = await prisma.site.findFirst({ where: { id: req.params.id, orgId: user.orgId } });
    if (!existing) { res.status(404).json({ error: "站点不存在" }); return; }

    await prisma.site.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  });

  // Assign/remove operators to/from a site
  r.put("/admin/sites/:id/operators", async (req, res) => {
    const user = (req as any).authUser;
    if (!user || user.role !== "org_admin") { res.status(403).json({ error: "无权限" }); return; }

    const { userIds } = req.body ?? {};
    if (!Array.isArray(userIds)) { res.status(400).json({ error: "userIds 必须是数组" }); return; }

    const siteId = req.params.id;
    const existing = await prisma.site.findFirst({ where: { id: siteId, orgId: user.orgId } });
    if (!existing) { res.status(404).json({ error: "站点不存在" }); return; }

    // Replace all assignments for this site
    await prisma.$transaction([
      prisma.siteUser.deleteMany({ where: { siteId } }),
      ...userIds.map((userId: string) =>
        prisma.siteUser.create({ data: { siteId, userId } })
      ),
    ]);

    res.json({ ok: true });
  });

  // Get sites for current user (for site_operator site selector)
  r.get("/auth/my-sites", async (req, res) => {
    const user = (req as any).authUser;
    if (!user) { res.status(401).json({ error: "未登录" }); return; }

    if (user.role === "org_admin") {
      const sites = await prisma.site.findMany({ where: { orgId: user.orgId, status: "active" }, orderBy: { name: "asc" } });
      res.json({ sites });
      return;
    }

    const assignments = await prisma.siteUser.findMany({
      where: { userId: user.id },
      include: { site: true },
    });
    res.json({ sites: assignments.map(a => a.site).filter(s => s.status === "active") });
  });

  return r;
}
