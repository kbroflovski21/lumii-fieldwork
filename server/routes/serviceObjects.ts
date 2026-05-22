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
    serviceFrequency: row.serviceFrequency, careNotes: row.careNotes,
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
        serviceFrequency: b.serviceFrequency ?? null,
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
    const fields: Record<string, string> = { name: "name", phone: "phone", idNumber: "idNumber", age: "age", gender: "gender", address: "address", eligibilityType: "eligibilityType", serviceFrequency: "serviceFrequency" };
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
    const plans = await prisma.servicePlan.findMany({ where: { serviceObjectId: req.params.id } });
    res.json(plans);
  });

  r.post("/service-objects/:id/service-plans", async (req, res) => {
    const id = genId("plan");
    const b = req.body;
    await prisma.servicePlan.create({
      data: {
        id,
        serviceObjectId: req.params.id,
        serviceProject: b.serviceProject ?? "",
        cadenceRule: b.cadenceRule ?? "",
        cadenceLabel: b.cadenceLabel ?? "",
        preferredTimeWindow: b.preferredTimeWindow ?? {},
        startDate: b.startDate ?? new Date().toISOString().slice(0, 10),
        primarySocialWorkerId: b.primarySocialWorkerId ?? null,
        status: "active",
      },
    });
    const row = await prisma.servicePlan.findFirst({ where: { id } });
    res.json(row);
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
