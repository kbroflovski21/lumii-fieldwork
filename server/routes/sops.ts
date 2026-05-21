import { Router } from "express";
import { randomUUID } from "crypto";
import { prisma } from "../db/prisma";

function genId(prefix: string) {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

export function sopRoutes() {
  const r = Router();

  // List all SOPs with steps
  r.get("/sops", async (_req, res) => {
    const sops = await prisma.sop.findMany({
      where: { status: "active" },
      include: { steps: { orderBy: { sortOrder: "asc" } } },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });
    res.json({ sops });
  });

  // Get single SOP
  r.get("/sops/:id", async (req, res) => {
    const sop = await prisma.sop.findFirst({
      where: { id: req.params.id },
      include: { steps: { orderBy: { sortOrder: "asc" } } },
    });
    if (!sop) return res.status(404).json({ error: "not found" });
    res.json(sop);
  });

  // Create SOP (org_admin only - enforced by middleware on mount)
  r.post("/sops", async (req, res) => {
    const b = req.body;
    if (!b.name) return res.status(400).json({ error: "name required" });

    const id = genId("sop");
    const sop = await prisma.sop.create({
      data: {
        id,
        name: b.name,
        type: (b.type as any) ?? "service",
        description: b.description ?? null,
        keywords: b.keywords ?? [],
        exampleDialogue: b.exampleDialogue ?? null,
        sopContent: b.sopContent ?? null,
        sopSource: b.sopSource ?? "manual",
        sopVersion: b.sopVersion ?? 1,
        sopHistory: b.sopHistory ?? [{ version: 1, date: new Date().toISOString().slice(0, 10), summary: "初始版本" }],
        supervisionContent: b.supervisionContent ?? null,
        supervisionSource: b.supervisionSource ?? "ai_generated",
        supervisionVersion: b.supervisionVersion ?? 0,
        supervisionHistory: b.supervisionHistory ?? [],
        reportContent: b.reportContent ?? null,
        reportSource: b.reportSource ?? "ai_generated",
        reportVersion: b.reportVersion ?? 0,
        reportHistory: b.reportHistory ?? [],
        orgId: "org-001",
        steps: {
          create: (b.steps ?? []).map((s: any, i: number) => ({
            id: genId("step"),
            sortOrder: i + 1,
            name: s.name ?? "",
            description: s.description ?? "",
            required: s.required !== false,
          })),
        },
      },
      include: { steps: { orderBy: { sortOrder: "asc" } } },
    });
    res.status(201).json(sop);
  });

  // Update SOP (full replace of steps)
  r.patch("/sops/:id", async (req, res) => {
    const b = req.body;
    const existing = await prisma.sop.findFirst({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "not found" });

    const data: any = { version: existing.version + 1 };
    if (b.name !== undefined) data.name = b.name;
    if (b.type !== undefined) data.type = b.type;
    if (b.description !== undefined) data.description = b.description;
    if (b.keywords !== undefined) data.keywords = b.keywords;
    if (b.exampleDialogue !== undefined) data.exampleDialogue = b.exampleDialogue;

    // Handle SOP document updates
    if (b.sopContent !== undefined) {
      data.sopContent = b.sopContent;
      data.sopSource = b.sopSource ?? existing.sopSource ?? "manual";
      data.sopVersion = (existing.sopVersion ?? 0) + 1;
      const history = Array.isArray(existing.sopHistory) ? [...(existing.sopHistory as any[])] : [];
      history.push({ version: data.sopVersion, date: new Date().toISOString().slice(0, 10), summary: b.sopChangeSummary ?? "内容更新" });
      data.sopHistory = history;
    }
    if (b.supervisionContent !== undefined) {
      data.supervisionContent = b.supervisionContent;
      data.supervisionSource = b.supervisionSource ?? "ai_generated";
      data.supervisionVersion = (existing.supervisionVersion ?? 0) + 1;
      const history = Array.isArray(existing.supervisionHistory) ? [...(existing.supervisionHistory as any[])] : [];
      history.push({ version: data.supervisionVersion, date: new Date().toISOString().slice(0, 10), summary: b.supervisionChangeSummary ?? "内容更新" });
      data.supervisionHistory = history;
    }
    if (b.reportContent !== undefined) {
      data.reportContent = b.reportContent;
      data.reportSource = b.reportSource ?? "ai_generated";
      data.reportVersion = (existing.reportVersion ?? 0) + 1;
      const history = Array.isArray(existing.reportHistory) ? [...(existing.reportHistory as any[])] : [];
      history.push({ version: data.reportVersion, date: new Date().toISOString().slice(0, 10), summary: b.reportChangeSummary ?? "内容更新" });
      data.reportHistory = history;
    }

    await prisma.sop.update({ where: { id: req.params.id }, data });

    // Replace steps if provided
    if (b.steps !== undefined) {
      await prisma.sopStep.deleteMany({ where: { sopId: req.params.id } });
      if (b.steps.length > 0) {
        await prisma.sopStep.createMany({
          data: b.steps.map((s: any, i: number) => ({
            id: genId("step"),
            sopId: req.params.id,
            sortOrder: i + 1,
            name: s.name ?? "",
            description: s.description ?? "",
            required: s.required !== false,
          })),
        });
      }
    }

    const updated = await prisma.sop.findFirst({
      where: { id: req.params.id },
      include: { steps: { orderBy: { sortOrder: "asc" } } },
    });
    res.json(updated);
  });

  // Delete (soft)
  r.delete("/sops/:id", async (req, res) => {
    await prisma.sop.update({ where: { id: req.params.id }, data: { status: "archived" } });
    res.json({ ok: true });
  });

  // Keyword match — returns SOPs whose keywords appear in the given text
  r.get("/sops/match/by-keywords", async (req, res) => {
    const text = (req.query.text as string ?? "").toLowerCase();
    if (!text) return res.json({ sops: [] });

    const allService = await prisma.sop.findMany({
      where: { type: "service", status: "active" },
      include: { steps: { orderBy: { sortOrder: "asc" } } },
    });

    const matched = allService.filter(sop => {
      const keywords = Array.isArray(sop.keywords) ? sop.keywords as string[] : [];
      return keywords.some(kw => text.includes(kw.toLowerCase()));
    });

    res.json({ sops: matched });
  });

  return r;
}
