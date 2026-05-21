import { Router } from "express";
import { randomUUID } from "crypto";
import { prisma } from "../db/prisma";

function genId(prefix: string) {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

export function internalRoutes() {
  const r = Router();

  r.post("/service-records", async (req, res) => {
    const b = req.body;
    const sessionId = b.sessionId;
    if (!sessionId) {
      res.status(400).json({ error: "missing required field: sessionId" });
      return;
    }

    try {
      if (b.isOfflineRevision) {
        const existing = await prisma.serviceRecord.findFirst({
          where: b.badgeId
            ? { badgeId: b.badgeId, serviceDate: b.serviceDate, startTime: b.startTime }
            : { structuredSummary: { contains: sessionId } },
        });

        if (existing) {
          const sr = b.serviceRecord ?? {};
          const updates: any = {};
          if (b.endTime) updates.endTime = b.endTime;
          if (b.durationMinutes !== undefined) updates.durationMinutes = b.durationMinutes;
          if (sr.summary) updates.generatedSummary = sr.summary;
          if (sr.confidence !== undefined) updates.assignmentConfidence = sr.confidence;
          if (sr) updates.structuredSummary = JSON.stringify({ completeness: sr.completeness, sop_compliance: sr.sop_compliance, anomalies: sr.anomalies, feedback_text: sr.feedback_text });
          if (sr.anomalies?.length) updates.serviceExceptions = sr.anomalies;

          await prisma.serviceRecord.update({ where: { id: existing.id }, data: updates });

          if (existing.transcriptId && b.transcript) {
            await prisma.transcript.update({
              where: { id: existing.transcriptId },
              data: { text: b.transcript.text ?? "", confidence: b.transcript.confidence ?? null, segments: b.transcript.segments ?? [] },
            });
          }

          res.json({ id: existing.id, created: false, updated: true });
          return;
        }
      }

      if (!b.badgeId || !b.serviceDate || !b.startTime || !b.endTime) {
        res.status(400).json({ error: "missing required fields for new record: badgeId, serviceDate, startTime, endTime" });
        return;
      }

      const recordId = genId("rec");
      const transcriptId = genId("tx");
      const audioId = genId("aud");
      const sr = b.serviceRecord ?? {};

      let serviceObjectName: string | null = b.serviceObjectName ?? null;
      if (!serviceObjectName && b.serviceObjectId) {
        const obj = await prisma.serviceObject.findFirst({ where: { id: b.serviceObjectId }, select: { name: true } });
        if (obj) serviceObjectName = obj.name;
      }

      let socialWorkerName: string | null = b.workerName ?? null;
      if (!socialWorkerName && b.workerId) {
        const sw = await prisma.socialWorker.findFirst({ where: { OR: [{ id: b.workerId }, { userId: b.workerId }] }, select: { name: true } });
        if (sw) socialWorkerName = sw.name;
      }

      await prisma.serviceRecord.create({
        data: {
          id: recordId,
          serviceDate: b.serviceDate,
          startTime: b.startTime,
          endTime: b.endTime,
          durationMinutes: b.durationMinutes ?? 0,
          badgeId: b.badgeId,
          socialWorkerId: b.workerId ?? null,
          socialWorkerName,
          serviceObjectId: b.serviceObjectId ?? null,
          serviceObjectName: serviceObjectName,
          serviceProject: b.serviceProject ?? sr.service_project ?? null,
          assignmentConfidence: sr.confidence ?? 0.5,
          reviewStatus: "needs_review",
          transcriptId,
          audioAssetId: audioId,
          generatedSummary: sr.summary ?? null,
          structuredSummary: sr ? JSON.stringify({ completeness: sr.completeness, sop_compliance: sr.sop_compliance, anomalies: sr.anomalies, feedback_text: sr.feedback_text }) : null,
          serviceExceptions: sr.anomalies?.length ? sr.anomalies : [],
        },
      });

      await prisma.transcript.create({
        data: { id: transcriptId, recordId, language: "zh-CN", text: b.transcript?.text ?? "", confidence: b.transcript?.confidence ?? null, segments: b.transcript?.segments ?? [] },
      });

      await prisma.audioAsset.create({
        data: { id: audioId, recordId, playbackUrl: b.audioUrl ?? null, durationSeconds: b.durationMinutes ? b.durationMinutes * 60 : 0, capturedByBadgeId: b.badgeId, uploadedAt: new Date().toISOString() },
      });

      const badge = await prisma.smartBadge.findFirst({ where: { OR: [{ deviceCode: b.badgeId }, { id: b.badgeId }] } });
      if (badge) {
        const ids = Array.isArray(badge.recentServiceRecordIds) ? (badge.recentServiceRecordIds as string[]) : [];
        ids.unshift(recordId);
        await prisma.smartBadge.update({
          where: { id: badge.id },
          data: { recentServiceRecordIds: ids.slice(0, 10), lastRecordingAt: new Date().toISOString() },
        });
        await prisma.serviceRecord.update({ where: { id: recordId }, data: { smartBadgeId: badge.id } });
      }

      if (b.scheduleId) {
        await prisma.serviceSchedule.update({
          where: { id: b.scheduleId },
          data: { serviceRecordId: recordId, status: "completed" as any },
        }).catch(() => {});
      }

      res.status(201).json({ id: recordId, created: true });
    } catch (err: any) {
      console.error("[internal] POST /service-records error:", err);
      res.status(500).json({ error: err.message ?? "internal error" });
    }
  });

  r.patch("/smart-badges/:badgeId/status", async (req, res) => {
    const badgeId = req.params.badgeId;
    const b = req.body;

    try {
      let badge = await prisma.smartBadge.findFirst({ where: { OR: [{ deviceCode: badgeId }, { id: badgeId }] } });

      if (!badge) {
        const newId = genId("badge");
        await prisma.smartBadge.create({
          data: { id: newId, deviceCode: badgeId, status: (b.status as any) ?? "available", batteryPercent: b.batteryPercent ?? 100, activatedAt: new Date().toISOString(), lastSyncAt: new Date().toISOString() },
        });
        res.json({ updated: true, created: true, id: newId });
        return;
      }

      const data: any = { lastSyncAt: new Date().toISOString() };
      if (b.status !== undefined) data.status = b.status;
      if (b.batteryPercent !== undefined) data.batteryPercent = b.batteryPercent;
      if (b.lastRecordingAt !== undefined) data.lastRecordingAt = b.lastRecordingAt;

      await prisma.smartBadge.update({ where: { id: badge.id }, data });
      res.json({ updated: true });
    } catch (err: any) {
      console.error("[internal] PATCH badge status error:", err);
      res.status(500).json({ error: err.message ?? "internal error" });
    }
  });

  return r;
}
