import { Router } from "express";
import { getDb } from "../db/init";
import { genId, jsonParse, withOperationalState } from "./helpers";

function toApi(row: any) {
  if (!row) return row;
  return {
    id: row.id, source: row.source, servicePlanId: row.service_plan_id,
    serviceObjectId: row.service_object_id, serviceObjectName: row.service_object_name,
    serviceProject: row.service_project, addressSnapshot: row.address_snapshot, address: row.address,
    mapDisplayPoint: jsonParse(row.map_display_point), serviceDate: row.service_date,
    startTime: row.start_time, endTime: row.end_time, timeWindow: jsonParse(row.time_window, {}),
    assignedSocialWorkerId: row.assigned_social_worker_id, assignedSocialWorkerName: row.assigned_social_worker_name,
    status: row.status, notes: row.notes, serviceRecordId: row.service_record_id,
    planExceptionApplied: !!row.plan_exception_applied, riskTags: jsonParse(row.risk_tags, []),
    adjustmentHistory: jsonParse(row.adjustment_history, []),
  };
}

export function serviceSchedulesRoutes() {
  const r = Router();

  r.get("/service-schedule-occurrences", (_req, res) => {
    const db = getDb();
    const rows = db.prepare("SELECT * FROM service_schedules ORDER BY service_date ASC").all();
    res.json(withOperationalState({ serviceSchedules: rows.map(toApi) }));
  });

  r.get("/service-schedule-occurrences/:id", (req, res) => {
    const db = getDb();
    const row = db.prepare("SELECT * FROM service_schedules WHERE id = ?").get(req.params.id);
    if (!row) return res.status(404).json({ error: "not found" });
    res.json(toApi(row));
  });

  r.post("/service-schedule-occurrences", (req, res) => {
    const db = getDb();
    const id = genId("schedule");
    const b = req.body;
    // Look up service object name
    let objName = "";
    let addr = "";
    let mapPoint: any = null;
    if (b.serviceObjectId) {
      const obj = db.prepare("SELECT name, address, map_display_point FROM service_objects WHERE id = ?").get(b.serviceObjectId) as any;
      if (obj) { objName = obj.name; addr = obj.address; mapPoint = obj.map_display_point; }
    }
    const newStatus = b.assignedSocialWorkerId ? "scheduled" : "unassigned";
    db.prepare("INSERT INTO service_schedules (id, source, service_object_id, service_object_name, service_project, address_snapshot, address, map_display_point, service_date, start_time, end_time, time_window, assigned_social_worker_id, status, risk_tags) VALUES (?, 'one_time', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]')").run(
      id, b.serviceObjectId ?? "", objName, b.serviceProject ?? "",
      addr, addr, mapPoint, b.serviceDate ?? "", b.timeWindow?.start ?? "", b.timeWindow?.end ?? "",
      JSON.stringify(b.timeWindow ?? {}), b.assignedSocialWorkerId ?? null, newStatus
    );
    const row = db.prepare("SELECT * FROM service_schedules WHERE id = ?").get(id);
    res.json({ ok: true, id, message: "created", serviceSchedule: toApi(row) });
  });

  r.patch("/service-schedule-occurrences/:id", (req, res) => {
    const db = getDb();
    const b = req.body;
    const sets: string[] = [];
    const vals: any[] = [];
    if (b.serviceDate !== undefined) { sets.push("service_date = ?"); vals.push(b.serviceDate); }
    if (b.timeWindow !== undefined) {
      sets.push("time_window = ?"); vals.push(JSON.stringify(b.timeWindow));
      sets.push("start_time = ?"); vals.push(b.timeWindow.start ?? "");
      sets.push("end_time = ?"); vals.push(b.timeWindow.end ?? "");
    }
    if (b.assignedSocialWorkerId !== undefined) {
      sets.push("assigned_social_worker_id = ?"); vals.push(b.assignedSocialWorkerId);
      if (b.assignedSocialWorkerId) {
        const worker = db.prepare("SELECT name FROM social_workers WHERE id = ?").get(b.assignedSocialWorkerId) as any;
        sets.push("assigned_social_worker_name = ?"); vals.push(worker?.name ?? null);
        sets.push("status = ?"); vals.push("scheduled");
      } else {
        sets.push("assigned_social_worker_name = ?"); vals.push(null);
      }
    }
    if (b.status !== undefined) { sets.push("status = ?"); vals.push(b.status); }
    if (b.notes !== undefined) { sets.push("notes = ?"); vals.push(b.notes); }
    // Record adjustment history
    let historyEntry: any = null;
    if (b.serviceDate !== undefined || b.timeWindow !== undefined) {
      historyEntry = { action: "调整时间", detail: `${b.serviceDate ?? ""} ${b.timeWindow?.label ?? ""}`, operatorName: "站点运营", adjustedAt: new Date().toISOString() };
    } else if (b.assignedSocialWorkerId !== undefined) {
      const workerName = b.assignedSocialWorkerId ? (db.prepare("SELECT name FROM social_workers WHERE id = ?").get(b.assignedSocialWorkerId) as any)?.name ?? "" : "取消分配";
      historyEntry = { action: "调整服务人员", detail: workerName, operatorName: "站点运营", adjustedAt: new Date().toISOString() };
    } else if (b.status === "cancelled") {
      historyEntry = { action: "取消排期", detail: b.notes ?? "", operatorName: "站点运营", adjustedAt: new Date().toISOString() };
    }
    if (historyEntry) {
      const existing = db.prepare("SELECT adjustment_history FROM service_schedules WHERE id = ?").get(req.params.id) as any;
      const history = jsonParse(existing?.adjustment_history, []);
      history.push(historyEntry);
      sets.push("adjustment_history = ?"); vals.push(JSON.stringify(history));
    }

    if (sets.length > 0) {
      sets.push("updated_at = datetime('now')");
      vals.push(req.params.id);
      db.prepare(`UPDATE service_schedules SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
    }
    const row = db.prepare("SELECT * FROM service_schedules WHERE id = ?").get(req.params.id);
    res.json({ ok: true, id: req.params.id, message: "updated", serviceSchedule: toApi(row) });
  });

  return r;
}
