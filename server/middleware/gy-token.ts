import type { Request, Response, NextFunction } from "express";
import { verifyGyToken, type GyTokenPayload } from "../ws/auth";

declare global {
  namespace Express {
    interface Request {
      gyActor?: GyTokenPayload;
    }
  }
}

export function gyTokenMiddleware(secret: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "missing Authorization header" });
      return;
    }

    const token = authHeader.slice(7);
    const payload = verifyGyToken(token, secret);
    if (!payload) {
      res.status(401).json({ error: "invalid or expired token" });
      return;
    }

    req.gyActor = payload;
    next();
  };
}
