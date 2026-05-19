import { Router } from "express";
import { prisma } from "../db/prisma";
import { genId, withOperationalState } from "./helpers";

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

export function serviceSchedulesRoutes() {
  const r = Router();

  r.get("/service-schedule-occurrences", async (_req, res) => {
    const rows = await prisma.serviceSchedule.findMany({ orderBy: { serviceDate: "asc" } });
    res.json(withOperationalState({ serviceSchedules: rows.map(toApi) }));
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
