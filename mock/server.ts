import express from "express";
import crypto from "crypto";
import {
  users, sites, feishuUsers, socialWorkers, smartBadges,
  serviceObjects, serviceSchedules, serviceRecords, audioAssets,
  transcripts, recordings, sops, homeData, servicePlans,
  // V2 data
  qualificationTags, hangzhouCatalog, hangzhouCatalogItems,
  servicePlansV2, devices, serviceSessions, followUpRecords,
  familyFeedback, anomalyAlerts, govOverviewData,
  // V3 data (0606)
  policyConstraints, recurringScheduleRules, institutions,
  // Training
  trainingRecords,
} from "./data.js";

const app = express();
app.use(express.json());

const JWT_SECRET = "mock-jwt-token-2026";

function makeToken(user: typeof users[0]) {
  return Buffer.from(JSON.stringify({ id: user.id, role: user.role })).toString("base64");
}

function parseToken(req: express.Request) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    return JSON.parse(Buffer.from(auth.slice(7), "base64").toString());
  } catch { return null; }
}

function findUser(token: ReturnType<typeof parseToken>) {
  if (!token) return null;
  return users.find(u => u.id === token.id) ?? null;
}

function filterBySite(items: Array<{ siteId: string }>, siteId?: string) {
  return siteId ? items.filter(i => i.siteId === siteId) : items;
}

function uid() { return "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

// ── Auth ──

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: "用户名或密码错误" });
  const { password: _, ...safeUser } = user;
  res.json({ token: makeToken(user), mustChangePassword: false, user: safeUser });
});

app.get("/api/auth/me", (req, res) => {
  const user = findUser(parseToken(req));
  if (!user) return res.status(401).json({ error: "未授权" });
  const { password: _, ...safeUser } = user;
  res.json({ mustChangePassword: false, user: safeUser });
});

app.patch("/api/auth/change-password", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/auth/my-sites", (req, res) => {
  const user = findUser(parseToken(req));
  if (!user) return res.status(401).json({ error: "未授权" });
  const mySites = sites.filter(s => user.siteIds.includes(s.id));
  res.json({ sites: mySites });
});

// ── Admin Users ──

app.get("/api/admin/users", (_req, res) => {
  res.json({ users: users.map(({ password: _, ...u }) => ({ ...u, createdAt: "2025-01-01T00:00:00Z" })) });
});

app.post("/api/admin/users", (req, res) => {
  const id = uid();
  res.json({ id, username: req.body.username, name: req.body.name, role: req.body.role });
});

app.patch("/api/admin/users/:id", (_req, res) => { res.json({ ok: true }); });
app.delete("/api/admin/users/:id", (_req, res) => { res.json({ ok: true }); });
app.post("/api/admin/users/:id/reset-password", (_req, res) => { res.json({ ok: true }); });

// ── Admin Sites ──

app.get("/api/admin/sites", (_req, res) => { res.json({ sites }); });
app.post("/api/admin/sites", (req, res) => { res.json({ id: uid(), ...req.body, orgId: "org1", status: "active", createdAt: new Date().toISOString() }); });
app.get("/api/admin/sites/:id", (req, res) => {
  const site = sites.find(s => s.id === req.params.id);
  site ? res.json(site) : res.status(404).json({ error: "站点不存在" });
});
app.patch("/api/admin/sites/:id", (_req, res) => { res.json({ ok: true }); });
app.delete("/api/admin/sites/:id", (_req, res) => { res.json({ ok: true }); });
app.put("/api/admin/sites/:id/operators", (_req, res) => { res.json({ ok: true }); });

// ── Admin Feishu Users ──

app.get("/api/admin/feishu-users", (_req, res) => { res.json({ feishuUsers }); });
app.patch("/api/admin/feishu-users/:id", (req, res) => {
  const u = feishuUsers.find(f => f.id === req.params.id);
  res.json(u ?? { id: req.params.id, ...req.body });
});
app.delete("/api/admin/feishu-users/:id", (_req, res) => { res.json({ ok: true }); });
app.get("/api/feishu-users", (_req, res) => { res.json({ feishuUser: feishuUsers[0] }); });
app.post("/api/feishu-users", (req, res) => { res.json({ id: uid(), ...req.body }); });

// ── Site Operations Home ──

app.get("/api/site-operations/home", (_req, res) => { res.json(homeData); });

// ── Social Workers ──

