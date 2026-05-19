// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import request from "supertest";
import { authRoutes } from "../../server/routes/auth";
import { siteRoutes } from "../../server/routes/sites";
import { requireAuth } from "../../server/middleware/requireAuth";
import { prisma } from "../../server/db/prisma";

const JWT_SECRET = "test-sites-secret";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api", authRoutes(JWT_SECRET));
  const authMw = requireAuth(JWT_SECRET);
  app.use("/api", authMw, siteRoutes());
  return app;
}

describe("Site Management API", () => {
  let app: express.Express;
  let adminToken: string;
  let operatorToken: string;
  const createdSiteIds: string[] = [];

  beforeAll(async () => {
    app = createApp();
    const adminRes = await request(app).post("/api/auth/login").send({ username: "admin", password: "admin123" });
    adminToken = adminRes.body.token;
    const opRes = await request(app).post("/api/auth/login").send({ username: "operator", password: "oper123" });
    operatorToken = opRes.body.token;
  });

  afterAll(async () => {
    for (const id of createdSiteIds) {
      await prisma.site.deleteMany({ where: { id } });
    }
  });

  describe("GET /api/admin/sites", () => {
    it("admin can list sites", async () => {
      const res = await request(app).get("/api/admin/sites").set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.sites).toBeDefined();
      expect(Array.isArray(res.body.sites)).toBe(true);
      expect(res.body.sites.length).toBeGreaterThanOrEqual(1);
    });

    it("operator cannot list sites", async () => {
      const res = await request(app).get("/api/admin/sites").set("Authorization", `Bearer ${operatorToken}`);
      expect(res.status).toBe(403);
    });

    it("unauthenticated request rejected", async () => {
      const res = await request(app).get("/api/admin/sites");
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/admin/sites", () => {
    it("admin can create a site", async () => {
      const res = await request(app).post("/api/admin/sites")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "测试站点", address: "测试地址123" });
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe("测试站点");
      expect(res.body.address).toBe("测试地址123");
      createdSiteIds.push(res.body.id);
    });

    it("rejects missing name", async () => {
      const res = await request(app).post("/api/admin/sites")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ address: "无名站点" });
      expect(res.status).toBe(400);
    });

    it("operator cannot create site", async () => {
      const res = await request(app).post("/api/admin/sites")
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({ name: "不该创建的站点" });
      expect(res.status).toBe(403);
    });
  });

  describe("PATCH /api/admin/sites/:id", () => {
    it("admin can update a site", async () => {
      // Create a site first
      const createRes = await request(app).post("/api/admin/sites")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "待更新站点" });
      createdSiteIds.push(createRes.body.id);

      const res = await request(app).patch(`/api/admin/sites/${createRes.body.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "已更新站点", contactPhone: "021-12345678" });
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });

    it("returns 404 for non-existent site", async () => {
      const res = await request(app).patch("/api/admin/sites/site-nonexistent")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "幽灵站点" });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/admin/sites/:id", () => {
    it("admin can delete a site", async () => {
      const createRes = await request(app).post("/api/admin/sites")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "待删除站点" });
      const siteId = createRes.body.id;

      const res = await request(app).delete(`/api/admin/sites/${siteId}`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      // No need to track for cleanup since it's already deleted
    });

    it("returns 404 for non-existent site", async () => {
      const res = await request(app).delete("/api/admin/sites/site-nonexistent")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/admin/sites/:id/operators", () => {
    it("admin can assign operators to a site", async () => {
      // Get the admin user ID for assignment
      const usersRes = await request(app).get("/api/admin/users").set("Authorization", `Bearer ${adminToken}`);
      const operatorUser = usersRes.body.users.find((u: any) => u.username === "operator");
      expect(operatorUser).toBeDefined();

      // Create a site
      const createRes = await request(app).post("/api/admin/sites")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "运营分配测试站" });
      createdSiteIds.push(createRes.body.id);

      const res = await request(app).put(`/api/admin/sites/${createRes.body.id}/operators`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ userIds: [operatorUser.id] });
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);

      // Verify assignment via GET sites
      const sitesRes = await request(app).get("/api/admin/sites").set("Authorization", `Bearer ${adminToken}`);
      const site = sitesRes.body.sites.find((s: any) => s.id === createRes.body.id);
      expect(site.operators.length).toBe(1);
      expect(site.operators[0].username).toBe("operator");
    });

    it("rejects non-array userIds", async () => {
      const createRes = await request(app).post("/api/admin/sites")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "错误参数测试站" });
      createdSiteIds.push(createRes.body.id);

      const res = await request(app).put(`/api/admin/sites/${createRes.body.id}/operators`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ userIds: "not-an-array" });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/auth/my-sites", () => {
    it("admin gets all org sites", async () => {
      const res = await request(app).get("/api/auth/my-sites").set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.sites).toBeDefined();
      expect(Array.isArray(res.body.sites)).toBe(true);
    });

    it("operator gets assigned sites", async () => {
      const res = await request(app).get("/api/auth/my-sites").set("Authorization", `Bearer ${operatorToken}`);
      expect(res.status).toBe(200);
      expect(res.body.sites).toBeDefined();
      expect(Array.isArray(res.body.sites)).toBe(true);
    });

    it("unauthenticated request rejected", async () => {
      const res = await request(app).get("/api/auth/my-sites");
      expect(res.status).toBe(401);
    });
  });
});
