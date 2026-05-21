import type { Request, Response, NextFunction } from "express";
import { verifyJwt, verifyGyToken } from "../ws/auth";
import type { AuthUser } from "./requireAuth";

/**
 * Optional auth middleware. Attaches req.authUser if a valid token is present,
 * but does NOT reject requests without auth. This allows:
 * - Logged-in browser users (JWT from login)
 * - CC sessions with GY_API_TOKEN (from agent prepare_session)
 * - Unauthenticated requests (for backward compat / transition)
 */
export function optionalAuth(jwtSecret: string, gyTokenSecret?: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (req.authUser) { next(); return; }
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      next();
      return;
    }

    const token = authHeader.slice(7);

    // Try user JWT first
    const jwtPayload = verifyJwt(token, jwtSecret) as any;
    if (jwtPayload) {
      req.authUser = {
        id: jwtPayload.sub ?? jwtPayload.userId,
        username: jwtPayload.username ?? "",
        name: jwtPayload.name ?? "",
        role: jwtPayload.role ?? "site_operator",
        orgId: jwtPayload.orgId ?? "org-001",
        siteIds: jwtPayload.siteIds ?? [],
      };
      next();
      return;
    }

    // Try GY_API_TOKEN (from CC session)
    if (gyTokenSecret) {
      const gyPayload = verifyGyToken(token, gyTokenSecret);
      if (gyPayload) {
        req.authUser = {
          id: gyPayload.sub,
          username: "cc-session",
          name: "CC Session",
          role: gyPayload.role,
          orgId: "org-001",
          siteIds: gyPayload.siteIds,
        };
        next();
        return;
      }
    }

    // No valid token — allow through without authUser (backward compat)
    next();
  };
}
