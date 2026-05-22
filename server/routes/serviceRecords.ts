import { Router } from "express";
import { prisma } from "../db/prisma";
import { withOperationalState, resolveSiteId } from "./helpers";

function toApi(row: any) {
  if (!row) return row;
  return {
    id: row.id, serviceDate: row.serviceDate, startTime: row.startTime, endTime: row.endTime,
    durationMinutes: row.durationMinutes, socialWorkerId: row.socialWorkerId, socialWorkerName: row.socialWorkerName,
    serviceObjectId: row.serviceObjectId, serviceObjectName: row.serviceObjectName,
    familyContactIds: row.familyContactIds, badgeId: row.badgeId, smartBadgeId: row.smartBadgeId,
    serviceProject: row.serviceProject, assignmentConfidence: row.assignmentConfidence,
    reviewStatus: row.reviewStatus, exportStatus: row.exportStatus,
    locationEvidence: row.locationEvidence, serviceExceptions: row.serviceExceptions,
    serviceItems: row.serviceItems, exceptionTags: row.exceptionTags,
    missingFields: row.missingFields, audioAssetId: row.audioAssetId, transcriptId: row.transcriptId,
    structuredSummary: row.structuredSummary, generatedSummary: row.generatedSummary,
    exportHistory: row.exportHistory,
  };
}

function audioToApi(row: any) {
  if (!row) return row;
  return {
    id: row.id, recordId: row.recordId, playbackUrl: row.playbackUrl, durationSeconds: row.durationSeconds,
    capturedByBadgeId: row.capturedByBadgeId, uploadedAt: row.uploadedAt, retentionLabel: row.retentionLabel,
  };
}

function transcriptToApi(row: any) {
  if (!row) return row;
  return {
    id: row.id, recordId: row.recordId, language: row.language, text: row.text,
    confidence: row.confidence, segments: row.segments,
  };
}

export function serviceRecordsRoutes() {
  const r = Router();

  r.get("/service-records", async (req, res) => {
    const siteId = resolveSiteId(req);
    const where = siteId ? { siteId } : {};
    const records = await prisma.serviceRecord.findMany({ where, orderBy: { serviceDate: "desc" } });
    const audioAssets = await prisma.audioAsset.findMany();
    const transcripts = await prisma.transcript.findMany();
    const serviceObjects = await prisma.serviceObject.findMany({ where, select: { id: true, name: true } });
    const smartBadges = await prisma.smartBadge.findMany({ where, select: { id: true, deviceCode: true } });

    res.json(withOperationalState({
      serviceRecords: records.map(toApi),
      audioAssets: audioAssets.map(audioToApi),
      transcripts: transcripts.map(transcriptToApi),
      serviceObjects: serviceObjects.map((o) => ({ id: o.id, name: o.name, familyContacts: [] })),
      smartBadges: smartBadges.map((b) => ({ id: b.id, deviceCode: b.deviceCode })),
    }));
  });

  r.get("/service-records/:id", async (req, res) => {
    const row = await prisma.serviceRecord.findFirst({ where: { id: req.params.id } });
    if (!row) return res.status(404).json({ error: "not found" });
    res.json(toApi(row));
  });

  r.get("/service-records/:id/audio", async (req, res) => {
    const record = await prisma.serviceRecord.findFirst({
      where: { id: req.params.id },
      select: { audioAssetId: true },
    });
    if (!record) return res.status(404).json({ error: "not found" });
    const audio = await prisma.audioAsset.findFirst({ where: { id: record.audioAssetId! } });
    if (!audio) return res.status(404).json({ error: "audio not found" });
    res.json(audioToApi(audio));
  });

  r.get("/service-records/:id/transcript", async (req, res) => {
    const record = await prisma.serviceRecord.findFirst({
      where: { id: req.params.id },
      select: { transcriptId: true },
    });
    if (!record) return res.status(404).json({ error: "not found" });
    const transcript = await prisma.transcript.findFirst({ where: { id: record.transcriptId! } });
    if (!transcript) return res.status(404).json({ error: "transcript not found" });
    res.json(transcriptToApi(transcript));
  });

  r.patch("/service-records/:id/review", async (req, res) => {
    const b = req.body;
    if (b.action === "confirm_assignment") {
      await prisma.serviceRecord.update({ where: { id: req.params.id }, data: { reviewStatus: "confirmed" } });
    } else if (b.action === "complete_information") {
      await prisma.serviceRecord.update({ where: { id: req.params.id }, data: { reviewStatus: "confirmed", missingFields: [] } });
    } else if (b.action === "resolve_exception") {
      await prisma.serviceRecord.update({ where: { id: req.params.id }, data: { reviewStatus: "confirmed" } });
    }
    const row = await prisma.serviceRecord.findFirst({ where: { id: req.params.id } });
    res.json({ ok: true, id: req.params.id, message: "reviewed", serviceRecord: toApi(row) });
  });

  r.post("/service-records/export", async (req, res) => {
    res.json({ ok: true, exportId: `export-${Date.now()}`, fileVersion: "v1", exportedAt: new Date().toISOString() });
  });

  return r;
}
