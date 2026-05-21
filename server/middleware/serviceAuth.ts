import type { Request, Response, NextFunction } from "express";
import { timingSafeEqual } from "crypto";

export function requireServiceToken() {
  const token = process.env.SERVICE_TOKEN ?? "dev-service-token";
  return (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "missing service token" });
      return;
    }
    const provided = authHeader.slice(7);
    const expected = token;
    if (provided.length !== expected.length ||
        !timingSafeEqual(Buffer.from(provided), Buffer.from(expected))) {
      res.status(403).json({ error: "invalid service token" });
      return;
    }
    next();
  };
}
