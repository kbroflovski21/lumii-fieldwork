import { Router } from "express";
import { randomUUID } from "crypto";
import { prisma } from "../db/prisma";

function genId(prefix: string) {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

function isComplete(sop: { sopContent?: string | null; supervisionContent?: string | null; guidanceContent?: string | null; reportContent?: string | null }) {
  return !!(sop.sopContent && sop.supervisionContent && sop.guidanceContent && sop.reportContent);
}

export function sopRoutes() {
  const r = Router();

  // List all SOPs with steps
  r.get("/sops", async (_req, res) => {
    try {
      const sops = await prisma.sop.findMany({
        where: { status: "active" },
        include: { steps: { orderBy: { sortOrder: "asc" } } },
        orderBy: [{ type: "asc" }, { name: "asc" }],
      });
      const enriched = sops.map(s => ({ ...s, isComplete: isComplete(s) }));
      res.json({ sops: enriched });
    } catch { res.json({ sops: [] }); }
  });

  // List published service SOPs (id, name, keywords) for plan matching
  r.get("/sops/service-list", async (_req, res) => {
    const rows = await prisma.sop.findMany({
      where: { type: "service", status: "active", published: true },
      select: { id: true, name: true, keywords: true },
      orderBy: { name: "asc" },
    });
    res.json({ sops: rows });
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
        guidanceContent: b.guidanceContent ?? null,
        guidanceSource: b.guidanceSource ?? "ai_generated",
        guidanceVersion: b.guidanceVersion ?? 0,
        guidanceHistory: b.guidanceHistory ?? [],
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

    // Handle SOP document updates — save old content in history before overwriting
    if (b.sopContent !== undefined) {
      data.sopContent = b.sopContent;
      data.sopSource = b.sopSource ?? existing.sopSource ?? "manual";
      data.sopVersion = (existing.sopVersion ?? 0) + 1;
      const history = Array.isArray(existing.sopHistory) ? [...(existing.sopHistory as any[])] : [];
      if (existing.sopContent) {
        history.push({ version: existing.sopVersion ?? 1, date: new Date().toISOString().slice(0, 10), summary: b.sopChangeSummary ?? "内容更新", content: existing.sopContent });
      }
      data.sopHistory = history;
    }
    if (b.supervisionContent !== undefined) {
      data.supervisionContent = b.supervisionContent;
      data.supervisionSource = b.supervisionSource ?? "ai_generated";
      data.supervisionVersion = (existing.supervisionVersion ?? 0) + 1;
      const history = Array.isArray(existing.supervisionHistory) ? [...(existing.supervisionHistory as any[])] : [];
      if (existing.supervisionContent) {
        history.push({ version: existing.supervisionVersion ?? 1, date: new Date().toISOString().slice(0, 10), summary: b.supervisionChangeSummary ?? "内容更新", content: existing.supervisionContent });
      }
      data.supervisionHistory = history;
    }
    if (b.guidanceContent !== undefined) {
      data.guidanceContent = b.guidanceContent;
      data.guidanceSource = b.guidanceSource ?? "ai_generated";
      data.guidanceVersion = ((existing as any).guidanceVersion ?? 0) + 1;
      const history = Array.isArray((existing as any).guidanceHistory) ? [...((existing as any).guidanceHistory as any[])] : [];
      if ((existing as any).guidanceContent) {
        history.push({ version: (existing as any).guidanceVersion ?? 1, date: new Date().toISOString().slice(0, 10), summary: b.guidanceChangeSummary ?? "内容更新", content: (existing as any).guidanceContent });
      }
      data.guidanceHistory = history;
    }
    if (b.reportContent !== undefined) {
      data.reportContent = b.reportContent;
      data.reportSource = b.reportSource ?? "ai_generated";
      data.reportVersion = (existing.reportVersion ?? 0) + 1;
      const history = Array.isArray(existing.reportHistory) ? [...(existing.reportHistory as any[])] : [];
      if (existing.reportContent) {
        history.push({ version: existing.reportVersion ?? 1, date: new Date().toISOString().slice(0, 10), summary: b.reportChangeSummary ?? "内容更新", content: existing.reportContent });
      }
      data.reportHistory = history;
    }

    // Auto-unpublish if a content field is set to null/empty
    if (existing.published) {
      const nextSop = { ...existing, ...data };
      if (!isComplete(nextSop)) {
        data.published = false;
      }
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

  r.post("/sops/:id/publish", async (req, res) => {
    const sop = await prisma.sop.findFirst({ where: { id: req.params.id } });
    if (!sop) return res.status(404).json({ error: "not found" });
    if (!isComplete(sop)) {
      const missing: string[] = [];
      if (!sop.sopContent) missing.push("sopContent");
      if (!sop.supervisionContent) missing.push("supervisionContent");
      if (!(sop as any).guidanceContent) missing.push("guidanceContent");
      if (!sop.reportContent) missing.push("reportContent");
      return res.status(400).json({ error: "SOP 不完整，缺少: " + missing.join(", ") });
    }
    await prisma.sop.update({ where: { id: req.params.id }, data: { published: true } });
    res.json({ ok: true, published: true });
  });

  r.post("/sops/:id/unpublish", async (req, res) => {
    const sop = await prisma.sop.findFirst({ where: { id: req.params.id } });
    if (!sop) return res.status(404).json({ error: "not found" });
    await prisma.sop.update({ where: { id: req.params.id }, data: { published: false } });
    res.json({ ok: true, published: false });
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
