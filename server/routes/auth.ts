import { Router } from "express";
import bcrypt from "bcryptjs";
import { getDb } from "../db/init";
import { signJwt, verifyJwt } from "../ws/auth";

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: string;
  orgId: string;
  siteIds: string[];
  phone: string;
  status: string;
}

export function authRoutes(jwtSecret: string) {
  const r = Router();

  r.post("/auth/login", (req, res) => {
    const { username, password } = req.body ?? {};
    if (!username || !password) {
      res.status(400).json({ error: "用户名和密码不能为空" });
      return;
    }

    const db = getDb();
    const row = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as any;
    if (!row) {
      res.status(401).json({ error: "用户名或密码错误" });
      return;
    }

    if (row.status === "disabled") {
      res.status(403).json({ error: "账号已被禁用" });
      return;
    }

    if (!bcrypt.compareSync(password, row.password_hash)) {
      res.status(401).json({ error: "用户名或密码错误" });
      return;
    }

    const siteIds = JSON.parse(row.site_ids || "[]");
    const token = signJwt({
      sub: row.id,
      username: row.username,
      name: row.name,
      role: row.role,
      orgId: row.org_id,
      siteIds,
    }, jwtSecret, "24h");

    res.json({
      token,
      user: {
        id: row.id,
        username: row.username,
        name: row.name,
        role: row.role,
        orgId: row.org_id,
        siteIds,
        phone: row.phone,
        status: row.status,
      },
    });
  });

  r.get("/auth/me", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "未登录" });
      return;
    }

    const payload = verifyJwt(authHeader.slice(7), jwtSecret);
    if (!payload) {
      res.status(401).json({ error: "token 无效或已过期" });
      return;
    }

    // Fetch fresh user data from DB
    const db = getDb();
    const row = db.prepare("SELECT * FROM users WHERE id = ?").get(payload.sub ?? payload.userId) as any;
    if (!row || row.status === "disabled") {
      res.status(401).json({ error: "用户不存在或已被禁用" });
      return;
    }

    res.json({
      user: {
        id: row.id,
        username: row.username,
        name: row.name,
        role: row.role,
        orgId: row.org_id,
        siteIds: JSON.parse(row.site_ids || "[]"),
        phone: row.phone,
        status: row.status,
      },
    });
  });

  return r;
}
