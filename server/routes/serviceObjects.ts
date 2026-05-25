import { Router } from "express";
import { prisma } from "../db/prisma";
import { genId, withOperationalState, resolveSiteId } from "./helpers";

function isValidIdNumber(id: string): boolean {
  return /^\d{17}[\dXx]$/.test(id);
}

function toApi(row: any, familyContacts: any[] = [], planSummaries: any[] = []) {
  if (!row) return row;
  return {
    id: row.id, name: row.name, phone: row.phone, idNumber: row.idNumber, age: row.age, gender: row.gender,
    address: row.address, mapDisplayPoint: row.mapDisplayPoint,
    eligibilityType: row.eligibilityType, serviceProjects: row.serviceProjects,
    careNotes: row.careNotes,
    riskTags: row.riskTags, familySubscriptionSummary: row.familySubscriptionSummary,
    latestInsightSummary: row.latestInsightSummary, insightSummaries: row.insightSummaries,
    servicePlanSummaries: planSummaries, familyContacts, state: row.state,
  };
}

async function getPlanSummaries(objectId: string) {
  const plans = await prisma.servicePlan.findMany({ where: { serviceObjectId: objectId } });
  const summaries = [];
  for (const p of plans) {
    const exCount = await prisma.servicePlanException.count({ where: { servicePlanId: p.id } });
    summaries.push({
      id: p.id, serviceObjectId: p.serviceObjectId, serviceProject: p.serviceProject,
      cadenceLabel: p.cadenceLabel, preferredTimeWindow: p.preferredTimeWindow,
      primarySocialWorkerId: p.primarySocialWorkerId, primarySocialWorkerName: p.primarySocialWorkerName,
      status: p.status, activeExceptionCount: exCount,
    });
  }
  return summaries;
}

async function getFamilyContacts(objectId: string) {
  const contacts = await prisma.familyContact.findMany({ where: { serviceObjectId: objectId } });
  return contacts.map((c) => ({
    id: c.id, name: c.name, relation: c.relation, phone: c.phone, wechatId: c.wechatId,
    subscriptionStatus: c.subscriptionStatus, lastPushedAt: c.lastPushedAt,
  }));
}

