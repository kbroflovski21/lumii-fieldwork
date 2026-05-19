import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../db/prisma";
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

  r.post("/auth/login", async (req, res) => {
    const { username, password } = req.body ?? {};
    if (!username || !password) {
      res.status(400).json({ error: "用户名和密码不能为空" });
      return;
    }

    const row = await prisma.user.findFirst({ where: { username } });
    if (!row) {
      res.status(401).json({ error: "用户名或密码错误" });
      return;
    }

    if (row.status === "disabled") {
      res.status(403).json({ error: "账号已被禁用" });
      return;
    }

    if (!bcrypt.compareSync(password, row.passwordHash)) {
      res.status(401).json({ error: "用户名或密码错误" });
      return;
    }

    const siteIds = row.siteIds as string[];
    const token = signJwt({
      sub: row.id,
      username: row.username,
      name: row.name,
      role: row.role,
      orgId: row.orgId,
      siteIds,
    }, jwtSecret, "24h");

    res.json({
      token,
      user: {
        id: row.id,
        username: row.username,
        name: row.name,
        role: row.role,
        orgId: row.orgId,
        siteIds,
        phone: row.phone,
        status: row.status,
      },
    });
  });

  r.get("/auth/me", async (req, res) => {
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
    const row = await prisma.user.findFirst({ where: { id: payload.sub ?? payload.userId } });
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
        orgId: row.orgId,
        siteIds: row.siteIds as string[],
        phone: row.phone,
        status: row.status,
      },
    });
  });

  r.post("/auth/create-careworker-account", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "未登录" });
      return;
    }
    const payload = verifyJwt(authHeader.slice(7), jwtSecret) as any;
    if (!payload || (payload.role !== "site_operator" && payload.role !== "org_admin")) {
      res.status(403).json({ error: "无权限" });
      return;
    }

    const { phone, name, siteId } = req.body ?? {};
    if (!phone || !name) {
      res.status(400).json({ error: "手机号和姓名为必填" });
      return;
    }

    // Check if account already exists for this phone
    const existing = await prisma.user.findFirst({ where: { username: phone } });
    if (existing) {
      res.status(409).json({ error: "该手机号已有账号" });
      return;
    }

    // Generate random 8-char password
    const password = Math.random().toString(36).slice(2, 10);
    const hash = bcrypt.hashSync(password, 10);
    const id = `user-cw-${Date.now().toString(36)}`;

    await prisma.user.create({
      data: {
        id,
        username: phone,
        passwordHash: hash,
        name,
        role: "careworker",
        orgId: payload.orgId ?? "org-001",
        siteIds: [siteId ?? "site-001"],
        phone,
      },
    });

    res.status(201).json({ id, username: phone, password, name, role: "careworker" });
  });

  r.patch("/auth/change-password", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "未登录" });
      return;
    }
    const payload = verifyJwt(authHeader.slice(7), jwtSecret) as any;
    if (!payload) {
      res.status(401).json({ error: "token 无效" });
      return;
    }

    const { oldPassword, newPassword } = req.body ?? {};
    if (!oldPassword || !newPassword || newPassword.length < 6) {
      res.status(400).json({ error: "密码至少6位" });
      return;
    }

    const user = await prisma.user.findFirst({ where: { id: payload.sub ?? payload.userId } });
    if (!user || !bcrypt.compareSync(oldPassword, user.passwordHash)) {
      res.status(400).json({ error: "当前密码错误" });
      return;
    }

    const hash = bcrypt.hashSync(newPassword, 10);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } });
    res.json({ ok: true });
  });

  return r;
}
