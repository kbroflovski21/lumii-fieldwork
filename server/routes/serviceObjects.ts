import { Router } from "express";
import { getDb } from "../db/init";
import { genId, jsonParse, withOperationalState } from "./helpers";

function toApi(row: any, familyContacts: any[] = [], planSummaries: any[] = []) {
  if (!row) return row;
  return {
    id: row.id, name: row.name, phone: row.phone, age: row.age, gender: row.gender,
    address: row.address, mapDisplayPoint: jsonParse(row.map_display_point),
    eligibilityType: row.eligibility_type, serviceProjects: jsonParse(row.service_projects, []),
    serviceFrequency: row.service_frequency, careNotes: jsonParse(row.care_notes, []),
    riskTags: jsonParse(row.risk_tags, []), familySubscriptionSummary: row.family_subscription_summary,
    latestInsightSummary: row.latest_insight_summary, insightSummaries: jsonParse(row.insight_summaries, []),
    servicePlanSummaries: planSummaries, familyContacts, state: row.state,
  };
}

function getPlanSummaries(db: any, objectId: string) {
  const plans = db.prepare("SELECT * FROM service_plans WHERE service_object_id = ?").all(objectId);
  return plans.map((p: any) => {
    const exCount = (db.prepare("SELECT COUNT(*) as c FROM service_plan_exceptions WHERE service_plan_id = ?").get(p.id) as any)?.c ?? 0;
    return {
      id: p.id, serviceObjectId: p.service_object_id, serviceProject: p.service_project,
      cadenceLabel: p.cadence_label, preferredTimeWindow: jsonParse(p.preferred_time_window, {}),
      primarySocialWorkerId: p.primary_social_worker_id, primarySocialWorkerName: p.primary_social_worker_name,
      status: p.status, activeExceptionCount: exCount,
    };
  });
}

function getFamilyContacts(db: any, objectId: string) {
  return db.prepare("SELECT * FROM family_contacts WHERE service_object_id = ?").all(objectId).map((c: any) => ({
    id: c.id, name: c.name, relation: c.relation, phone: c.phone,
    subscriptionStatus: c.subscription_status, lastPushedAt: c.last_pushed_at,
  }));
}

