import { Router } from "express";
import { getDb } from "../db/init";
import { jsonParse, withOperationalState } from "./helpers";

function toApi(row: any) {
  if (!row) return row;
  return {
    id: row.id, serviceDate: row.service_date, startTime: row.start_time, endTime: row.end_time,
    durationMinutes: row.duration_minutes, socialWorkerId: row.social_worker_id, socialWorkerName: row.social_worker_name,
    serviceObjectId: row.service_object_id, serviceObjectName: row.service_object_name,
    familyContactIds: jsonParse(row.family_contact_ids, []), badgeId: row.badge_id, smartBadgeId: row.smart_badge_id,
    serviceProject: row.service_project, assignmentConfidence: row.assignment_confidence,
    reviewStatus: row.review_status, exportStatus: row.export_status,
    locationEvidence: jsonParse(row.location_evidence), serviceExceptions: jsonParse(row.service_exceptions, []),
    serviceItems: jsonParse(row.service_items, []), exceptionTags: jsonParse(row.exception_tags, []),
    missingFields: jsonParse(row.missing_fields, []), audioAssetId: row.audio_asset_id, transcriptId: row.transcript_id,
    structuredSummary: row.structured_summary, generatedSummary: row.generated_summary,
    exportHistory: jsonParse(row.export_history, []),
  };
}

function audioToApi(row: any) {
  if (!row) return row;
  return {
    id: row.id, recordId: row.record_id, playbackUrl: row.playback_url, durationSeconds: row.duration_seconds,
    capturedByBadgeId: row.captured_by_badge_id, uploadedAt: row.uploaded_at, retentionLabel: row.retention_label,
  };
}

function transcriptToApi(row: any) {
  if (!row) return row;
  return {
    id: row.id, recordId: row.record_id, language: row.language, text: row.text,
    confidence: row.confidence, segments: jsonParse(row.segments, []),
  };
}

export function serviceRecordsRoutes() {
  const r = Router();

  r.get("/service-records", (_req, res) => {
    const db = getDb();
    const records = db.prepare("SELECT * FROM service_records ORDER BY service_date DESC").all();
    const audioAssets = db.prepare("SELECT * FROM audio_assets").all();
    const transcripts = db.prepare("SELECT * FROM transcripts").all();
    const serviceObjects = db.prepare("SELECT * FROM service_objects").all();
    const smartBadges = db.prepare("SELECT * FROM smart_badges").all();

    res.json(withOperationalState({
      serviceRecords: records.map(toApi),
      audioAssets: audioAssets.map(audioToApi),
      transcripts: transcripts.map(transcriptToApi),
      serviceObjects: serviceObjects.map((o: any) => ({ id: o.id, name: o.name, familyContacts: [] })),
      smartBadges: smartBadges.map((b: any) => ({ id: b.id, deviceCode: b.device_code })),
    }));
  });

  r.get("/service-records/:id", (req, res) => {
    const db = getDb();
    const row = db.prepare("SELECT * FROM service_records WHERE id = ?").get(req.params.id);
    if (!row) return res.status(404).json({ error: "not found" });
    res.json(toApi(row));
  });

  r.get("/service-records/:id/audio", (req, res) => {
    const db = getDb();
    const record = db.prepare("SELECT audio_asset_id FROM service_records WHERE id = ?").get(req.params.id) as any;
    if (!record) return res.status(404).json({ error: "not found" });
    const audio = db.prepare("SELECT * FROM audio_assets WHERE id = ?").get(record.audio_asset_id);
    if (!audio) return res.status(404).json({ error: "audio not found" });
    res.json(audioToApi(audio));
  });

  r.get("/service-records/:id/transcript", (req, res) => {
    const db = getDb();
    const record = db.prepare("SELECT transcript_id FROM service_records WHERE id = ?").get(req.params.id) as any;
    if (!record) return res.status(404).json({ error: "not found" });
    const transcript = db.prepare("SELECT * FROM transcripts WHERE id = ?").get(record.transcript_id);
    if (!transcript) return res.status(404).json({ error: "transcript not found" });
    res.json(transcriptToApi(transcript));
  });

  r.patch("/service-records/:id/review", (req, res) => {
    const db = getDb();
    const b = req.body;
    if (b.action === "confirm_assignment") {
      db.prepare("UPDATE service_records SET review_status = 'confirmed', updated_at = datetime('now') WHERE id = ?").run(req.params.id);
    } else if (b.action === "complete_information") {
      db.prepare("UPDATE service_records SET review_status = 'confirmed', missing_fields = '[]', updated_at = datetime('now') WHERE id = ?").run(req.params.id);
    } else if (b.action === "resolve_exception") {
      db.prepare("UPDATE service_records SET review_status = 'confirmed', updated_at = datetime('now') WHERE id = ?").run(req.params.id);
    }
    const row = db.prepare("SELECT * FROM service_records WHERE id = ?").get(req.params.id);
    res.json({ ok: true, id: req.params.id, message: "reviewed", serviceRecord: toApi(row) });
  });

  r.post("/service-records/export", (req, res) => {
    res.json({ ok: true, exportId: `export-${Date.now()}`, fileVersion: "v1", exportedAt: new Date().toISOString() });
  });

  return r;
}
