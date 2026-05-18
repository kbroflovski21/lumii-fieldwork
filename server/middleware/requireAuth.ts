import type { Request, Response, NextFunction } from "express";
import { verifyJwt } from "../ws/auth";

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: string;
  orgId: string;
  siteIds: string[];
}

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
    }
  }
}

export function requireAuth(jwtSecret: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "未登录" });
      return;
    }

    const payload = verifyJwt(authHeader.slice(7), jwtSecret) as any;
    if (!payload) {
      res.status(401).json({ error: "token 无效或已过期" });
      return;
    }

    req.authUser = {
      id: payload.sub ?? payload.userId,
      username: payload.username ?? "",
      name: payload.name ?? "",
      role: payload.role ?? "site_operator",
      orgId: payload.orgId ?? "org-001",
      siteIds: payload.siteIds ?? [],
    };

    next();
  };
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.authUser) {
      res.status(401).json({ error: "未登录" });
      return;
    }
    if (!roles.includes(req.authUser.role)) {
      res.status(403).json({ error: "无权限访问" });
      return;
    }
    next();
  };
}