app.get("/api/social-workers", (req, res) => {
  const siteId = req.query.siteId as string | undefined;
  res.json({ socialWorkers: filterBySite(socialWorkers, siteId), operationalState: { permission: "full", isLoading: false } });
});

app.post("/api/social-workers", (req, res) => {
  const id = uid();
  res.json({ id, userId: uid(), ...req.body, status: "active", praiseSummary: { praiseCount: 0 }, account: { username: req.body.phone, initialPassword: "Gy@" + Math.random().toString(36).slice(2, 8) } });
});

app.patch("/api/social-workers/:id", (req, res) => {
  const sw = socialWorkers.find(s => s.id === req.params.id);
  res.json(sw ? { ...sw, ...req.body } : { id: req.params.id, ...req.body });
});

app.put("/api/social-workers/:id/badge-binding", (req, res) => {
  const sw = socialWorkers.find(s => s.id === req.params.id);
  const badge = smartBadges.find(b => b.id === req.body.preferredBadgeId);
  res.json({ ...(sw ?? { id: req.params.id }), preferredBadge: badge ? { badgeId: badge.id, deviceCode: badge.deviceCode, status: badge.status, lastSyncAt: badge.lastSyncAt } : undefined });
});

app.post("/api/social-workers/:id/reset-password", (_req, res) => {
  res.json({ username: "worker", initialPassword: "Gy@" + Math.random().toString(36).slice(2, 8) });
});

app.post("/api/social-workers/:id/archive", (req, res) => {
  res.json({ ok: true, id: req.params.id, message: "archived" });
});

// ── Smart Badges ──

app.get("/api/smart-badges", (req, res) => {
  const siteId = req.query.siteId as string | undefined;
  res.json({ smartBadges: filterBySite(smartBadges, siteId), operationalState: { permission: "full", isLoading: false } });
});

app.get("/api/smart-badges/:id", (req, res) => {
  const b = smartBadges.find(b => b.id === req.params.id);
  b ? res.json(b) : res.status(404).json({ error: "设备不存在" });
});

app.get("/api/smart-badges/:id/service-records", (_req, res) => {
  res.json(serviceRecords.slice(0, 2).map(r => ({ serviceRecordId: r.id, serviceDate: r.serviceDate, serviceObjectName: r.serviceObjectName, reviewStatus: r.reviewStatus })));
});

app.post("/api/smart-badges/activations", (req, res) => {
  const id = uid();
  const badge = { id, deviceCode: req.body.deviceCode, orgId: "org1", siteId: req.body.siteId, status: "available", batteryPercent: 100, activatedAt: new Date().toISOString(), recentServiceRecordIds: [] };
  res.json({ ok: true, id, message: "activated", smartBadge: badge });
});

app.patch("/api/smart-badges/:id", (req, res) => {
  const b = smartBadges.find(b => b.id === req.params.id);
  res.json(b ? { ...b, ...req.body } : { id: req.params.id, ...req.body });
});

// ── Service Objects ──

app.get("/api/service-objects", (req, res) => {
  const siteId = req.query.siteId as string | undefined;
  const objs = siteId ? serviceObjects.filter(so => {
    const plans = servicePlans.filter(p => p.serviceObjectId === so.id);
    const workers = plans.map(p => socialWorkers.find(sw => sw.id === p.primarySocialWorkerId)).filter(Boolean);
    return workers.some(w => w!.siteId === siteId);
  }) : serviceObjects;
  res.json({ serviceObjects: objs, servicePlans, operationalState: { permission: "full", isLoading: false } });
});

app.get("/api/service-objects/:id", (req, res) => {
  const so = serviceObjects.find(s => s.id === req.params.id);
  so ? res.json(so) : res.status(404).json({ error: "长者不存在" });
});

app.post("/api/service-objects", (req, res) => {
  const id = uid();
  res.json({ ok: true, id, message: "created", serviceObject: { id, ...req.body, familySubscriptionSummary: "none", insightSummaries: [], servicePlanSummaries: [], familyContacts: [], state: "normal" } });
});

app.patch("/api/service-objects/:id", (req, res) => {
  const so = serviceObjects.find(s => s.id === req.params.id);
  const updated = { ...(so ?? { id: req.params.id }), ...req.body };
  res.json({ ok: true, id: req.params.id, message: "updated", serviceObject: updated });
});

app.post("/api/service-objects/:id/archive", (req, res) => {
  res.json({ ok: true, id: req.params.id, message: "archived" });
});

