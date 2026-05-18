import jwt, { type SignOptions } from "jsonwebtoken";
import { timingSafeEqual } from "crypto";

export interface JwtPayload {
  userId: string;
  name?: string;
  [key: string]: unknown;
}

export interface GyTokenPayload {
  sub: string;
  role: string;
  siteIds: string[];
  scope: string;
  permissions: Record<string, string[]>;
  iat?: number;
  exp?: number;
}

export function signJwt(payload: Record<string, unknown>, secret: string, expiresIn: string): string {
  return jwt.sign(payload, secret, { expiresIn } as SignOptions);
}

export function verifyJwt(token: string, secret: string): JwtPayload | null {
  try {
    return jwt.verify(token, secret) as JwtPayload;
  } catch {
    return null;
  }
}

export function verifyWsToken(provided: string, expected: string): boolean {
  if (!provided || !expected) return false;
  if (provided.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function signGyToken(payload: Omit<GyTokenPayload, "iat" | "exp">, secret: string): string {
  return jwt.sign(payload as object, secret, { expiresIn: "30m" } as SignOptions);
}

export function verifyGyToken(token: string, secret: string): GyTokenPayload | null {
  try {
    return jwt.verify(token, secret) as GyTokenPayload;
  } catch {
    return null;
  }
}
