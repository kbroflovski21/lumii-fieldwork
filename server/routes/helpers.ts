import { randomUUID } from "crypto";

export function genId(prefix: string) {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

export function jsonParse(val: any, fallback: any = null) {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "object") return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

const operationalState = { isLoading: false, permission: "full" as const };

export function withOperationalState(data: any) {
  return { ...data, operationalState };
}