app.get("/api/service-objects/:id/insights", (req, res) => {
  const so = serviceObjects.find(s => s.id === req.params.id);
  res.json(so ?? { id: req.params.id });
});

app.put("/api/service-objects/:id/family-subscriptions", (req, res) => {
  const so = serviceObjects.find(s => s.id === req.params.id);
  const updated = { ...(so ?? { id: req.params.id }), ...req.body };
  res.json({ ok: true, id: req.params.id, message: "updated", serviceObject: updated });
});

app.get("/api/service-objects/:id/service-plans", (req, res) => {
  res.json(servicePlans.filter(p => p.serviceObjectId === req.params.id));
});

app.post("/api/service-objects/:id/service-plans", (req, res) => {
  const id = uid();
  res.json({ id, serviceObjectId: req.params.id, ...req.body, exceptions: [], sopLinks: [] });
});

app.post("/api/service-objects/:id/family-contacts", (req, res) => {
  const id = uid();
  res.json([{ id, ...req.body }]);
});

app.delete("/api/family-contacts/:id", (_req, res) => { res.json({ ok: true }); });

// ── Service Plans ──

app.get("/api/service-plans/:id", (req, res) => {
  const p = servicePlans.find(p => p.id === req.params.id);
  p ? res.json(p) : res.status(404).json({ error: "计划不存在" });
});

app.patch("/api/service-plans/:id", (req, res) => {
  const p = servicePlans.find(p => p.id === req.params.id);
  res.json(p ? { ...p, ...req.body } : { id: req.params.id, ...req.body });
});

app.post("/api/service-plans/:id/archive", (_req, res) => { res.json({ ok: true }); });
app.post("/api/service-plans/:id/cancel", (_req, res) => { res.json({ ok: true }); });
app.post("/api/service-plans/:id/reactivate", (_req, res) => { res.json({ ok: true }); });
app.delete("/api/service-plans/:id", (_req, res) => { res.json({ ok: true }); });

app.post("/api/service-plans/:id/exceptions", (req, res) => {
  const p = servicePlans.find(p => p.id === req.params.id);
  res.json(p ?? { id: req.params.id, ...req.body });
});

app.patch("/api/service-plan-exceptions/:id", (req, res) => {
  res.json({ id: req.params.id, ...req.body });
});

// ── Service Schedule Occurrences ──

app.get("/api/service-schedule-occurrences", (req, res) => {
  const siteId = req.query.siteId as string | undefined;
  const userId = req.query.userId as string | undefined;
  let schedules = serviceSchedules;
  if (siteId) {
    const siteWorkerIds = socialWorkers.filter(sw => sw.siteId === siteId).map(sw => sw.id);
    schedules = schedules.filter(s => s.assignedSocialWorkerId && siteWorkerIds.includes(s.assignedSocialWorkerId) || !s.assignedSocialWorkerId);
  }
  if (userId) {
    schedules = schedules.filter(s => s.assignedSocialWorkerId === userId);
  }
  res.json({ serviceSchedules: schedules, operationalState: { permission: "full", isLoading: false } });
});

app.get("/api/service-schedule-occurrences/:id", (req, res) => {
  const s = serviceSchedules.find(s => s.id === req.params.id);
  res.json({ serviceSchedules: s ? [s] : [] });
});

app.post("/api/service-schedule-occurrences", (req, res) => {
  const id = uid();
  res.json({ ok: true, id, message: "created", serviceSchedule: { id, source: "one_time", ...req.body, status: req.body.assignedSocialWorkerId ? "scheduled" : "unassigned", riskTags: [] } });
});

app.patch("/api/service-schedule-occurrences/:id", (req, res) => {
  const s = serviceSchedules.find(s => s.id === req.params.id);
  const updated = { ...(s ?? { id: req.params.id }), ...req.body };
  res.json({ ok: true, id: req.params.id, message: "updated", serviceSchedule: updated });
});

// ── Service Records ──

app.get("/api/service-records", (req, res) => {
  const siteId = req.query.siteId as string | undefined;
  let records = serviceRecords;
  if (siteId) {
    const siteWorkerIds = socialWorkers.filter(sw => sw.siteId === siteId).map(sw => sw.id);
    records = records.filter(r => r.socialWorkerId && siteWorkerIds.includes(r.socialWorkerId));
  }
  res.json({ serviceRecords: records, audioAssets, transcripts, serviceObjects, smartBadges, operationalState: { permission: "full", isLoading: false } });
});

