import { getDb } from "../db/init";
import { randomUUID } from "crypto";

export function genId(prefix: string) {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

export function jsonParse(val: any, fallback: any = null) {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "object") return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

export function rowToJson(row: any, jsonFields: string[]): any {
  if (!row) return row;
  const out = { ...row };
  for (const f of jsonFields) {
    if (f in out) out[f] = jsonParse(out[f], f.endsWith("s") ? [] : null);
  }
  return out;
}

export function camelToSnake(s: string) {
  return s.replace(/[A-Z]/g, m => `_${m.toLowerCase()}`);
}

export function snakeToCamel(s: string) {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

export function rowToCamel(row: any): any {
  if (!row) return row;
  const out: any = {};
  for (const [k, v] of Object.entries(row)) {
    out[snakeToCamel(k)] = v;
  }
  return out;
}

export function toApiShape(row: any, jsonFields: string[]): any {
  if (!row) return row;
  const withJson = rowToJson(row, jsonFields.map(camelToSnake));
  return rowToCamel(withJson);
}

const operationalState = { isLoading: false, permission: "full" as const };

export function withOperationalState(data: any) {
  return { ...data, operationalState };
}
