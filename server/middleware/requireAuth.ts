import type { Request, Response, NextFunction } from "express";
import { verifyJwt, verifyGyToken } from "../ws/auth";

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

export function requireAuth(jwtSecret: string, gyTokenSecret?: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "未登录" });
      return;
    }

    const token = authHeader.slice(7);

    const payload = verifyJwt(token, jwtSecret) as any;
    if (payload) {
      req.authUser = {
        id: payload.sub ?? payload.userId,
        username: payload.username ?? "",
        name: payload.name ?? "",
        role: payload.role ?? "site_operator",
        orgId: payload.orgId ?? "org-001",
        siteIds: payload.siteIds ?? [],
      };
      next();
      return;
    }

    if (gyTokenSecret) {
      const gyPayload = verifyGyToken(token, gyTokenSecret);
      if (gyPayload) {
        let role = gyPayload.role;
        if (!role) {
          role = gyPayload.scope === "admin" ? "org_admin" : "site_operator";
        }
        req.authUser = {
          id: gyPayload.sub,
          username: "cc-session",
          name: "CC Session",
          role,
          orgId: "org-001",
          siteIds: gyPayload.siteIds ?? [],
        };
        next();
        return;
      }
    }

    res.status(401).json({ error: "token 无效或已过期" });
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
