import { Router } from "express";
import { getDb } from "../db/init";
import { genId, jsonParse, withOperationalState } from "./helpers";

function toApi(row: any) {
  if (!row) return row;
  return {
    id: row.id, deviceCode: row.device_code, orgId: row.org_id, siteId: row.site_id, siteName: row.site_name,
    status: row.status, batteryPercent: row.battery_percent, activatedAt: row.activated_at,
    lastSyncAt: row.last_sync_at, lastRecordingAt: row.last_recording_at,
    preferredWorkerId: row.preferred_worker_id, preferredWorkerName: row.preferred_worker_name,
    recentServiceRecordIds: jsonParse(row.recent_service_record_ids, []),
  };
}

export function smartBadgesRoutes() {
  const r = Router();

  r.get("/smart-badges", (_req, res) => {
    const db = getDb();
    const rows = db.prepare("SELECT * FROM smart_badges ORDER BY created_at DESC").all();
    res.json(withOperationalState({ smartBadges: rows.map(toApi) }));
  });

  r.get("/smart-badges/:id", (req, res) => {
    const db = getDb();
    const row = db.prepare("SELECT * FROM smart_badges WHERE id = ?").get(req.params.id);
    if (!row) return res.status(404).json({ error: "not found" });
    res.json(toApi(row));
  });

  r.post("/smart-badges/activations", (req, res) => {
    const db = getDb();
    const b = req.body;
    const id = genId("badge");
    db.prepare("INSERT INTO smart_badges (id, device_code, org_id, site_id, site_name, status, battery_percent, activated_at, last_sync_at, preferred_worker_id) VALUES (?, ?, 'org-001', ?, '红培社区站', 'available', 100, datetime('now'), datetime('now'), ?)").run(
      id, b.deviceCode ?? `FW-${id.slice(-3)}`, b.siteId ?? "site-001", b.preferredWorkerId ?? null
    );
    const row = db.prepare("SELECT * FROM smart_badges WHERE id = ?").get(id);
    res.json({ ok: true, id, message: "activated", smartBadge: toApi(row) });
  });

  r.patch("/smart-badges/:id", (req, res) => {
    const db = getDb();
    const b = req.body;
    const sets: string[] = [];
    const vals: any[] = [];
    if (b.status !== undefined) { sets.push("status = ?"); vals.push(b.status); }
    if (b.preferredWorkerId !== undefined) { sets.push("preferred_worker_id = ?"); vals.push(b.preferredWorkerId); }
    if (sets.length > 0) {
      sets.push("updated_at = datetime('now')");
      vals.push(req.params.id);
      db.prepare(`UPDATE smart_badges SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
    }
    const row = db.prepare("SELECT * FROM smart_badges WHERE id = ?").get(req.params.id);
    res.json(toApi(row));
  });

  r.get("/smart-badges/:id/service-records", (req, res) => {
    const db = getDb();
    const rows = db.prepare("SELECT * FROM service_records WHERE badge_id = ? ORDER BY service_date DESC LIMIT 10").all(req.params.id);
    res.json(rows.map((r: any) => ({ serviceRecordId: r.id, serviceDate: r.service_date, serviceObjectName: r.service_object_name, reviewStatus: r.review_status })));
  });

  return r;
}
