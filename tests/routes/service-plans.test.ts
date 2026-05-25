// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import request from "supertest";
import { authRoutes } from "../../server/routes/auth";
import { serviceObjectsRoutes } from "../../server/routes/serviceObjects";
import { serviceSchedulesRoutes } from "../../server/routes/serviceSchedules";
import { requireAuth } from "../../server/middleware/requireAuth";
import { prisma } from "../../server/db/prisma";
import { generateDates, parseCadenceRule } from "../../server/lib/cadenceRule";

const JWT_SECRET = "test-service-plans-secret";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api", authRoutes(JWT_SECRET));
  const authMw = requireAuth(JWT_SECRET);
  app.use("/api", authMw, serviceObjectsRoutes());
  app.use("/api", authMw, serviceSchedulesRoutes());
  // Error handler for debugging test failures
  app.use((err: any, _req: any, res: any, _next: any) => {
    console.error("Express error:", err.message);
    res.status(500).json({ error: err.message });
  });
  return app;
}

describe("Service Plans API", () => {
  let app: express.Express;
  let operatorToken: string;
  const createdObjectIds: string[] = [];
  const createdPlanIds: string[] = [];

  beforeAll(async () => {
    app = createApp();
    const opRes = await request(app).post("/api/auth/login").send({ username: "operator", password: "oper123" });
    operatorToken = opRes.body.token;
  });

  afterAll(async () => {
    // Clean up in reverse order (schedules -> plan sops -> plans -> objects)
    for (const planId of createdPlanIds) {
      await prisma.serviceScheduleSop.deleteMany({ where: { schedule: { servicePlanId: planId } } });
      await prisma.serviceSchedule.deleteMany({ where: { servicePlanId: planId } });
      await prisma.servicePlanSop.deleteMany({ where: { planId } });
      await prisma.servicePlanException.deleteMany({ where: { servicePlanId: planId } });
      await prisma.servicePlan.deleteMany({ where: { id: planId } });
    }
    for (const id of createdObjectIds) {
      await prisma.servicePlan.deleteMany({ where: { serviceObjectId: id } });
      await prisma.serviceObject.deleteMany({ where: { id } });
    }
  });

  describe("generateDates utility", () => {
    it("WEEKLY:0,1,2,3,4,5,6 (every day) generates 7 dates per week", () => {
      // 2026-05-25 is a Sunday (day 0)
      const dates = generateDates("WEEKLY:0,1,2,3,4,5,6", "2026-05-25", 7);
      expect(dates.length).toBe(7);
      expect(dates[0]).toBe("2026-05-25"); // Sunday
      expect(dates[1]).toBe("2026-05-26"); // Monday
      expect(dates[6]).toBe("2026-05-31"); // Saturday
    });

    it("WEEKLY:0,1,2,3,4,5,6 generates 14 dates for 2 weeks", () => {
      const dates = generateDates("WEEKLY:0,1,2,3,4,5,6", "2026-05-25", 14);
      expect(dates.length).toBe(14);
    });

    it("generates correct dates for weekend-only rule", () => {
      // WEEKLY:0,6 = Sunday and Saturday
      // 2026-05-25 is Monday (day 1), so first Sat = May 30, first Sun = May 31
      const dates = generateDates("WEEKLY:0,6", "2026-05-25", 14);
      // May 30 (Sat), May 31 (Sun), Jun 6 (Sat), Jun 7 (Sun)
      expect(dates.length).toBe(4);
      expect(dates[0]).toBe("2026-05-30"); // Saturday
      expect(dates[1]).toBe("2026-05-31"); // Sunday
      expect(dates[2]).toBe("2026-06-06"); // Saturday
      expect(dates[3]).toBe("2026-06-07"); // Sunday
    });

    it("returns empty array for invalid cadence rule", () => {
      expect(generateDates("MONTHLY:1", "2026-05-25", 28)).toEqual([]);
      expect(generateDates("", "2026-05-25", 28)).toEqual([]);
    });

    it("handles zero-length range", () => {
      const dates = generateDates("WEEKLY:1,3,5", "2026-05-25", 0);
      expect(dates.length).toBe(0);
    });
  });

  describe("POST /api/service-objects/:id/service-plans", () => {
    let objectId: string;

    beforeAll(async () => {
      const res = await request(app)
        .post("/api/service-objects")
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({ name: "计划测试老人", idNumber: "11010119500307461X", siteId: "site-001" });
      objectId = res.body.id;
      createdObjectIds.push(objectId);
    });

    it("creates a plan with cadenceRule and generates schedules", async () => {
      const res = await request(app)
        .post(`/api/service-objects/${objectId}/service-plans`)
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({
          cadenceRule: "WEEKLY:1,3,5",
          cadenceLabel: "每周一、三、五",
          preferredTimeWindow: { start: "09:00", end: "10:00" },
          startDate: "2026-05-25",
          serviceProject: "长护险",
        });
      expect(res.status).toBe(200);
      expect(res.body.id).toBeDefined();
      expect(res.body.cadenceRule).toBe("WEEKLY:1,3,5");
      expect(res.body.status).toBe("active");
      createdPlanIds.push(res.body.id);

      // Verify schedules were generated
      const schedules = await prisma.serviceSchedule.findMany({
        where: { servicePlanId: res.body.id },
      });
      expect(schedules.length).toBeGreaterThan(0);
      // All schedules from WEEKLY:1,3,5 should be Mon/Wed/Fri
      for (const s of schedules) {
        const day = new Date(s.serviceDate + "T00:00:00").getDay();
        expect([1, 3, 5]).toContain(day);
      }
    });

    it("sets schedule status to 'unassigned' when no worker assigned", async () => {
      const res = await request(app)
        .post(`/api/service-objects/${objectId}/service-plans`)
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({
          cadenceRule: "WEEKLY:2",
          cadenceLabel: "每周二",
          preferredTimeWindow: { start: "14:00", end: "15:00" },
          startDate: "2026-05-25",
        });
      expect(res.status).toBe(200);
      createdPlanIds.push(res.body.id);

      const schedules = await prisma.serviceSchedule.findMany({
        where: { servicePlanId: res.body.id },
      });
      expect(schedules.length).toBeGreaterThan(0);
      for (const s of schedules) {
        expect(s.status).toBe("unassigned");
        expect(s.assignedSocialWorkerId).toBeNull();
      }
    });

    it("sets schedule status to 'scheduled' when worker is assigned", async () => {
      const res = await request(app)
        .post(`/api/service-objects/${objectId}/service-plans`)
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({
          cadenceRule: "WEEKLY:4",
          cadenceLabel: "每周四",
          preferredTimeWindow: { start: "10:00", end: "11:00" },
          startDate: "2026-05-25",
          primarySocialWorkerId: "sw-test-001",
          primarySocialWorkerName: "测试护工",
        });
      expect(res.status).toBe(200);
      createdPlanIds.push(res.body.id);

      const schedules = await prisma.serviceSchedule.findMany({
        where: { servicePlanId: res.body.id },
      });
      for (const s of schedules) {
        expect(s.status).toBe("scheduled");
        expect(s.assignedSocialWorkerId).toBe("sw-test-001");
      }
    });

    it("creates a plan without cadenceRule (one-time)", async () => {
      const res = await request(app)
        .post(`/api/service-objects/${objectId}/service-plans`)
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({
          cadenceRule: "",
          cadenceLabel: "",
          preferredTimeWindow: { start: "14:00", end: "15:00" },
          startDate: "2026-06-01",
          serviceProject: "长护险",
        });
      expect(res.status).toBe(200);
      createdPlanIds.push(res.body.id);

      // No schedules generated for empty cadenceRule
      const schedules = await prisma.serviceSchedule.findMany({
        where: { servicePlanId: res.body.id },
      });
      expect(schedules.length).toBe(0);
    });
  });

  describe("POST /api/service-plans/:id/cancel", () => {
    let planId: string;
    let objectId: string;

    beforeAll(async () => {
      const objRes = await request(app)
        .post("/api/service-objects")
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({ name: "取消测试老人", idNumber: "11010119500307461X", siteId: "site-001" });
      objectId = objRes.body.id;
      createdObjectIds.push(objectId);

      const planRes = await request(app)
        .post(`/api/service-objects/${objectId}/service-plans`)
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({
          cadenceRule: "WEEKLY:1,2,3,4,5",
          cadenceLabel: "每周一至周五",
          preferredTimeWindow: { start: "09:00", end: "10:00" },
          startDate: "2026-05-25",
        });
      planId = planRes.body.id;
      createdPlanIds.push(planId);
    });

    it("archives the plan and suspends future schedules", async () => {
      const res = await request(app)
        .post(`/api/service-plans/${planId}/cancel`)
        .set("Authorization", `Bearer ${operatorToken}`);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);

      // Plan status should be archived
      const plan = await prisma.servicePlan.findFirst({ where: { id: planId } });
      expect(plan?.status).toBe("archived");

      // Future schedules should be suspended
      const today = new Date().toISOString().slice(0, 10);
      const futureSchedules = await prisma.serviceSchedule.findMany({
        where: { servicePlanId: planId, serviceDate: { gte: today } },
      });
      for (const s of futureSchedules) {
        expect(s.status).toBe("suspended");
      }
    });
  });

  describe("POST /api/service-plans/:id/reactivate", () => {
    let planId: string;
    let objectId: string;

    beforeAll(async () => {
      const objRes = await request(app)
        .post("/api/service-objects")
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({ name: "恢复测试老人", idNumber: "11010119500307461X", siteId: "site-001" });
      objectId = objRes.body.id;
      createdObjectIds.push(objectId);

      const planRes = await request(app)
        .post(`/api/service-objects/${objectId}/service-plans`)
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({
          cadenceRule: "WEEKLY:1,3,5",
          cadenceLabel: "每周一、三、五",
          preferredTimeWindow: { start: "09:00", end: "10:00" },
          startDate: "2026-05-25",
        });
      planId = planRes.body.id;
      createdPlanIds.push(planId);

      // Cancel first
      await request(app)
        .post(`/api/service-plans/${planId}/cancel`)
        .set("Authorization", `Bearer ${operatorToken}`);
    });

    it("reactivates the plan and restores suspended schedules", async () => {
      const res = await request(app)
        .post(`/api/service-plans/${planId}/reactivate`)
        .set("Authorization", `Bearer ${operatorToken}`);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);

      const plan = await prisma.servicePlan.findFirst({ where: { id: planId } });
      expect(plan?.status).toBe("active");

      // Schedules should be restored to unassigned (no worker assigned)
      const today = new Date().toISOString().slice(0, 10);
      const futureSchedules = await prisma.serviceSchedule.findMany({
        where: { servicePlanId: planId, serviceDate: { gte: today }, status: { notIn: ["cancelled"] } },
      });
      for (const s of futureSchedules) {
        expect(s.status).toBe("unassigned");
      }
    });

    it("returns 404 for non-existent plan", async () => {
      const res = await request(app)
        .post("/api/service-plans/plan-nonexistent/reactivate")
        .set("Authorization", `Bearer ${operatorToken}`);
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/service-plans/:id", () => {
    let planId: string;
    let objectId: string;

    beforeAll(async () => {
      const objRes = await request(app)
        .post("/api/service-objects")
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({ name: "删除测试老人", idNumber: "11010119500307461X", siteId: "site-001" });
      objectId = objRes.body.id;
      createdObjectIds.push(objectId);

      const planRes = await request(app)
        .post(`/api/service-objects/${objectId}/service-plans`)
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({
          cadenceRule: "WEEKLY:2,4",
          cadenceLabel: "每周二、四",
          preferredTimeWindow: { start: "10:00", end: "11:00" },
          startDate: "2026-05-25",
        });
      planId = planRes.body.id;
      createdPlanIds.push(planId);
    });

    it("deletes plan and future non-completed schedules", async () => {
      const res = await request(app)
        .delete(`/api/service-plans/${planId}`)
        .set("Authorization", `Bearer ${operatorToken}`);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);

      // Plan should be gone
      const plan = await prisma.servicePlan.findFirst({ where: { id: planId } });
      expect(plan).toBeNull();

      // Future schedules should be gone
      const schedules = await prisma.serviceSchedule.findMany({
        where: { servicePlanId: planId },
      });
      expect(schedules.length).toBe(0);

      // Remove from cleanup list since it's already deleted
      const idx = createdPlanIds.indexOf(planId);
      if (idx > -1) createdPlanIds.splice(idx, 1);
    });
  });

  describe("PATCH /api/service-plans/:id", () => {
    let planId: string;
    let objectId: string;

    beforeAll(async () => {
      const objRes = await request(app)
        .post("/api/service-objects")
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({ name: "编辑测试老人", idNumber: "11010119500307461X", siteId: "site-001" });
      objectId = objRes.body.id;
      createdObjectIds.push(objectId);

      const planRes = await request(app)
        .post(`/api/service-objects/${objectId}/service-plans`)
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({
          cadenceRule: "WEEKLY:1,3,5",
          cadenceLabel: "每周一、三、五",
          preferredTimeWindow: { start: "09:00", end: "10:00" },
          startDate: "2026-05-25",
        });
      planId = planRes.body.id;
      createdPlanIds.push(planId);
    });

    it("updates description", async () => {
      const res = await request(app)
        .patch(`/api/service-plans/${planId}`)
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({ description: "每周一三五上门助餐" });
      expect(res.status).toBe(200);
      expect(res.body.description).toBe("每周一三五上门助餐");
    });

    it("returns 404 for non-existent plan", async () => {
      const res = await request(app)
        .patch("/api/service-plans/plan-nonexistent")
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({ description: "test" });
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/service-objects/:id/service-plans", () => {
    let objectId: string;

    beforeAll(async () => {
      const objRes = await request(app)
        .post("/api/service-objects")
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({ name: "查询测试老人", idNumber: "11010119500307461X", siteId: "site-001" });
      objectId = objRes.body.id;
      createdObjectIds.push(objectId);

      const planRes = await request(app)
        .post(`/api/service-objects/${objectId}/service-plans`)
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({
          cadenceRule: "WEEKLY:1",
          cadenceLabel: "每周一",
          preferredTimeWindow: { start: "10:00", end: "11:00" },
          startDate: "2026-05-25",
        });
      createdPlanIds.push(planRes.body.id);
    });

    it("returns plans for the service object", async () => {
      const res = await request(app)
        .get(`/api/service-objects/${objectId}/service-plans`)
        .set("Authorization", `Bearer ${operatorToken}`);
      expect(res.status).toBe(200);
      expect(res.body.servicePlans).toBeDefined();
      expect(Array.isArray(res.body.servicePlans)).toBe(true);
      expect(res.body.servicePlans.length).toBeGreaterThan(0);
      // Should include sopLinks
      expect(res.body.servicePlans[0]).toHaveProperty("sopLinks");
    });

    it("returns empty array for object with no plans", async () => {
      const objRes = await request(app)
        .post("/api/service-objects")
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({ name: "无计划老人", idNumber: "11010119500307461X", siteId: "site-001" });
      createdObjectIds.push(objRes.body.id);

      const res = await request(app)
        .get(`/api/service-objects/${objRes.body.id}/service-plans`)
        .set("Authorization", `Bearer ${operatorToken}`);
      expect(res.status).toBe(200);
      expect(res.body.servicePlans).toEqual([]);
    });
  });

  describe("Projected occurrences", () => {
    let objectId: string;
    let planId: string;

    beforeAll(async () => {
      const objRes = await request(app)
        .post("/api/service-objects")
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({ name: "投影测试老人", idNumber: "11010119500307461X", siteId: "site-001" });
      objectId = objRes.body.id;
      createdObjectIds.push(objectId);

      const planRes = await request(app)
        .post(`/api/service-objects/${objectId}/service-plans`)
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({
          cadenceRule: "WEEKLY:1,3,5",
          cadenceLabel: "每周一、三、五",
          preferredTimeWindow: { start: "09:00", end: "10:00" },
          startDate: "2026-05-25",
        });
      planId = planRes.body.id;
      createdPlanIds.push(planId);
    });

    it("includes projected occurrences for future date ranges", async () => {
      // Request a range beyond the 4-week DB window
      const res = await request(app)
        .get("/api/service-schedule-occurrences?rangeStart=2026-07-01&rangeEnd=2026-07-31&siteId=site-001")
        .set("Authorization", `Bearer ${operatorToken}`);
      expect(res.status).toBe(200);

      const projected = res.body.serviceSchedules.filter((s: any) => s.source === "projected");
      expect(projected.length).toBeGreaterThan(0);

      // Projected schedules without worker should be "unassigned"
      for (const p of projected) {
        if (!p.assignedSocialWorkerId) {
          expect(p.status).toBe("unassigned");
        }
      }
    });
  });
});
