// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import request from "supertest";
import { authRoutes } from "../../server/routes/auth";
import { serviceObjectsRoutes } from "../../server/routes/serviceObjects";
import { requireAuth } from "../../server/middleware/requireAuth";
import { prisma } from "../../server/db/prisma";

const JWT_SECRET = "test-service-objects-secret";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api", authRoutes(JWT_SECRET));
  const authMw = requireAuth(JWT_SECRET);
  app.use("/api", authMw, serviceObjectsRoutes());
  return app;
}

describe("Service Objects API", () => {
  let app: express.Express;
  let operatorToken: string;
  const createdObjectIds: string[] = [];
  const createdContactIds: string[] = [];

  beforeAll(async () => {
    app = createApp();
    const opRes = await request(app).post("/api/auth/login").send({ username: "operator", password: "oper123" });
    operatorToken = opRes.body.token;
  });

  afterAll(async () => {
    for (const id of createdContactIds) {
      await prisma.familyContact.deleteMany({ where: { id } });
    }
    for (const id of createdObjectIds) {
      await prisma.serviceObject.deleteMany({ where: { id } });
    }
  });

  describe("POST /api/service-objects", () => {
    it("requires idNumber", async () => {
      const res = await request(app)
        .post("/api/service-objects")
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({ name: "张三", phone: "13800001111" });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("身份证号");
    });

    it("rejects invalid idNumber format", async () => {
      const res = await request(app)
        .post("/api/service-objects")
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({ name: "张三", idNumber: "12345" });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("身份证号格式");
    });

    it("creates service object with valid idNumber", async () => {
      const res = await request(app)
        .post("/api/service-objects")
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({ name: "测试老人", idNumber: "11010119500307461X", phone: "13800002222", siteId: "site-001" });
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.id).toBeDefined();
      expect(res.body.serviceObject.idNumber).toBe("11010119500307461X");
      createdObjectIds.push(res.body.id);
    });
  });

  describe("PATCH /api/service-objects/:id", () => {
    it("validates idNumber format on update", async () => {
      // First create one
      const createRes = await request(app)
        .post("/api/service-objects")
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({ name: "待更新老人", idNumber: "11010119500307461X", siteId: "site-001" });
      createdObjectIds.push(createRes.body.id);

      const res = await request(app)
        .patch(`/api/service-objects/${createRes.body.id}`)
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({ idNumber: "invalid" });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("身份证号格式");
    });

    it("updates name successfully", async () => {
      const createRes = await request(app)
        .post("/api/service-objects")
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({ name: "原名", idNumber: "11010119500307461X", siteId: "site-001" });
      createdObjectIds.push(createRes.body.id);

      const res = await request(app)
        .patch(`/api/service-objects/${createRes.body.id}`)
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({ name: "新名字" });
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.serviceObject.name).toBe("新名字");
    });
  });

  describe("POST /api/service-objects/:id/family-contacts", () => {
    let objectId: string;

    beforeAll(async () => {
      const createRes = await request(app)
        .post("/api/service-objects")
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({ name: "家属测试老人", idNumber: "11010119500307461X", siteId: "site-001" });
      objectId = createRes.body.id;
      createdObjectIds.push(objectId);
    });

    it("creates family contact", async () => {
      const res = await request(app)
        .post(`/api/service-objects/${objectId}/family-contacts`)
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({ name: "张女儿", relation: "女儿", phone: "13900001111", wechatId: "zhangnd" });
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe("张女儿");
      expect(res.body.relation).toBe("女儿");
      expect(res.body.phone).toBe("13900001111");
      expect(res.body.wechatId).toBe("zhangnd");
      createdContactIds.push(res.body.id);
    });

    it("requires name field", async () => {
      const res = await request(app)
        .post(`/api/service-objects/${objectId}/family-contacts`)
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({ relation: "儿子", phone: "13900002222" });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("姓名");
    });
  });

  describe("PATCH /api/family-contacts/:id", () => {
    let contactId: string;

    beforeAll(async () => {
      const objectRes = await request(app)
        .post("/api/service-objects")
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({ name: "联系人更新测试", idNumber: "11010119500307461X", siteId: "site-001" });
      createdObjectIds.push(objectRes.body.id);

      const contactRes = await request(app)
        .post(`/api/service-objects/${objectRes.body.id}/family-contacts`)
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({ name: "原联系人", relation: "儿子", phone: "13900003333" });
      contactId = contactRes.body.id;
      createdContactIds.push(contactId);
    });

    it("updates contact fields", async () => {
      const res = await request(app)
        .patch(`/api/family-contacts/${contactId}`)
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({ name: "更新后联系人", phone: "13900004444" });
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  });

  describe("DELETE /api/family-contacts/:id", () => {
    it("deletes existing contact", async () => {
      const objectRes = await request(app)
        .post("/api/service-objects")
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({ name: "删除测试老人", idNumber: "11010119500307461X", siteId: "site-001" });
      createdObjectIds.push(objectRes.body.id);

      const contactRes = await request(app)
        .post(`/api/service-objects/${objectRes.body.id}/family-contacts`)
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({ name: "待删除联系人", relation: "配偶" });
      const contactId = contactRes.body.id;

      const res = await request(app)
        .delete(`/api/family-contacts/${contactId}`)
        .set("Authorization", `Bearer ${operatorToken}`);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });

    it("returns 404 for non-existent contact", async () => {
      const res = await request(app)
        .delete("/api/family-contacts/family-nonexistent")
        .set("Authorization", `Bearer ${operatorToken}`);
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/service-objects", () => {
    it("filters by siteId", async () => {
      // Create objects in different sites
      const res1 = await request(app)
        .post("/api/service-objects")
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({ name: "站点A老人", idNumber: "11010119500307461X", siteId: "site-filter-a" });
      createdObjectIds.push(res1.body.id);

      const res2 = await request(app)
        .post("/api/service-objects")
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({ name: "站点B老人", idNumber: "11010119500307461X", siteId: "site-filter-b" });
      createdObjectIds.push(res2.body.id);

      const listA = await request(app)
        .get("/api/service-objects?siteId=site-filter-a")
        .set("Authorization", `Bearer ${operatorToken}`);
      expect(listA.status).toBe(200);
      expect(listA.body.serviceObjects.every((o: any) => o.name !== "站点B老人")).toBe(true);
      const hasA = listA.body.serviceObjects.some((o: any) => o.name === "站点A老人");
      expect(hasA).toBe(true);
    });

    it("returns all when no siteId filter", async () => {
      const res = await request(app)
        .get("/api/service-objects")
        .set("Authorization", `Bearer ${operatorToken}`);
      expect(res.status).toBe(200);
      expect(res.body.serviceObjects).toBeDefined();
      expect(Array.isArray(res.body.serviceObjects)).toBe(true);
    });
  });
});