export function serviceObjectsRoutes() {
  const r = Router();

  r.get("/service-objects", (_req, res) => {
    const db = getDb();
    const rows = db.prepare("SELECT * FROM service_objects ORDER BY created_at DESC").all();
    const plans = db.prepare("SELECT * FROM service_plans").all();
    const objects = rows.map((row: any) => toApi(row, getFamilyContacts(db, row.id), getPlanSummaries(db, row.id)));
    res.json(withOperationalState({ serviceObjects: objects, servicePlans: plans.map((p: any) => ({ ...p, preferredTimeWindow: jsonParse(p.preferred_time_window, {}), exceptions: db.prepare("SELECT * FROM service_plan_exceptions WHERE service_plan_id = ?").all(p.id).map((e: any) => ({ id: e.id, servicePlanId: e.service_plan_id, kind: e.kind, effectiveFrom: e.effective_from, effectiveTo: e.effective_to, timeWindow: jsonParse(e.time_window), replacementSocialWorkerId: e.replacement_social_worker_id, note: e.note })) })) }));
  });

  r.post("/service-objects", (req, res) => {
    const db = getDb();
    const id = genId("object");
    const b = req.body;
    db.prepare("INSERT INTO service_objects (id, name, phone, age, gender, address, map_display_point, eligibility_type, service_projects, service_frequency, care_notes, risk_tags, state) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'normal')").run(
      id, b.name, b.phone ?? null, b.age ?? null, b.gender ?? "unknown", b.address ?? "",
      b.mapDisplayPoint ? JSON.stringify(b.mapDisplayPoint) : null,
      b.eligibilityType ?? "government", JSON.stringify(b.serviceProjects ?? []),
      b.serviceFrequency ?? null, JSON.stringify(b.careNotes ?? []), JSON.stringify(b.riskTags ?? [])
    );
    const row = db.prepare("SELECT * FROM service_objects WHERE id = ?").get(id);
    res.json({ ok: true, id, message: "created", serviceObject: toApi(row) });
  });

  r.patch("/service-objects/:id", (req, res) => {
    const db = getDb();
    const b = req.body;
    const sets: string[] = [];
    const vals: any[] = [];
    const fields: Record<string, string> = { name: "name", phone: "phone", age: "age", gender: "gender", address: "address", eligibilityType: "eligibility_type", serviceFrequency: "service_frequency" };
    for (const [api, col] of Object.entries(fields)) {
      if (b[api] !== undefined) { sets.push(`${col} = ?`); vals.push(b[api]); }
    }
    const jsonFields: Record<string, string> = { serviceProjects: "service_projects", careNotes: "care_notes", riskTags: "risk_tags" };
    for (const [api, col] of Object.entries(jsonFields)) {
      if (b[api] !== undefined) { sets.push(`${col} = ?`); vals.push(JSON.stringify(b[api])); }
    }
    if (b.mapDisplayPoint !== undefined) { sets.push("map_display_point = ?"); vals.push(JSON.stringify(b.mapDisplayPoint)); }
    if (sets.length > 0) {
      sets.push("updated_at = datetime('now')");
      vals.push(req.params.id);
      db.prepare(`UPDATE service_objects SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
    }
    const row = db.prepare("SELECT * FROM service_objects WHERE id = ?").get(req.params.id);
    res.json({ ok: true, id: req.params.id, message: "updated", serviceObject: toApi(row, getFamilyContacts(db, req.params.id), getPlanSummaries(db, req.params.id)) });
  });

  r.post("/service-objects/:id/archive", (req, res) => {
    const db = getDb();
    db.prepare("UPDATE service_objects SET state = 'archived', updated_at = datetime('now') WHERE id = ?").run(req.params.id);
    res.json({ ok: true, id: req.params.id, message: "archived" });
  });

  r.get("/service-objects/:id/insights", (req, res) => {
    const db = getDb();
    const row = db.prepare("SELECT * FROM service_objects WHERE id = ?").get(req.params.id) as any;
    if (!row) return res.status(404).json({ error: "not found" });
    res.json(toApi(row, getFamilyContacts(db, req.params.id), getPlanSummaries(db, req.params.id)));
  });

  r.put("/service-objects/:id/family-subscriptions", (req, res) => {
    const db = getDb();
    res.json({ ok: true, id: req.params.id, message: "updated" });
  });

  r.get("/service-objects/:id/service-plans", (req, res) => {
    const db = getDb();
    const plans = db.prepare("SELECT * FROM service_plans WHERE service_object_id = ?").all(req.params.id);
    res.json(plans);
  });

  r.post("/service-objects/:id/service-plans", (req, res) => {
    const db = getDb();
    const id = genId("plan");
    const b = req.body;
    db.prepare("INSERT INTO service_plans (id, service_object_id, service_project, cadence_rule, cadence_label, preferred_time_window, start_date, primary_social_worker_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')").run(
      id, req.params.id, b.serviceProject ?? "", b.cadenceRule ?? "", b.cadenceLabel ?? "",
      JSON.stringify(b.preferredTimeWindow ?? {}), b.startDate ?? new Date().toISOString().slice(0, 10), b.primarySocialWorkerId ?? null
    );
    const row = db.prepare("SELECT * FROM service_plans WHERE id = ?").get(id);
    res.json(row);
  });

  r.post("/service-plans/:id/exceptions", (req, res) => {
    const db = getDb();
    const id = genId("exception");
    const b = req.body;
    db.prepare("INSERT INTO service_plan_exceptions (id, service_plan_id, kind, effective_from, effective_to, time_window, replacement_social_worker_id, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(
      id, req.params.id, b.kind, b.effectiveFrom, b.effectiveTo ?? null,
      b.timeWindow ? JSON.stringify(b.timeWindow) : null, b.replacementSocialWorkerId ?? null, b.note ?? null
    );
    const plan = db.prepare("SELECT * FROM service_plans WHERE id = ?").get(req.params.id);
    res.json(plan);
  });

  return r;
}
