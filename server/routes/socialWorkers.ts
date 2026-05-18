import { Router } from "express";
import { getDb } from "../db/init";
import { genId, jsonParse, withOperationalState } from "./helpers";

function toApi(row: any) {
  if (!row) return row;
  return {
    id: row.id, userId: row.user_id, name: row.name, phone: row.phone, siteId: row.site_id,
    workerType: row.worker_type, qualificationLabels: jsonParse(row.qualification_labels, []),
    status: row.status,
    preferredBadge: row.preferred_badge_id ? { badgeId: row.preferred_badge_id, deviceCode: row.preferred_badge_device_code, status: row.preferred_badge_status, lastSyncAt: row.preferred_badge_last_sync_at } : undefined,
    praiseSummary: { praiseCount: row.praise_count, latestPraiseAt: row.latest_praise_at, latestPraiseExcerpt: row.latest_praise_excerpt },
  };
}

export function socialWorkersRoutes() {
  const r = Router();

  r.get("/social-workers", (_req, res) => {
    const db = getDb();
    const rows = db.prepare("SELECT * FROM social_workers ORDER BY created_at DESC").all();
    res.json(withOperationalState({ socialWorkers: rows.map(toApi) }));
  });

  r.post("/social-workers", (req, res) => {
    const db = getDb();
    const id = genId("worker");
    const b = req.body;
    db.prepare("INSERT INTO social_workers (id, user_id, name, phone, site_id, worker_type, qualification_labels, status) VALUES (?, ?, ?, ?, 'site-001', ?, ?, 'active')").run(
      id, `user-${id}`, b.name ?? "", b.phone ?? "", b.workerType ?? "service_personnel", JSON.stringify(b.qualificationLabels ?? [])
    );
    const row = db.prepare("SELECT * FROM social_workers WHERE id = ?").get(id);
    res.json(toApi(row));
  });

  r.patch("/social-workers/:id", (req, res) => {
    const db = getDb();
    const b = req.body;
    const sets: string[] = [];
    const vals: any[] = [];
    if (b.name !== undefined) { sets.push("name = ?"); vals.push(b.name); }
    if (b.phone !== undefined) { sets.push("phone = ?"); vals.push(b.phone); }
    if (b.qualificationLabels !== undefined) { sets.push("qualification_labels = ?"); vals.push(JSON.stringify(b.qualificationLabels)); }
    if (b.status !== undefined) { sets.push("status = ?"); vals.push(b.status); }
    if (sets.length > 0) {
      sets.push("updated_at = datetime('now')");
      vals.push(req.params.id);
      db.prepare(`UPDATE social_workers SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
    }
    const row = db.prepare("SELECT * FROM social_workers WHERE id = ?").get(req.params.id);
    res.json(toApi(row));
  });

  r.put("/social-workers/:id/badge-binding", (req, res) => {
    const db = getDb();
    const b = req.body;
    const badgeId = b.preferredBadgeId ?? b.badgeId ?? null;
    if (badgeId) {
      const badge = db.prepare("SELECT device_code, status, last_sync_at FROM smart_badges WHERE id = ?").get(badgeId) as any;
      db.prepare("UPDATE social_workers SET preferred_badge_id = ?, preferred_badge_device_code = ?, preferred_badge_status = ?, preferred_badge_last_sync_at = ?, updated_at = datetime('now') WHERE id = ?").run(
        badgeId, badge?.device_code ?? null, badge?.status ?? null, badge?.last_sync_at ?? null, req.params.id
      );
    } else {
      db.prepare("UPDATE social_workers SET preferred_badge_id = NULL, preferred_badge_device_code = NULL, preferred_badge_status = NULL, preferred_badge_last_sync_at = NULL, updated_at = datetime('now') WHERE id = ?").run(req.params.id);
    }
    const row = db.prepare("SELECT * FROM social_workers WHERE id = ?").get(req.params.id);
    res.json(toApi(row));
  });

  r.post("/social-workers/:id/archive", (req, res) => {
    const db = getDb();
    db.prepare("UPDATE social_workers SET status = 'disabled', updated_at = datetime('now') WHERE id = ?").run(req.params.id);
    res.json({ ok: true, id: req.params.id, message: "archived" });
  });

  return r;
}
