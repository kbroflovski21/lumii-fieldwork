import { Router } from "express";
import { prisma } from "../db/prisma";
import { genId, withOperationalState, resolveSiteId } from "./helpers";
import { generateDates } from "../lib/cadenceRule";

function toApi(row: any) {
  if (!row) return row;
  return {
    id: row.id, source: row.source, servicePlanId: row.servicePlanId,
    serviceObjectId: row.serviceObjectId, serviceObjectName: row.serviceObjectName,
    serviceProject: row.serviceProject, addressSnapshot: row.addressSnapshot, address: row.address,
    mapDisplayPoint: row.mapDisplayPoint, serviceDate: row.serviceDate,
    startTime: row.startTime, endTime: row.endTime, timeWindow: row.timeWindow,
    assignedSocialWorkerId: row.assignedSocialWorkerId, assignedSocialWorkerName: row.assignedSocialWorkerName,
    status: row.status, notes: row.notes, serviceRecordId: row.serviceRecordId,
    planExceptionApplied: !!row.planExceptionApplied, riskTags: row.riskTags,
    adjustmentHistory: row.adjustmentHistory,
  };
}

function computeProjectedOccurrences(
  plans: any[],
  rangeStart: string,
  rangeEnd: string,
  existingDates: Set<string>
) {
  const projected: any[] = [];
  for (const plan of plans) {
    if (plan.status !== "active" || !plan.cadenceRule) continue;
    const effectiveStart = rangeStart > plan.startDate ? rangeStart : plan.startDate;
    const dates = generateDates(
      plan.cadenceRule,
      effectiveStart,
      Math.ceil((new Date(rangeEnd).getTime() - new Date(effectiveStart).getTime()) / 86400000)
    );
    const tw = plan.preferredTimeWindow ?? {};
    const planSops = (plan.sopLinks ?? []).map((s: any) => ({ sopId: s.sopId, sopName: s.sopName }));
    for (const date of dates) {
      const key = `${plan.id}:${date}`;
      if (existingDates.has(key)) continue;
      projected.push({
        id: `projected-${plan.id}-${date}`,
        source: "projected",
        servicePlanId: plan.id,
        serviceObjectId: plan.serviceObjectId,
        serviceObjectName: plan.serviceObject?.name ?? "",
        serviceProject: plan.serviceProject,
        addressSnapshot: plan.serviceObject?.address ?? "",
        address: plan.serviceObject?.address ?? null,
        mapDisplayPoint: plan.serviceObject?.mapDisplayPoint ?? null,
        serviceDate: date,
        startTime: tw.start ?? null,
        endTime: tw.end ?? null,
        timeWindow: tw,
        assignedSocialWorkerId: plan.primarySocialWorkerId,
        assignedSocialWorkerName: plan.primarySocialWorkerName,
        status: "scheduled",
        riskTags: plan.serviceObject?.riskTags ?? [],
        siteId: plan.serviceObject?.siteId ?? "site-001",
        sopLinks: planSops,
      });
    }
  }
  return projected;
}

