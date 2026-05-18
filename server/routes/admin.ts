import { Router } from "express";
import bcrypt from "bcryptjs";
import { getDb } from "../db/init";

function genId() {
  return `user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function adminRoutes() {
  const r = Router();

  r.get("/admin/users", (req, res) => {
    const db = getDb();
    const user = (req as any).authUser;
    if (!user || user.role !== "org_admin") {
      res.status(403).json({ error: "无权限" });
      return;
    }

    const rows = db.prepare("SELECT id, username, name, role, org_id, site_ids, phone, status, created_at FROM users WHERE org_id = ? ORDER BY created_at DESC").all(user.orgId) as any[];

    res.json({
      users: rows.map((r: any) => ({
        id: r.id,
        username: r.username,
        name: r.name,
        role: r.role,
        orgId: r.org_id,
        siteIds: JSON.parse(r.site_ids || "[]"),
        phone: r.phone,
        status: r.status,
        createdAt: r.created_at,
      })),
    });
  });

  r.post("/admin/users", (req, res) => {
    const db = getDb();
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

    if (!["org_admin", "site_operator", "service_supervisor"].includes(role)) {
      res.status(400).json({ error: "无效的角色" });
      return;
    }

    const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
    if (existing) {
      res.status(409).json({ error: "用户名已存在" });
      return;
    }

    const id = genId();
    const hash = bcrypt.hashSync(password, 10);
    db.prepare(
      `INSERT INTO users (id, username, password_hash, name, role, org_id, site_ids, phone, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, username, hash, name, role, user.orgId, JSON.stringify(siteIds ?? []), phone ?? "", user.id);

    res.status(201).json({ id, username, name, role });
  });

  r.patch("/admin/users/:id", (req, res) => {
    const db = getDb();
    const user = (req as any).authUser;
    if (!user || user.role !== "org_admin") {
      res.status(403).json({ error: "无权限" });
      return;
    }

    const { name, role, siteIds, phone, status } = req.body ?? {};
    const target = db.prepare("SELECT * FROM users WHERE id = ? AND org_id = ?").get(req.params.id, user.orgId) as any;
    if (!target) {
      res.status(404).json({ error: "用户不存在" });
      return;
    }

    const updates: string[] = [];
    const values: any[] = [];
    if (name !== undefined) { updates.push("name = ?"); values.push(name); }
    if (role !== undefined) { updates.push("role = ?"); values.push(role); }
    if (siteIds !== undefined) { updates.push("site_ids = ?"); values.push(JSON.stringify(siteIds)); }
    if (phone !== undefined) { updates.push("phone = ?"); values.push(phone); }
    if (status !== undefined) { updates.push("status = ?"); values.push(status); }
    updates.push("updated_at = datetime('now')");

    if (updates.length > 1) {
      db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(...values, req.params.id);
    }

    res.json({ ok: true });
  });

  r.post("/admin/users/:id/reset-password", (req, res) => {
    const db = getDb();
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

    const target = db.prepare("SELECT id FROM users WHERE id = ? AND org_id = ?").get(req.params.id, user.orgId);
    if (!target) {
      res.status(404).json({ error: "用户不存在" });
      return;
    }

    const hash = bcrypt.hashSync(password, 10);
    db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(hash, req.params.id);

    res.json({ ok: true });
  });

  return r;
}