app.get("/api/service-records/:id", (req, res) => {
  const r = serviceRecords.find(r => r.id === req.params.id);
  r ? res.json(r) : res.status(404).json({ error: "记录不存在" });
});

app.patch("/api/service-records/:id", (req, res) => {
  const r = serviceRecords.find(r => r.id === req.params.id);
  res.json(r ? { ...r, ...req.body } : { id: req.params.id, ...req.body });
});

app.get("/api/service-records/:id/audio", (req, res) => {
  const a = audioAssets.find(a => a.recordId === req.params.id);
  a ? res.json(a) : res.status(404).json({ error: "音频不存在" });
});

app.patch("/api/service-records/:id/review", (req, res) => {
  const r = serviceRecords.find(r => r.id === req.params.id);
  const updated = { ...(r ?? { id: req.params.id }), reviewStatus: "confirmed", exportStatus: "exportable" };
  res.json({ ok: true, id: req.params.id, message: "reviewed", serviceRecord: updated });
});

app.post("/api/service-records/export", (_req, res) => {
  res.json({ ok: true, id: uid(), exportId: uid(), fileVersion: "v1", exportedAt: new Date().toISOString() });
});

// ── Recordings ──

app.get("/api/recordings", (_req, res) => { res.json({ recordings }); });
app.get("/api/recordings/:id", (req, res) => {
  const r = recordings.find(r => r.id === req.params.id);
  r ? res.json(r) : res.status(404).json({ error: "录音不存在" });
});
app.patch("/api/recordings/:id/match", (req, res) => { res.json({ ok: true, serviceRecordId: req.body.scheduleId }); });
app.post("/api/recordings/:id/rematch", (_req, res) => { res.json({ ok: true }); });

// ── SOPs ──

app.get("/api/sops", (_req, res) => { res.json({ sops }); });
app.get("/api/sops/service-list", (_req, res) => { res.json({ sops: sops.filter(s => s.type === "service").map(s => ({ id: s.id, name: s.name, keywords: s.keywords })) }); });
app.get("/api/sops/match/by-keywords", (req, res) => {
  const kw = (req.query.keywords as string ?? "").split(",");
  const matched = sops.filter(s => s.keywords.some(k => kw.includes(k)));
  res.json({ sops: matched });
});
app.get("/api/sops/:id", (req, res) => {
  const s = sops.find(s => s.id === req.params.id);
  s ? res.json(s) : res.status(404).json({ error: "SOP不存在" });
});
app.post("/api/sops", (req, res) => { res.json({ id: uid(), ...req.body, sopVersion: 1, sopHistory: [], supervisionVersion: 1, supervisionHistory: [], guidanceVersion: 1, guidanceHistory: [], reportVersion: 1, reportHistory: [], orgId: "org1", isComplete: false, status: "draft", published: false }); });
app.patch("/api/sops/:id", (req, res) => {
  const s = sops.find(s => s.id === req.params.id);
  res.json(s ? { ...s, ...req.body } : { id: req.params.id, ...req.body });
});
app.delete("/api/sops/:id", (_req, res) => { res.json({ ok: true }); });
app.post("/api/sops/:id/publish", (_req, res) => { res.json({ ok: true, published: true }); });
app.post("/api/sops/:id/unpublish", (_req, res) => { res.json({ ok: true, published: false }); });

// ── AI ──

app.post("/api/ai/chat", (req, res) => {
  const userMsg = req.body.messages?.slice(-1)?.[0]?.content ?? "";
  res.json({ message: userMsg, response: `这是一个模拟回复。您说的是："${userMsg}"。在正式环境中，这里会调用大语言模型生成回复。` });
});

app.post("/api/ai/generate-doc", (req, res) => {
  res.json({ docId: uid(), type: req.body.docType, content: `## ${req.body.sopName} - ${req.body.docType}\n\n这是由AI生成的模拟文档内容。\n\n### 要点\n1. 第一个要点\n2. 第二个要点\n3. 第三个要点` });
});

app.post("/api/ai/generate-schedule", (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  res.json({
    plan: { cadenceRule: "weekly:mon,wed,fri", cadenceLabel: "每周一/三/五", timeWindow: { start: "09:00", end: "10:30" }, startDate: today, isRecurring: true, serviceContent: req.body.prompt },
    matchedSops: [{ id: "sop1", name: "居家养老生活照料" }],
    preview: [
      { date: today, dayLabel: "今天", timeLabel: "09:00-10:30" },
      { date: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10), dayLabel: "后天", timeLabel: "09:00-10:30" },
    ],
  });
});