export function serviceSchedulesRoutes() {
  const r = Router();

  r.get("/service-schedule-occurrences", async (req, res) => {
    const siteId = resolveSiteId(req);
    const workerId = req.query.workerId as string | undefined;
    const userId = req.query.userId as string | undefined;

    const where: any = {};
    if (siteId) where.siteId = siteId;

    if (workerId) {
      where.assignedSocialWorkerId = workerId;
    } else if (userId) {
      const sw = await prisma.socialWorker.findFirst({ where: { userId }, select: { id: true } });
      if (sw) where.assignedSocialWorkerId = sw.id;
    }

    const rows = await prisma.serviceSchedule.findMany({
      where,
      orderBy: { serviceDate: "asc" },
      include: { sopLinks: { select: { sopId: true, sopName: true } } },
    });

    const serviceObjectIds = [...new Set(rows.map((r: any) => r.serviceObjectId).filter(Boolean))];
    const objects = serviceObjectIds.length > 0
      ? await prisma.serviceObject.findMany({ where: { id: { in: serviceObjectIds } }, select: { id: true, careNotes: true, riskTags: true, serviceProjects: true, phone: true, age: true } })
      : [];
    const objMap = Object.fromEntries(objects.map((o: any) => [o.id, o]));

    const enriched = rows.map((r: any) => ({
      ...toApi(r),
      sopLinks: r.sopLinks ?? [],
      serviceObjectContext: objMap[r.serviceObjectId] ?? null,
    }));

    // Dynamic occurrence computation for date ranges beyond DB window
    const rangeStart = req.query.rangeStart as string | undefined;
    const rangeEnd = req.query.rangeEnd as string | undefined;
    let projected: any[] = [];
    if (rangeStart && rangeEnd) {
      const plans = await prisma.servicePlan.findMany({
        where: { status: "active", ...(siteId ? { serviceObject: { siteId } } : {}) },
        include: {
          sopLinks: { select: { sopId: true, sopName: true } },
          serviceObject: { select: { name: true, address: true, siteId: true, mapDisplayPoint: true, riskTags: true } },
        },
      });
      const existingKeys = new Set(rows.map((r: any) => `${r.servicePlanId}:${r.serviceDate}`));
      projected = computeProjectedOccurrences(plans, rangeStart, rangeEnd, existingKeys);
    }

    const allSchedules = [...enriched, ...projected].sort((a, b) => a.serviceDate.localeCompare(b.serviceDate));

    res.json(withOperationalState({ serviceSchedules: allSchedules }));
  });

  r.get("/service-schedule-occurrences/:id", async (req, res) => {
    const row = await prisma.serviceSchedule.findFirst({ where: { id: req.params.id } });
    if (!row) return res.status(404).json({ error: "not found" });
    res.json(toApi(row));
  });

  r.post("/service-schedule-occurrences", async (req, res) => {
    const id = genId("schedule");
    const b = req.body;
    // Look up service object name
    let objName = "";
    let addr = "";
    let mapPoint: any = null;
    if (b.serviceObjectId) {
      const obj = await prisma.serviceObject.findFirst({
        where: { id: b.serviceObjectId },
        select: { name: true, address: true, mapDisplayPoint: true },
      });
      if (obj) { objName = obj.name; addr = obj.address; mapPoint = obj.mapDisplayPoint; }
    }
    const newStatus = b.assignedSocialWorkerId ? "scheduled" : "unassigned";
    await prisma.serviceSchedule.create({
      data: {
        id,
        source: "one_time",
        serviceObjectId: b.serviceObjectId ?? "",
        siteId: b.siteId ?? "site-001",
        serviceObjectName: objName,
        serviceProject: b.serviceProject ?? "",
        addressSnapshot: addr,
        address: addr,
        mapDisplayPoint: mapPoint ?? undefined,
        serviceDate: b.serviceDate ?? "",
        startTime: b.timeWindow?.start ?? "",
        endTime: b.timeWindow?.end ?? "",
        timeWindow: b.timeWindow ?? {},
        assignedSocialWorkerId: b.assignedSocialWorkerId ?? null,
        status: newStatus as any,
        riskTags: [],
      },
    });
    const row = await prisma.serviceSchedule.findFirst({ where: { id } });
    res.json({ ok: true, id, message: "created", serviceSchedule: toApi(row) });
  });

  r.patch("/service-schedule-occurrences/:id", async (req, res) => {
    const b = req.body;
    const data: any = {};
    if (b.serviceDate !== undefined) data.serviceDate = b.serviceDate;
    if (b.timeWindow !== undefined) {
      data.timeWindow = b.timeWindow;
      data.startTime = b.timeWindow.start ?? "";
      data.endTime = b.timeWindow.end ?? "";
    }
    if (b.assignedSocialWorkerId !== undefined) {
      data.assignedSocialWorkerId = b.assignedSocialWorkerId;
      if (b.assignedSocialWorkerId) {
        const worker = await prisma.socialWorker.findFirst({
          where: { id: b.assignedSocialWorkerId },
          select: { name: true },
        });
        data.assignedSocialWorkerName = worker?.name ?? null;
        data.status = "scheduled";
      } else {
        data.assignedSocialWorkerName = null;
      }
    }
    if (b.status !== undefined) data.status = b.status;
    if (b.notes !== undefined) data.notes = b.notes;

    // Record adjustment history
    let historyEntry: any = null;
    if (b.serviceDate !== undefined || b.timeWindow !== undefined) {
      historyEntry = { action: "调整时间", detail: `${b.serviceDate ?? ""} ${b.timeWindow?.label ?? ""}`, operatorName: "站点运营", adjustedAt: new Date().toISOString() };
    } else if (b.assignedSocialWorkerId !== undefined) {
      const workerName = b.assignedSocialWorkerId
        ? (await prisma.socialWorker.findFirst({ where: { id: b.assignedSocialWorkerId }, select: { name: true } }))?.name ?? ""
        : "取消分配";
      historyEntry = { action: "调整服务人员", detail: workerName, operatorName: "站点运营", adjustedAt: new Date().toISOString() };
    } else if (b.status === "cancelled") {
      historyEntry = { action: "取消排期", detail: b.notes ?? "", operatorName: "站点运营", adjustedAt: new Date().toISOString() };
    }
    if (historyEntry) {
      const existing = await prisma.serviceSchedule.findFirst({
        where: { id: req.params.id },
        select: { adjustmentHistory: true },
      });
      const history = Array.isArray(existing?.adjustmentHistory) ? [...(existing!.adjustmentHistory as any[])] : [];
      history.push(historyEntry);
      data.adjustmentHistory = history;
    }

    if (Object.keys(data).length > 0) {
      await prisma.serviceSchedule.update({ where: { id: req.params.id }, data });
    }
    const row = await prisma.serviceSchedule.findFirst({ where: { id: req.params.id } });
    res.json({ ok: true, id: req.params.id, message: "updated", serviceSchedule: toApi(row) });
  });

  return r;
}
