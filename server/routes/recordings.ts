import { Router } from "express";
import { randomUUID } from "crypto";
import { prisma } from "../db/prisma";

function toBeijingDate(d: Date): string {
  return new Date(d.getTime() + 8 * 3600000).toISOString().slice(0, 10);
}
function toBeijingTime(d: Date): string {
  return new Date(d.getTime() + 8 * 3600000).toISOString().slice(11, 16);
}

function genId(prefix: string) {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

export function recordingRoutes() {
  const r = Router();

  // List recordings (for station manager view)
  r.get("/recordings", async (req, res) => {
    try {
      const where: any = {};
      if (req.query.badgeId) where.badgeId = req.query.badgeId;
      if (req.query.workerId) where.workerId = req.query.workerId;
      if (req.query.status) where.status = req.query.status;
      if (req.query.userId) {
        const sw = await prisma.socialWorker.findFirst({ where: { userId: req.query.userId as string }, select: { id: true } });
        if (sw) where.workerId = sw.id;
      }

      const recordings = await prisma.recording.findMany({
        where,
        orderBy: { startedAt: "desc" },
        take: 50,
      });
      res.json({ recordings });
    } catch {
      res.json({ recordings: [] });
    }
  });

  // Get single recording
  r.get("/recordings/:id", async (req, res) => {
    const rec = await prisma.recording.findFirst({ where: { id: req.params.id } });
    if (!rec) return res.status(404).json({ error: "not found" });
    res.json(rec);
  });

  // Manual match by station manager
  r.patch("/recordings/:id/match", async (req, res) => {
    const b = req.body;
    const rec = await prisma.recording.findFirst({ where: { id: req.params.id } });
    if (!rec) return res.status(404).json({ error: "not found" });

    // Look up schedule details
    let serviceObjectId = b.serviceObjectId ?? null;
    let serviceObjectName = b.serviceObjectName ?? null;
    if (b.scheduleId) {
      const sched = await prisma.serviceSchedule.findFirst({ where: { id: b.scheduleId } });
      if (sched) {
        serviceObjectId = sched.serviceObjectId;
        serviceObjectName = sched.serviceObjectName;
      }
    }

    // Create or update service record from this recording
    const serviceRecordId = await createOrUpdateServiceRecord(rec, serviceObjectId, serviceObjectName, b.scheduleId);

    await prisma.recording.update({
      where: { id: req.params.id },
      data: {
        status: "matched",
        matchConfidence: 1.0,
        matchedScheduleId: b.scheduleId ?? null,
        matchedServiceObjectId: serviceObjectId,
        matchedServiceObjectName: serviceObjectName,
        matchedServiceRecordId: serviceRecordId,
        matchReason: "手动匹配",
      },
    });

    res.json({ ok: true, serviceRecordId });
  });

  // Re-trigger auto-match
  r.post("/recordings/:id/rematch", async (req, res) => {
    const rec = await prisma.recording.findFirst({ where: { id: req.params.id } });
    if (!rec) return res.status(404).json({ error: "not found" });
    await prisma.recording.update({ where: { id: req.params.id }, data: { status: "pending_match", matchConfidence: null, matchedScheduleId: null, matchedServiceRecordId: null, matchedServiceObjectId: null, matchedServiceObjectName: null, matchReason: null } });
    const result = await autoMatchRecording(req.params.id);
    res.json(result);
  });

  return r;
}

// Internal routes (called by processor via SERVICE_TOKEN)
export function recordingInternalRoutes() {
  const r = Router();

  // Processor creates a recording
  r.post("/recordings", async (req, res) => {
    const b = req.body;
    if (!b.sessionId || !b.badgeId) {
      res.status(400).json({ error: "sessionId and badgeId required" });
      return;
    }

    // Resolve worker name — always prefer DB lookup to avoid encoding issues
    let workerName: string | null = null;
    if (b.workerId) {
      const sw = await prisma.socialWorker.findFirst({
        where: { OR: [{ id: b.workerId }, { userId: b.workerId }] },
        select: { name: true },
      });
      if (sw) workerName = sw.name;
    }
    if (!workerName) workerName = b.workerName ?? null;

    const id = genId("rec");
    await prisma.recording.create({
      data: {
        id,
        sessionId: b.sessionId,
        badgeId: b.badgeId,
        workerId: b.workerId ?? null,
        workerName,
        startedAt: b.startedAt ? new Date(b.startedAt) : new Date(),
        endedAt: b.endedAt ? new Date(b.endedAt) : null,
        durationSeconds: b.durationSeconds ?? 0,
        transcriptText: b.transcriptText ?? null,
        transcriptSegments: b.transcriptSegments ?? [],
        transcriptConfidence: b.transcriptConfidence ?? null,
        audioUrl: b.audioUrl ?? null,
        sopResults: b.sopResults ?? null,
        aiSummary: b.aiSummary ?? null,
        status: "pending_match",
      },
    });

    // Trigger auto-match
    const matchResult = await autoMatchRecording(id);

    res.status(201).json({ id, ...matchResult });
  });

  // Processor updates recording after offline analysis
  r.patch("/recordings/:id", async (req, res) => {
    const b = req.body;
    const data: any = {};
    if (b.transcriptText !== undefined) data.transcriptText = b.transcriptText;
    if (b.transcriptSegments !== undefined) data.transcriptSegments = b.transcriptSegments;
    if (b.transcriptConfidence !== undefined) data.transcriptConfidence = b.transcriptConfidence;
    if (b.sopResults !== undefined) data.sopResults = b.sopResults;
    if (b.aiSummary !== undefined) data.aiSummary = b.aiSummary;
    if (b.audioUrl !== undefined) data.audioUrl = b.audioUrl;

    if (Object.keys(data).length > 0) {
      await prisma.recording.update({ where: { id: req.params.id }, data });
    }

    // If matched, also update the linked service record
    const rec = await prisma.recording.findFirst({ where: { id: req.params.id } });
    if (rec?.matchedServiceRecordId && (b.sopResults || b.aiSummary || b.transcriptText)) {
      const sr: any = {};
      if (b.aiSummary) sr.generatedSummary = b.aiSummary;
      if (b.sopResults) sr.structuredSummary = JSON.stringify(b.sopResults);
      if (b.transcriptText && rec.matchedServiceRecordId) {
        // Update transcript
        const existing = await prisma.serviceRecord.findFirst({
          where: { id: rec.matchedServiceRecordId },
          select: { transcriptId: true },
        });
        if (existing?.transcriptId) {
          await prisma.transcript.update({
            where: { id: existing.transcriptId },
            data: { text: b.transcriptText, confidence: b.transcriptConfidence ?? null, segments: b.transcriptSegments ?? [] },
          });
        }
      }
      await prisma.serviceRecord.update({ where: { id: rec.matchedServiceRecordId }, data: sr }).catch(() => {});
    }

    res.json({ ok: true });
  });

  return r;
}

// Auto-match logic
async function autoMatchRecording(recordingId: string): Promise<{ matched: boolean; scheduleId?: string; confidence?: number; reason?: string }> {
  const rec = await prisma.recording.findFirst({ where: { id: recordingId } });
  if (!rec) return { matched: false };

  // Find candidate schedules for this worker today (± 1 day)
  const recDate = toBeijingDate(rec.startedAt);
  const yesterday = new Date(rec.startedAt);
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(rec.startedAt);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const where: any = {
    serviceDate: { in: [toBeijingDate(yesterday), recDate, toBeijingDate(tomorrow)] },
    status: { in: ["scheduled", "assigned", "in_progress"] },
  };

  // If we know the worker, filter by their assignments
  // workerId might be a userId (from login) or a socialWorkerId — resolve both
  if (rec.workerId) {
    const sw = await prisma.socialWorker.findFirst({
      where: { OR: [{ id: rec.workerId }, { userId: rec.workerId }] },
      select: { id: true },
    });
    if (sw) {
      where.assignedSocialWorkerId = sw.id;
    } else {
      where.assignedSocialWorkerId = rec.workerId;
    }
  }

  const candidates = await prisma.serviceSchedule.findMany({
    where,
    include: { sopLinks: { select: { sopId: true, sopName: true } } },
  });
  if (candidates.length === 0) {
    await prisma.recording.update({ where: { id: recordingId }, data: { status: "unmatched" } });
    return { matched: false, reason: "no_candidates" };
  }

  const transcript = (rec.transcriptText ?? "").toLowerCase();
  const sopResults = rec.sopResults as any;
  const detectedServices = (sopResults?.service_project ?? "").split(",").map((s: string) => s.trim().toLowerCase()).filter(Boolean);

  let bestScore = 0;
  let bestCandidate: any = null;
  let bestReason = "";

  for (const c of candidates) {
    let score = 0;
    const reasons: string[] = [];

    // Time match: same day = +0.3, within 2 hours = +0.1
    if (c.serviceDate === recDate) {
      score += 0.3;
      reasons.push("同日");
      if (c.startTime) {
        const [h, m] = c.startTime.split(":").map(Number);
        const schedStart = new Date(rec.startedAt);
        schedStart.setHours(h, m, 0, 0);
        const diffMs = Math.abs(rec.startedAt.getTime() - schedStart.getTime());
        if (diffMs < 7200000) {
          score += 0.1;
          reasons.push("时间接近");
        }
      }
    }

    // Name match: +0.3
    if (c.serviceObjectName && transcript.includes(c.serviceObjectName.toLowerCase())) {
      score += 0.3;
      reasons.push(`提到${c.serviceObjectName}`);
    }

    // Service type match from schedule's service_project field: +0.2
    if (c.serviceProject && transcript.includes(c.serviceProject.toLowerCase())) {
      score += 0.2;
      reasons.push(`服务类型${c.serviceProject}`);
    }

    // SOP link match: compare schedule's linked SOPs with processor's detected services: +0.3
    const schedSopNames = ((c as any).sopLinks ?? []).map((l: any) => l.sopName.toLowerCase().replace(/sop$/i, "").trim());
    if (schedSopNames.length > 0 && detectedServices.length > 0) {
      const intersection = detectedServices.filter((ds: string) => schedSopNames.some((sn: string) => ds.includes(sn) || sn.includes(ds)));
      if (intersection.length > 0) {
        score += 0.3;
        reasons.push(`SOP匹配:${intersection.join(",")}`);
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestCandidate = c;
      bestReason = reasons.join(", ");
    }
  }

  if (bestScore >= 0.3 && bestCandidate) {
    // Create service record from this recording
    const expectedSops = ((bestCandidate as any).sopLinks ?? []).map((l: any) => ({ sopId: l.sopId, sopName: l.sopName }));
    const serviceRecordId = await createOrUpdateServiceRecord(rec, bestCandidate.serviceObjectId, bestCandidate.serviceObjectName, bestCandidate.id, expectedSops);

    await prisma.recording.update({
      where: { id: recordingId },
      data: {
        status: "matched",
        matchConfidence: bestScore,
        matchedScheduleId: bestCandidate.id,
        matchedServiceObjectId: bestCandidate.serviceObjectId,
        matchedServiceObjectName: bestCandidate.serviceObjectName,
        matchedServiceRecordId: serviceRecordId,
        matchReason: bestReason,
      },
    });

    // Mark schedule as completed
    await prisma.serviceSchedule.update({
      where: { id: bestCandidate.id },
      data: { serviceRecordId, status: "completed" as any },
    }).catch(() => {});

    return { matched: true, scheduleId: bestCandidate.id, confidence: bestScore, reason: bestReason };
  }

  // No schedule match — still create service record by matching elder from transcript
  let serviceObjectId: string | null = null;
  let serviceObjectName: string | null = null;

  // Try to match service object by name in transcript
  const allObjects = await prisma.serviceObject.findMany({ select: { id: true, name: true } });
  for (const obj of allObjects) {
    if (obj.name && transcript.includes(obj.name.toLowerCase())) {
      serviceObjectId = obj.id;
      serviceObjectName = obj.name;
      break;
    }
  }

  const serviceRecordId = await createOrUpdateServiceRecord(rec, serviceObjectId, serviceObjectName, null);

  await prisma.recording.update({
    where: { id: recordingId },
    data: {
      status: "matched",
      matchConfidence: bestScore,
      matchedServiceObjectId: serviceObjectId,
      matchedServiceObjectName: serviceObjectName,
      matchedServiceRecordId: serviceRecordId,
      matchReason: serviceObjectName ? `未匹配排班，识别到长者${serviceObjectName}` : "未匹配排班，自动创建服务记录",
    },
  });

  return { matched: true, scheduleId: undefined, confidence: bestScore, reason: serviceObjectName ? `识别到${serviceObjectName}` : "无排班自动创建" };
}

// Create or update service record from a recording
async function createOrUpdateServiceRecord(rec: any, serviceObjectId: string | null, serviceObjectName: string | null, scheduleId: string | null, expectedSops: Array<{sopId: string; sopName: string}> = []): Promise<string> {
  // Check if there's already a service record for this schedule (multi-recording aggregation)
  if (scheduleId) {
    const existingSched = await prisma.serviceSchedule.findFirst({ where: { id: scheduleId }, select: { serviceRecordId: true } });
    if (existingSched?.serviceRecordId) {
      // Aggregate: update existing service record
      const existingRec = await prisma.serviceRecord.findFirst({ where: { id: existingSched.serviceRecordId } });
      if (existingRec) {
        // Append transcript
        const existingTranscript = existingRec.transcriptId
          ? await prisma.transcript.findFirst({ where: { id: existingRec.transcriptId } })
          : null;
        if (existingTranscript) {
          const combinedText = [existingTranscript.text, rec.transcriptText].filter(Boolean).join("\n\n--- 录音分段 ---\n\n");
          const existingSegs = Array.isArray(existingTranscript.segments) ? existingTranscript.segments as any[] : [];
          const newSegs = Array.isArray(rec.transcriptSegments) ? rec.transcriptSegments as any[] : [];
          await prisma.transcript.update({
            where: { id: existingTranscript.id },
            data: { text: combinedText, segments: [...existingSegs, ...newSegs] },
          });
        }
        // Update duration
        const newDuration = (existingRec.durationMinutes ?? 0) + Math.round((rec.durationSeconds ?? 0) / 60);
        const sopResults = rec.sopResults ? JSON.stringify(rec.sopResults) : existingRec.structuredSummary;
        await prisma.serviceRecord.update({
          where: { id: existingRec.id },
          data: {
            durationMinutes: newDuration,
            endTime: rec.endedAt ? toBeijingTime(rec.endedAt) : existingRec.endTime,
            generatedSummary: rec.aiSummary ?? existingRec.generatedSummary,
            structuredSummary: sopResults,
          },
        });
        return existingRec.id;
      }
    }
  }

  // Create new service record
  const recordId = genId("sr");
  const transcriptId = genId("tx");
  const audioId = genId("aud");

  // Resolve names
  if (!serviceObjectName && serviceObjectId) {
    const obj = await prisma.serviceObject.findFirst({ where: { id: serviceObjectId }, select: { name: true } });
    if (obj) serviceObjectName = obj.name;
  }
  let workerName = rec.workerName;
  if (!workerName && rec.workerId) {
    const sw = await prisma.socialWorker.findFirst({ where: { OR: [{ id: rec.workerId }, { userId: rec.workerId }] }, select: { name: true } });
    if (sw) workerName = sw.name;
  }

  const sopResults = rec.sopResults as any;

  // Create service record FIRST (transcript and audio reference it via foreign key)
  await prisma.serviceRecord.create({
    data: {
      id: recordId,
      serviceDate: toBeijingDate(rec.startedAt),
      startTime: toBeijingTime(rec.startedAt),
      endTime: rec.endedAt ? toBeijingTime(rec.endedAt) : "",
      durationMinutes: Math.round((rec.durationSeconds ?? 0) / 60),
      badgeId: rec.badgeId,
      socialWorkerId: rec.workerId,
      socialWorkerName: workerName,
      serviceObjectId,
      serviceObjectName,
      serviceProject: sopResults?.service_project || null,
      assignmentConfidence: sopResults?.confidence ?? 0.5,
      reviewStatus: "needs_review",
      transcriptId,
      audioAssetId: audioId,
      generatedSummary: rec.aiSummary,
      structuredSummary: rec.sopResults ? JSON.stringify({ ...rec.sopResults, expectedSops }) : null,
      serviceExceptions: sopResults?.anomalies ?? [],
      serviceItems: sopResults?.service_items ?? [],
    },
  });

  // Create transcript and audio asset (after service record for FK)
  await prisma.transcript.create({
    data: { id: transcriptId, recordId, language: "zh-CN", text: rec.transcriptText ?? "", confidence: rec.transcriptConfidence, segments: rec.transcriptSegments ?? [] },
  });

  await prisma.audioAsset.create({
    data: { id: audioId, recordId, playbackUrl: rec.audioUrl, durationSeconds: rec.durationSeconds ?? 0, capturedByBadgeId: rec.badgeId, uploadedAt: new Date().toISOString() },
  });

  // Update badge
  const badge = await prisma.smartBadge.findFirst({ where: { OR: [{ deviceCode: rec.badgeId }, { id: rec.badgeId }] } });
  if (badge) {
    const ids = Array.isArray(badge.recentServiceRecordIds) ? (badge.recentServiceRecordIds as string[]) : [];
    ids.unshift(recordId);
    await prisma.smartBadge.update({ where: { id: badge.id }, data: { recentServiceRecordIds: ids.slice(0, 10), lastRecordingAt: new Date().toISOString() } });
  }

  return recordId;
}