// ═══════════════════════════════════════════════════════════════════════
// V2 Endpoints — 0604 Design Spec additions
// ═══════════════════════════════════════════════════════════════════════

// ── Qualification Tags ──

app.get("/api/qualification-tags", (_req, res) => {
  res.json({ qualificationTags });
});

// ── Standard Catalogs ──

const catalogs = [hangzhouCatalog];
const catalogItemsMap: Record<string, typeof hangzhouCatalogItems> = {
  [hangzhouCatalog.id]: hangzhouCatalogItems,
};

app.get("/api/standard-catalogs", (_req, res) => {
  res.json({ catalogs });
});

app.get("/api/standard-catalogs/:id", (req, res) => {
  const catalog = catalogs.find(c => c.id === req.params.id);
  catalog ? res.json(catalog) : res.status(404).json({ error: "标准目录不存在" });
});

app.get("/api/standard-catalogs/:id/items", (req, res) => {
  const items = catalogItemsMap[req.params.id];
  if (!items) return res.status(404).json({ error: "标准目录不存在" });
  const categoryId = req.query.categoryId as string | undefined;
  const filtered = categoryId ? items.filter(i => i.categoryId === categoryId) : items;
  res.json({ items: filtered });
});

// ── Service Plans V2 ──

app.get("/api/service-plans-v2", (req, res) => {
  const serviceObjectId = req.query.serviceObjectId as string | undefined;
  const filtered = serviceObjectId
    ? servicePlansV2.filter(p => p.serviceObjectId === serviceObjectId)
    : servicePlansV2;
  res.json({ servicePlans: filtered });
});

app.get("/api/service-plans-v2/:id", (req, res) => {
  const plan = servicePlansV2.find(p => p.id === req.params.id);
  plan ? res.json(plan) : res.status(404).json({ error: "服务计划不存在" });
});

app.post("/api/service-plans-v2", (req, res) => {
  const id = uid();
  res.json({ ok: true, id, message: "created", servicePlan: { id, ...req.body, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), items: req.body.items ?? [] } });
});

app.patch("/api/service-plans-v2/:id", (req, res) => {
  const plan = servicePlansV2.find(p => p.id === req.params.id);
  const updated = { ...(plan ?? { id: req.params.id }), ...req.body, updatedAt: new Date().toISOString() };
  res.json({ ok: true, id: req.params.id, message: "updated", servicePlan: updated });
});

// ── Devices (generalized) ──

app.get("/api/devices", (req, res) => {
  const siteId = req.query.siteId as string | undefined;
  const deviceType = req.query.deviceType as string | undefined;
  let filtered = siteId ? devices.filter(d => d.siteId === siteId) : devices;
  if (deviceType) filtered = filtered.filter(d => d.deviceType === deviceType);
  res.json({ devices: filtered });
});

app.get("/api/devices/:id", (req, res) => {
  const device = devices.find(d => d.id === req.params.id);
  device ? res.json(device) : res.status(404).json({ error: "设备不存在" });
});

app.post("/api/devices", (req, res) => {
  const id = uid();
  res.json({ ok: true, id, message: "created", device: { id, ...req.body, orgId: "org1", status: "available", capabilities: req.body.capabilities ?? [] } });
});

app.patch("/api/devices/:id", (req, res) => {
  const device = devices.find(d => d.id === req.params.id);
  const updated = { ...(device ?? { id: req.params.id }), ...req.body };
  res.json({ ok: true, id: req.params.id, message: "updated", device: updated });
});

// ── Service Sessions ──

app.get("/api/service-sessions", (req, res) => {
  const status = req.query.status as string | undefined;
  const workerId = req.query.workerId as string | undefined;
  const serviceObjectId = req.query.serviceObjectId as string | undefined;
  const siteId = req.query.siteId as string | undefined;
  let filtered = [...serviceSessions];
  if (status) filtered = filtered.filter(s => s.status === status);
  if (workerId) filtered = filtered.filter(s => s.workerId === workerId);
  if (serviceObjectId) filtered = filtered.filter(s => s.serviceObjectId === serviceObjectId);
  if (siteId) {
    const siteWorkerIds = socialWorkers.filter(sw => sw.siteId === siteId).map(sw => sw.id);
    filtered = filtered.filter(s => siteWorkerIds.includes(s.workerId));
  }
  res.json({ serviceSessions: filtered });
});