export function serviceObjectsRoutes() {
  const r = Router();

  r.get("/service-objects", async (req, res) => {
    const siteId = resolveSiteId(req);
    const where = siteId ? { siteId } : {};
    const rows = await prisma.serviceObject.findMany({ where, orderBy: { createdAt: "desc" } });
    const objectIds = rows.map((r) => r.id);
    const plans = await prisma.servicePlan.findMany({
      where: objectIds.length > 0 ? { serviceObjectId: { in: objectIds } } : undefined,
      include: { exceptions: true },
    });

    const objects = [];
    for (const row of rows) {
      objects.push(toApi(row, await getFamilyContacts(row.id), await getPlanSummaries(row.id)));
    }

    res.json(withOperationalState({
      serviceObjects: objects,
      servicePlans: plans.map((p) => ({
        ...p,
        preferredTimeWindow: p.preferredTimeWindow,
        exceptions: p.exceptions.map((e) => ({
          id: e.id, servicePlanId: e.servicePlanId, kind: e.kind,
          effectiveFrom: e.effectiveFrom, effectiveTo: e.effectiveTo,
          timeWindow: e.timeWindow, replacementSocialWorkerId: e.replacementSocialWorkerId, note: e.note,
        })),
      })),
    }));
  });

  r.post("/service-objects", async (req, res) => {
    const id = genId("object");
    const b = req.body;
    if (!b.idNumber) { res.status(400).json({ error: "身份证号为必填" }); return; }
    if (!isValidIdNumber(b.idNumber)) { res.status(400).json({ error: "身份证号格式不正确" }); return; }
    await prisma.serviceObject.create({
      data: {
        id,
        name: b.name,
        phone: b.phone ?? null,
        siteId: b.siteId ?? "site-001",
        idNumber: b.idNumber,
        age: b.age ?? null,
        gender: b.gender ?? "unknown",
        address: b.address ?? "",
        mapDisplayPoint: b.mapDisplayPoint ?? undefined,
        eligibilityType: b.eligibilityType ?? "government",
        serviceProjects: b.serviceProjects ?? [],
        careNotes: b.careNotes ?? [],
        riskTags: b.riskTags ?? [],
        state: "normal",
      },
    });
    const row = await prisma.serviceObject.findFirst({ where: { id } });
    res.json({ ok: true, id, message: "created", serviceObject: toApi(row) });
  });

  r.patch("/service-objects/:id", async (req, res) => {
    const b = req.body;
    const data: any = {};
    if (b.idNumber !== undefined && b.idNumber && !isValidIdNumber(b.idNumber)) { res.status(400).json({ error: "身份证号格式不正确" }); return; }
    const fields: Record<string, string> = { name: "name", phone: "phone", idNumber: "idNumber", age: "age", gender: "gender", address: "address", eligibilityType: "eligibilityType" };
    for (const [api, col] of Object.entries(fields)) {
      if (b[api] !== undefined) data[col] = b[api];
    }
    const jsonFields: Record<string, string> = { serviceProjects: "serviceProjects", careNotes: "careNotes", riskTags: "riskTags" };
    for (const [api, col] of Object.entries(jsonFields)) {
      if (b[api] !== undefined) data[col] = b[api];
    }
    if (b.mapDisplayPoint !== undefined) data.mapDisplayPoint = b.mapDisplayPoint;
    if (Object.keys(data).length > 0) {
      await prisma.serviceObject.update({ where: { id: req.params.id }, data });
    }
    const row = await prisma.serviceObject.findFirst({ where: { id: req.params.id } });
    res.json({ ok: true, id: req.params.id, message: "updated", serviceObject: toApi(row!, await getFamilyContacts(req.params.id), await getPlanSummaries(req.params.id)) });
  });

  r.post("/service-objects/:id/archive", async (req, res) => {
    await prisma.serviceObject.update({ where: { id: req.params.id }, data: { state: "archived" } });
    res.json({ ok: true, id: req.params.id, message: "archived" });
  });

  r.get("/service-objects/:id/insights", async (req, res) => {
    const row = await prisma.serviceObject.findFirst({ where: { id: req.params.id } });
    if (!row) return res.status(404).json({ error: "not found" });
    res.json(toApi(row, await getFamilyContacts(req.params.id), await getPlanSummaries(req.params.id)));
  });

  r.delete("/family-contacts/:id", async (req, res) => {
    const contact = await prisma.familyContact.findFirst({ where: { id: req.params.id } });
    if (!contact) { res.status(404).json({ error: "联系人不存在" }); return; }
    await prisma.familyContact.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  });

  r.post("/service-objects/:id/family-contacts", async (req, res) => {
    const b = req.body;
    if (!b.name) { res.status(400).json({ error: "姓名为必填" }); return; }
    const contact = await prisma.familyContact.create({
      data: {
        id: genId("family"),
        serviceObjectId: req.params.id,
        name: b.name,
        relation: b.relation ?? "",
        phone: b.phone ?? "",
        wechatId: b.wechatId ?? null,
      },
    });
    res.status(201).json(contact);
  });

  r.patch("/family-contacts/:id", async (req, res) => {
    const b = req.body;
    const data: any = {};
    if (b.name !== undefined) data.name = b.name;
    if (b.relation !== undefined) data.relation = b.relation;
    if (b.phone !== undefined) data.phone = b.phone;
    if (b.wechatId !== undefined) data.wechatId = b.wechatId;
    if (Object.keys(data).length > 0) {
      await prisma.familyContact.update({ where: { id: req.params.id }, data });
    }
    res.json({ ok: true });
  });

  r.put("/service-objects/:id/family-subscriptions", async (req, res) => {
    res.json({ ok: true, id: req.params.id, message: "updated" });
  });

  r.get("/service-objects/:id/service-plans", async (req, res) => {
    const plans = await prisma.servicePlan.findMany({
      where: { serviceObjectId: req.params.id },
      include: {
        exceptions: true,
        sopLinks: { select: { sopId: true, sopName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ servicePlans: plans });
  });

  r.post("/service-objects/:id/service-plans", async (req, res) => {
    const id = genId("plan");
    const b = req.body;
    const serviceObjectId = req.params.id;

    // 1. Create ServicePlan
    await prisma.servicePlan.create({
      data: {
        id,
        serviceObjectId,
        serviceProject: b.serviceProject ?? "长护险",
        cadenceRule: b.cadenceRule ?? "",
        cadenceLabel: b.cadenceLabel ?? "",
        preferredTimeWindow: b.preferredTimeWindow ?? {},
        startDate: b.startDate ?? new Date().toISOString().slice(0, 10),
        primarySocialWorkerId: b.primarySocialWorkerId ?? null,
        primarySocialWorkerName: b.primarySocialWorkerName ?? null,
        description: b.description ?? null,
        status: "active",
      },
    });

    // 2. Create plan-level SOP associations
    const sopIds: string[] = b.sopIds ?? [];
    if (sopIds.length > 0) {
      const sops = await prisma.sop.findMany({ where: { id: { in: sopIds } }, select: { id: true, name: true } });
      await prisma.servicePlanSop.createMany({
        data: sops.map(s => ({ planId: id, sopId: s.id, sopName: s.name })),
      });
    }

    // 3. Batch-generate 4 weeks of ServiceSchedule
    if (b.cadenceRule) {
      const { generateDates } = await import("../lib/cadenceRule");
      const obj = await prisma.serviceObject.findFirst({ where: { id: serviceObjectId }, select: { name: true, address: true, siteId: true, mapDisplayPoint: true, riskTags: true } });
      const dates = generateDates(b.cadenceRule, b.startDate ?? new Date().toISOString().slice(0, 10), 28);
      const tw = b.preferredTimeWindow ?? {};
      const scheduleData = dates.map(date => ({
        id: genId("schedule"),
        source: "service_plan" as const,
        servicePlanId: id,
        serviceObjectId,
        siteId: obj?.siteId ?? "site-001",
        serviceObjectName: obj?.name ?? "",
        serviceProject: b.serviceProject ?? "长护险",
        addressSnapshot: obj?.address ?? "",
        address: obj?.address ?? null,
        mapDisplayPoint: obj?.mapDisplayPoint ?? undefined,
        serviceDate: date,
        startTime: tw.start ?? null,
        endTime: tw.end ?? null,
        timeWindow: tw,
        assignedSocialWorkerId: b.primarySocialWorkerId ?? null,
        assignedSocialWorkerName: b.primarySocialWorkerName ?? null,
        status: (b.primarySocialWorkerId ? "scheduled" : "unassigned") as any,
        riskTags: obj?.riskTags ?? [],
      }));
      await prisma.serviceSchedule.createMany({ data: scheduleData });

      // 4. Copy plan SOPs to each schedule
      if (sopIds.length > 0) {
        const planSops = await prisma.servicePlanSop.findMany({ where: { planId: id } });
        const scheduleSopData = scheduleData.flatMap(sch =>
          planSops.map(ps => ({ scheduleId: sch.id, sopId: ps.sopId, sopName: ps.sopName }))
        );
        await prisma.serviceScheduleSop.createMany({ data: scheduleSopData });
      }
    }

    const row = await prisma.servicePlan.findFirst({
      where: { id },
      include: { sopLinks: { select: { sopId: true, sopName: true } } },
    });
    res.json(row);
  });

  r.post("/service-plans/:id/cancel", async (req, res) => {
    const planId = req.params.id;
    const today = new Date().toISOString().slice(0, 10);

    await prisma.servicePlan.update({
      where: { id: planId },
      data: { status: "archived" },
    });

    await prisma.serviceSchedule.updateMany({
      where: {
        servicePlanId: planId,
        serviceDate: { gte: today },
        status: { notIn: ["completed", "cancelled", "suspended"] },
      },
      data: { status: "suspended" },
    });

    res.json({ ok: true });
  });

  r.post("/service-plans/:id/reactivate", async (req, res) => {
    const planId = req.params.id;
    const plan = await prisma.servicePlan.findFirst({ where: { id: planId } });
    if (!plan) { res.status(404).json({ error: "not found" }); return; }

    await prisma.servicePlan.update({ where: { id: planId }, data: { status: "active" } });

    const today = new Date().toISOString().slice(0, 10);
    const newStatus = plan.primarySocialWorkerId ? "scheduled" : "unassigned";
    await prisma.serviceSchedule.updateMany({
      where: { servicePlanId: planId, serviceDate: { gte: today }, status: "suspended" },
      data: { status: newStatus as any },
    });

    const { generateDates } = await import("../lib/cadenceRule");
    const obj = await prisma.serviceObject.findFirst({
      where: { id: plan.serviceObjectId },
      select: { name: true, address: true, siteId: true, mapDisplayPoint: true, riskTags: true },
    });
    const tw = plan.preferredTimeWindow as any;
    const dates = generateDates(plan.cadenceRule, today, 28);
    const existing = new Set(
      (await prisma.serviceSchedule.findMany({
        where: { servicePlanId: planId, serviceDate: { gte: today }, status: { notIn: ["cancelled"] } },
        select: { serviceDate: true },
      })).map(s => s.serviceDate)
    );
    const newDates = dates.filter(d => !existing.has(d));
    if (newDates.length > 0) {
      const scheduleData = newDates.map(date => ({
        id: genId("schedule"),
        source: "service_plan" as const,
        servicePlanId: planId,
        serviceObjectId: plan.serviceObjectId,
        siteId: obj?.siteId ?? "site-001",
        serviceObjectName: obj?.name ?? "",
        serviceProject: plan.serviceProject,
        addressSnapshot: obj?.address ?? "",
        address: obj?.address ?? null,
        mapDisplayPoint: obj?.mapDisplayPoint ?? null,
        serviceDate: date,
        startTime: tw?.start ?? null,
        endTime: tw?.end ?? null,
        timeWindow: tw ?? {},
        assignedSocialWorkerId: plan.primarySocialWorkerId,
        assignedSocialWorkerName: plan.primarySocialWorkerName,
        status: (plan.primarySocialWorkerId ? "scheduled" : "unassigned") as any,
        riskTags: obj?.riskTags ?? [],
      }));
      await prisma.serviceSchedule.createMany({ data: scheduleData });
      const planSops = await prisma.servicePlanSop.findMany({ where: { planId } });
      if (planSops.length > 0) {
        const sopData = scheduleData.flatMap(sch =>
          planSops.map(ps => ({ scheduleId: sch.id, sopId: ps.sopId, sopName: ps.sopName }))
        );
        await prisma.serviceScheduleSop.createMany({ data: sopData });
      }
    }
    res.json({ ok: true });
  });

  r.delete("/service-plans/:id", async (req, res) => {
    const planId = req.params.id;
    const today = new Date().toISOString().slice(0, 10);
    const futureSchedules = await prisma.serviceSchedule.findMany({
      where: { servicePlanId: planId, serviceDate: { gte: today }, status: { notIn: ["completed"] } },
      select: { id: true },
    });
    const futureIds = futureSchedules.map(s => s.id);
    if (futureIds.length > 0) {
      await prisma.serviceScheduleSop.deleteMany({ where: { scheduleId: { in: futureIds } } });
      await prisma.serviceSchedule.deleteMany({ where: { id: { in: futureIds } } });
    }
    await prisma.servicePlanSop.deleteMany({ where: { planId } });
    await prisma.servicePlanException.deleteMany({ where: { servicePlanId: planId } });
    await prisma.servicePlan.delete({ where: { id: planId } });
    res.json({ ok: true });
  });

  r.patch("/service-plans/:id", async (req, res) => {
    const planId = req.params.id;
    const { description, sopIds, cadenceRule, cadenceLabel, preferredTimeWindow, primarySocialWorkerId, primarySocialWorkerName } = req.body;
    const today = new Date().toISOString().slice(0, 10);

    const plan = await prisma.servicePlan.findFirst({ where: { id: planId } });
    if (!plan) { res.status(404).json({ error: "plan not found" }); return; }

    // 1. Update plan fields
    const updateData: any = {};
    if (description !== undefined) updateData.description = description;
    if (cadenceRule !== undefined) updateData.cadenceRule = cadenceRule;
    if (cadenceLabel !== undefined) updateData.cadenceLabel = cadenceLabel;
    if (preferredTimeWindow !== undefined) updateData.preferredTimeWindow = preferredTimeWindow;
    if (primarySocialWorkerId !== undefined) updateData.primarySocialWorkerId = primarySocialWorkerId;
    if (primarySocialWorkerName !== undefined) updateData.primarySocialWorkerName = primarySocialWorkerName;
    if (Object.keys(updateData).length > 0) {
      await prisma.servicePlan.update({ where: { id: planId }, data: updateData });
    }

    // 1b. Propagate worker changes to future schedules
    if (primarySocialWorkerId !== undefined) {
      const workerName = primarySocialWorkerName ?? null;
      await prisma.serviceSchedule.updateMany({
        where: {
          servicePlanId: planId,
          serviceDate: { gte: today },
          status: { notIn: ["completed", "cancelled", "suspended"] },
        },
        data: {
          assignedSocialWorkerId: primarySocialWorkerId || null,
          assignedSocialWorkerName: workerName,
          status: primarySocialWorkerId ? "scheduled" : "unassigned",
        },
      });
    }

    // 2. Update plan-level SOPs if provided
    if (Array.isArray(sopIds)) {
      await prisma.servicePlanSop.deleteMany({ where: { planId } });
      if (sopIds.length > 0) {
        const sops = await prisma.sop.findMany({ where: { id: { in: sopIds } }, select: { id: true, name: true } });
        await prisma.servicePlanSop.createMany({
          data: sops.map(s => ({ planId, sopId: s.id, sopName: s.name })),
        });

        // 3. Update all future schedule SOPs
        const futureSchedules = await prisma.serviceSchedule.findMany({
          where: { servicePlanId: planId, serviceDate: { gte: today }, status: { notIn: ["completed", "cancelled", "suspended"] } },
          select: { id: true },
        });
        if (futureSchedules.length > 0) {
          const scheduleIds = futureSchedules.map(s => s.id);
          await prisma.serviceScheduleSop.deleteMany({ where: { scheduleId: { in: scheduleIds } } });
          const newSopData = scheduleIds.flatMap(schId =>
            sops.map(s => ({ scheduleId: schId, sopId: s.id, sopName: s.name }))
          );
          await prisma.serviceScheduleSop.createMany({ data: newSopData });
        }
      }
    }

    // 4. If cadenceRule changed, cancel future schedules and regenerate
    if (cadenceRule !== undefined && cadenceRule !== plan.cadenceRule) {
      await prisma.serviceSchedule.updateMany({
        where: { servicePlanId: planId, serviceDate: { gte: today }, status: { notIn: ["completed", "cancelled", "suspended"] } },
        data: { status: "cancelled" },
      });

      if (cadenceRule) {
        const { generateDates } = await import("../lib/cadenceRule");
        const obj = await prisma.serviceObject.findFirst({
          where: { id: plan.serviceObjectId },
          select: { name: true, address: true, siteId: true, mapDisplayPoint: true, riskTags: true },
        });
        const tw = preferredTimeWindow ?? plan.preferredTimeWindow as any;
        const dates = generateDates(cadenceRule, today, 28);
        const scheduleData = dates.map(date => ({
          id: genId("schedule"),
          source: "service_plan" as const,
          servicePlanId: planId,
          serviceObjectId: plan.serviceObjectId,
          siteId: obj?.siteId ?? "site-001",
          serviceObjectName: obj?.name ?? "",
          serviceProject: plan.serviceProject,
          addressSnapshot: obj?.address ?? "",
          address: obj?.address ?? null,
          mapDisplayPoint: obj?.mapDisplayPoint ?? undefined,
          serviceDate: date,
          startTime: tw?.start ?? null,
          endTime: tw?.end ?? null,
          timeWindow: tw ?? {},
          assignedSocialWorkerId: plan.primarySocialWorkerId,
          assignedSocialWorkerName: plan.primarySocialWorkerName,
          status: (b.primarySocialWorkerId ? "scheduled" : "unassigned") as any,
          riskTags: obj?.riskTags ?? [],
        }));
        await prisma.serviceSchedule.createMany({ data: scheduleData });

        const planSops = await prisma.servicePlanSop.findMany({ where: { planId } });
        if (planSops.length > 0) {
          const sopData = scheduleData.flatMap(sch =>
            planSops.map(ps => ({ scheduleId: sch.id, sopId: ps.sopId, sopName: ps.sopName }))
          );
          await prisma.serviceScheduleSop.createMany({ data: sopData });
        }
      }
    }

    const updated = await prisma.servicePlan.findFirst({
      where: { id: planId },
      include: { sopLinks: { select: { sopId: true, sopName: true } } },
    });
    res.json(updated);
  });

  r.post("/service-plans/:id/exceptions", async (req, res) => {
    const id = genId("exception");
    const b = req.body;
    await prisma.servicePlanException.create({
      data: {
        id,
        servicePlanId: req.params.id,
        kind: b.kind,
        effectiveFrom: b.effectiveFrom,
        effectiveTo: b.effectiveTo ?? null,
        timeWindow: b.timeWindow ?? undefined,
        replacementSocialWorkerId: b.replacementSocialWorkerId ?? null,
        note: b.note ?? null,
      },
    });
    const plan = await prisma.servicePlan.findFirst({ where: { id: req.params.id } });
    res.json(plan);
  });

  return r;
}
