// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import request from "supertest";
import { authRoutes } from "../../server/routes/auth";
import { serviceObjectsRoutes } from "../../server/routes/serviceObjects";
import { serviceRecordsRoutes } from "../../server/routes/serviceRecords";
import { requireAuth } from "../../server/middleware/requireAuth";
import { prisma } from "../../server/db/prisma";

const JWT_SECRET = "test-service-records-secret";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api", authRoutes(JWT_SECRET));
  const authMw = requireAuth(JWT_SECRET);
  app.use("/api", authMw, serviceObjectsRoutes());
  app.use("/api", authMw, serviceRecordsRoutes());
  app.use((err: any, _req: any, res: any, _next: any) => {
    console.error("Express error:", err.message);
    res.status(500).json({ error: err.message });
  });
  return app;
}

describe("Service Records API", () => {
  let app: express.Express;
  let operatorToken: string;
  const createdRecordIds: string[] = [];
  const createdObjectIds: string[] = [];
  let testRecordId: string;
  let testObjectId: string;

  beforeAll(async () => {
    app = createApp();
    const opRes = await request(app).post("/api/auth/login").send({ username: "operator", password: "oper123" });
    operatorToken = opRes.body.token;

    // Create a test service object with an address for auto-resolve testing
    const objRes = await request(app)
      .post("/api/service-objects")
      .set("Authorization", `Bearer ${operatorToken}`)
      .send({ name: "记录测试老人", idNumber: "11010119500307461X", siteId: "site-001", address: "杭州市西湖区翠苑街道100号" });
    testObjectId = objRes.body.id;
    createdObjectIds.push(testObjectId);

    // Create a test service record directly in DB
    const recordId = `sr-test-${Date.now()}`;
    await prisma.serviceRecord.create({
      data: {
        id: recordId,
        serviceDate: "2026-05-25",
        startTime: "09:00",
        endTime: "10:00",
        durationMinutes: 60,
        siteId: "site-001",
        socialWorkerId: null,
        socialWorkerName: null,
        serviceObjectId: null,
        serviceObjectName: null,
        elderName: null,
        serviceAddress: null,
        badgeId: "badge-test-001",
        serviceProject: "长护险",
      },
    });
    testRecordId = recordId;
    createdRecordIds.push(recordId);
  });

  afterAll(async () => {
    for (const id of createdRecordIds) {
      await prisma.serviceRecord.deleteMany({ where: { id } });
    }
    for (const id of createdObjectIds) {
      await prisma.servicePlan.deleteMany({ where: { serviceObjectId: id } });
      await prisma.serviceObject.deleteMany({ where: { id } });
    }
  });

  describe("PATCH /api/service-records/:id", () => {
    it("updates socialWorkerId and socialWorkerName", async () => {
      const res = await request(app)
        .patch(`/api/service-records/${testRecordId}`)
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({ socialWorkerId: "sw-001", socialWorkerName: "张护工" });
      expect(res.status).toBe(200);
      expect(res.body.socialWorkerId).toBe("sw-001");
      expect(res.body.socialWorkerName).toBe("张护工");
    });

    it("updates serviceObjectId, serviceObjectName, and auto-resolves serviceAddress", async () => {
      const res = await request(app)
        .patch(`/api/service-records/${testRecordId}`)
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({ serviceObjectId: testObjectId, serviceObjectName: "记录测试老人" });
      expect(res.status).toBe(200);
      expect(res.body.serviceObjectId).toBe(testObjectId);
      expect(res.body.serviceObjectName).toBe("记录测试老人");
      // serviceAddress should be auto-resolved from the service object's address
      expect(res.body.serviceAddress).toBe("杭州市西湖区翠苑街道100号");
    });

    it("updates elderName", async () => {
      const res = await request(app)
        .patch(`/api/service-records/${testRecordId}`)
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({ elderName: "王老伯" });
      expect(res.status).toBe(200);
      expect(res.body.elderName).toBe("王老伯");
    });

    it("clears socialWorkerId when set to empty string", async () => {
      // First set it
      await request(app)
        .patch(`/api/service-records/${testRecordId}`)
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({ socialWorkerId: "sw-002", socialWorkerName: "李护工" });

      // Then clear it
      const res = await request(app)
        .patch(`/api/service-records/${testRecordId}`)
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({ socialWorkerId: "", socialWorkerName: null });
      expect(res.status).toBe(200);
      expect(res.body.socialWorkerId).toBeNull();
      expect(res.body.socialWorkerName).toBeNull();
    });

    it("does nothing when body is empty", async () => {
      const before = await request(app)
        .get(`/api/service-records/${testRecordId}`)
        .set("Authorization", `Bearer ${operatorToken}`);

      const res = await request(app)
        .patch(`/api/service-records/${testRecordId}`)
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({});
      expect(res.status).toBe(200);
      expect(res.body.elderName).toBe(before.body.elderName);
    });
  });

  describe("toApi shape", () => {
    it("includes elderName and serviceAddress fields in response", async () => {
      // Set known values first
      await request(app)
        .patch(`/api/service-records/${testRecordId}`)
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({ elderName: "测试老人名", serviceAddress: "测试地址123号" });

      const res = await request(app)
        .get(`/api/service-records/${testRecordId}`)
        .set("Authorization", `Bearer ${operatorToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("elderName");
      expect(res.body).toHaveProperty("serviceAddress");
      expect(res.body.elderName).toBe("测试老人名");
      expect(res.body.serviceAddress).toBe("测试地址123号");
    });

    it("includes socialWorkerId and serviceObjectId in list response", async () => {
      const res = await request(app)
        .get("/api/service-records?siteId=site-001")
        .set("Authorization", `Bearer ${operatorToken}`);
      expect(res.status).toBe(200);
      expect(res.body.serviceRecords).toBeDefined();
      expect(Array.isArray(res.body.serviceRecords)).toBe(true);
      const record = res.body.serviceRecords.find((r: any) => r.id === testRecordId);
      expect(record).toBeDefined();
      expect(record).toHaveProperty("elderName");
      expect(record).toHaveProperty("serviceAddress");
      expect(record).toHaveProperty("socialWorkerId");
      expect(record).toHaveProperty("socialWorkerName");
      expect(record).toHaveProperty("serviceObjectId");
      expect(record).toHaveProperty("serviceObjectName");
    });
  });
});