app.get("/api/service-sessions/:id", (req, res) => {
  const session = serviceSessions.find(s => s.id === req.params.id);
  session ? res.json(session) : res.status(404).json({ error: "服务会话不存在" });
});

app.get("/api/service-sessions/:id/realtime", (req, res) => {
  const session = serviceSessions.find(s => s.id === req.params.id);
  if (!session) return res.status(404).json({ error: "服务会话不存在" });
  if (!session.realtimeData) return res.json({ audioStatus: "paused", radarStatus: "disconnected", transcriptLog: [], aiGuidanceLog: [] });
  res.json(session.realtimeData);
});

app.post("/api/service-sessions", (req, res) => {
  const id = uid();
  res.json({ ok: true, id, message: "created", serviceSession: { id, ...req.body, status: "items_selected", verification: { gpsMatch: null, bleBeaconMatch: null, voiceprintMatch: null }, evidenceChain: { gps: false, bleBeacon: false, voiceprint: false, audioRecording: false, radarData: false, photo: false } } });
});

app.patch("/api/service-sessions/:id", (req, res) => {
  const session = serviceSessions.find(s => s.id === req.params.id);
  const updated = { ...(session ?? { id: req.params.id }), ...req.body };
  res.json({ ok: true, id: req.params.id, message: "updated", serviceSession: updated });
});

// ── Follow-Ups ──

app.get("/api/follow-ups", (req, res) => {
  const type = req.query.type as string | undefined;
  const serviceObjectId = req.query.serviceObjectId as string | undefined;
  let filtered = [...followUpRecords];
  if (type) filtered = filtered.filter(f => f.type === type);
  if (serviceObjectId) filtered = filtered.filter(f => f.serviceObjectId === serviceObjectId);
  res.json({ followUpRecords: filtered });
});

app.get("/api/follow-ups/:id", (req, res) => {
  const record = followUpRecords.find(f => f.id === req.params.id);
  record ? res.json(record) : res.status(404).json({ error: "回访记录不存在" });
});

app.post("/api/follow-ups", (req, res) => {
  const id = uid();
  res.json({ ok: true, id, message: "created", followUpRecord: { id, ...req.body, status: req.body.status ?? "scheduled" } });
});

app.patch("/api/follow-ups/:id", (req, res) => {
  const record = followUpRecords.find(f => f.id === req.params.id);
  const updated = { ...(record ?? { id: req.params.id }), ...req.body };
  res.json({ ok: true, id: req.params.id, message: "updated", followUpRecord: updated });
});

// ── Family Feedback ──

app.get("/api/family-feedback", (req, res) => {
  const sentiment = req.query.sentiment as string | undefined;
  const status = req.query.status as string | undefined;
  const channel = req.query.channel as string | undefined;
  const serviceObjectId = req.query.serviceObjectId as string | undefined;
  let filtered = [...familyFeedback];
  if (sentiment) filtered = filtered.filter(f => f.sentiment === sentiment);
  if (status) filtered = filtered.filter(f => f.status === status);
  if (channel) filtered = filtered.filter(f => f.channel === channel);
  if (serviceObjectId) filtered = filtered.filter(f => f.serviceObjectId === serviceObjectId);
  res.json({ familyFeedback: filtered });
});

app.get("/api/family-feedback/:id", (req, res) => {
  const fb = familyFeedback.find(f => f.id === req.params.id);
  fb ? res.json(fb) : res.status(404).json({ error: "反馈不存在" });
});

app.post("/api/family-feedback", (req, res) => {
  const id = uid();
  res.json({ ok: true, id, message: "created", feedback: { id, ...req.body, status: req.body.status ?? "pending" } });
});

app.patch("/api/family-feedback/:id", (req, res) => {
  const fb = familyFeedback.find(f => f.id === req.params.id);
  const updated = { ...(fb ?? { id: req.params.id }), ...req.body };
  res.json({ ok: true, id: req.params.id, message: "updated", feedback: updated });
});

// ── Gov Audit ──

app.get("/api/gov/overview", (_req, res) => {
  res.json(govOverviewData);
});

app.get("/api/gov/audit/search", (req, res) => {
  const dateFrom = req.query.dateFrom as string | undefined;
  const dateTo = req.query.dateTo as string | undefined;
  const workerId = req.query.workerId as string | undefined;
  const serviceObjectId = req.query.serviceObjectId as string | undefined;
  const anomalyOnly = req.query.anomalyOnly === "true";
  const dimension = req.query.dimension as string | undefined;

  let sessions = serviceSessions.filter(s => s.status === "completed");

  if (dateFrom) sessions = sessions.filter(s => s.serviceDate >= dateFrom);
  if (dateTo) sessions = sessions.filter(s => s.serviceDate <= dateTo);
  if (workerId) sessions = sessions.filter(s => s.workerId === workerId);
  if (serviceObjectId) sessions = sessions.filter(s => s.serviceObjectId === serviceObjectId);
  if (anomalyOnly) {
    sessions = sessions.filter(s => {
      const ec = s.evidenceChain;
      return !ec.gps || !ec.bleBeacon || !ec.voiceprint || !ec.audioRecording || !ec.radarData || !ec.photo;
    });
  }
  if (dimension) {
    sessions = sessions.filter(s => {
      const ec = s.evidenceChain as Record<string, boolean>;
      return ec[dimension] === false;
    });
  }

  res.json({ serviceSessions: sessions, total: sessions.length });
});

app.get("/api/gov/audit/random", (req, res) => {
  const count = parseInt(req.query.count as string || "3");
  const completed = serviceSessions.filter(s => s.status === "completed");
  const shuffled = [...completed].sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, Math.min(count, shuffled.length));
  res.json({ serviceSessions: picked, total: picked.length });
});

app.get("/api/gov/audit/:sessionId", (req, res) => {
  const session = serviceSessions.find(s => s.id === req.params.sessionId);
  if (!session) return res.status(404).json({ error: "服务会话不存在" });

  // Enrich with related data
  const relatedAlerts = anomalyAlerts.filter(a => a.sessionId === session.id);
  const relatedFollowUps = followUpRecords.filter(f => f.serviceSessionId === session.id);
  const relatedFeedback = familyFeedback.filter(f => f.serviceObjectId === session.serviceObjectId);

  res.json({
    session,
    alerts: relatedAlerts,
    followUps: relatedFollowUps,
    feedback: relatedFeedback,
  });
});

// ═══════════════════════════════════════════════════════════════════════
// V3 Endpoints — 0606 Design Spec additions
// ═══════════════════════════════════════════════════════════════════════

// ── Policy Constraints ──

app.get("/api/policy-constraints", (req, res) => {
  const catalogId = req.query.catalogId as string | undefined;
  const filtered = catalogId
    ? policyConstraints.filter(pc => pc.catalogId === catalogId)
    : policyConstraints;
  res.json({ policyConstraints: filtered });
});

// ── Recurring Schedule Rules ──

app.get("/api/recurring-rules", (req, res) => {
  const workerId = req.query.workerId as string | undefined;
  const serviceObjectId = req.query.serviceObjectId as string | undefined;
  let filtered = [...recurringScheduleRules];
  if (workerId) filtered = filtered.filter(r => r.assignedWorkerId === workerId);
  if (serviceObjectId) filtered = filtered.filter(r => r.serviceObjectId === serviceObjectId);
  res.json({ recurringRules: filtered });
});

app.get("/api/recurring-rules/:id", (req, res) => {
  const rule = recurringScheduleRules.find(r => r.id === req.params.id);
  rule ? res.json(rule) : res.status(404).json({ error: "周期排班规则不存在" });
});

app.post("/api/recurring-rules", (req, res) => {
  const id = uid();
  res.json({ ok: true, id, message: "created", recurringRule: { id, ...req.body, status: req.body.status ?? "active" } });
});

app.patch("/api/recurring-rules/:id", (req, res) => {
  const rule = recurringScheduleRules.find(r => r.id === req.params.id);
  const updated = { ...(rule ?? { id: req.params.id }), ...req.body };
  res.json({ ok: true, id: req.params.id, message: "updated", recurringRule: updated });
});

app.delete("/api/recurring-rules/:id", (req, res) => {
  res.json({ ok: true, id: req.params.id, message: "deleted" });
});

// ── Gov Institutions ──

app.get("/api/gov/institutions", (_req, res) => {
  res.json({ institutions });
});

app.get("/api/gov/institutions/:id", (req, res) => {
  const inst = institutions.find(i => i.id === req.params.id);
  if (!inst) return res.status(404).json({ error: "机构不存在" });

  // Enrich with related anomalies and sessions
  const relatedAlerts = anomalyAlerts.filter(a => a.institutionId === "org1"); // map to inst for mock
  const instSessions = inst.id === "inst-1"
    ? serviceSessions.filter(s => s.status === "completed")
    : [];

  res.json({
    institution: inst,
    alerts: relatedAlerts.slice(0, 3),
    recentSessions: instSessions.slice(0, 5),
    monthlyStats: {
      serviceCount: inst.id === "inst-1" ? 156 : inst.id === "inst-2" ? 89 : 62,
      evidencePassRate: inst.evidencePassRate,
      elderVerifyPassRate: inst.elderVerifyPassRate,
      anomalyRate: inst.anomalyRate,
      qualityScore: inst.qualityScore,
      trend: [
        { month: "2026-01", serviceCount: 120, passRate: 80.0 },
        { month: "2026-02", serviceCount: 135, passRate: 82.5 },
        { month: "2026-03", serviceCount: 142, passRate: 84.0 },
        { month: "2026-04", serviceCount: 148, passRate: 85.5 },
        { month: "2026-05", serviceCount: 153, passRate: 86.0 },
        { month: "2026-06", serviceCount: inst.id === "inst-1" ? 156 : inst.id === "inst-2" ? 89 : 62, passRate: inst.evidencePassRate },
      ],
    },
  });
});

// ── Training Records ──

app.get("/api/training-records", (req, res) => {
  const workerId = req.query.workerId as string | undefined;
  const mode = req.query.mode as string | undefined;
  const siteId = req.query.siteId as string | undefined;
  let filtered = [...trainingRecords];
  if (workerId) filtered = filtered.filter(r => r.workerId === workerId);
  if (mode) filtered = filtered.filter(r => r.mode === mode);
  if (siteId) filtered = filtered.filter(r => r.siteId === siteId);
  res.json({ trainingRecords: filtered });
});

app.post("/api/training-records", (req, res) => {
  const id = uid();
  res.json({ ok: true, id, message: "created", trainingRecord: { id, ...req.body, completedAt: new Date().toISOString(), status: req.body.status ?? "completed" } });
});

// ── Health ──

app.get("/api/health", (_req, res) => { res.json({ ok: true, mode: "mock" }); });

// ── WebSocket stubs (just accept upgrade, send welcome) ──

const PORT = parseInt(process.env.MOCK_PORT ?? "3001");
const server = app.listen(PORT, () => {
  console.log(`Mock API server running on http://localhost:${PORT}`);
  console.log(`  Login: admin/admin123 (管理员) or operator1/op123 (运营)`);
});

server.on("upgrade", (req, socket) => {
  const key = req.headers["sec-websocket-key"];
  if (!key) { socket.destroy(); return; }
  const magic = "258EAFA5-E914-47DA-95CA-5AB9DC305115";
  // crypto imported at top level via ESM
  const accept = crypto.createHash("sha1").update(key + magic).digest("base64");
  socket.write([
    "HTTP/1.1 101 Switching Protocols",
    "Upgrade: websocket",
    "Connection: Upgrade",
    `Sec-WebSocket-Accept: ${accept}`,
    "", "",
  ].join("\r\n"));

  const sendWsFrame = (data: string) => {
    const buf = Buffer.from(data);
    const frame = Buffer.alloc(2 + buf.length);
    frame[0] = 0x81;
    frame[1] = buf.length;
    buf.copy(frame, 2);
    socket.write(frame);
  };

  sendWsFrame(JSON.stringify({ type: "connected", message: "Mock WebSocket connected" }));

  socket.on("data", (raw: Buffer) => {
    if (raw.length < 6) return;
    const len = raw[1] & 0x7f;
    const maskStart = 2;
    const mask = raw.subarray(maskStart, maskStart + 4);
    const payload = raw.subarray(maskStart + 4, maskStart + 4 + len);
    for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4];
    try {
      const msg = JSON.parse(payload.toString());
      if (msg.type === "ping") {
        sendWsFrame(JSON.stringify({ type: "pong" }));
      } else {
        sendWsFrame(JSON.stringify({ type: "message", content: `Mock echo: ${msg.content ?? JSON.stringify(msg)}` }));
      }
    } catch {
      sendWsFrame(JSON.stringify({ type: "message", content: "Mock: received binary data" }));
    }
  });
});
