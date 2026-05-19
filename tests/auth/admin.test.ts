// @vitest-environment node
import { describe, it, expect, beforeAll } from "vitest";
import express from "express";
import request from "supertest";
import { authRoutes } from "../../server/routes/auth";
import { adminRoutes } from "../../server/routes/admin";
import { requireAuth } from "../../server/middleware/requireAuth";

const JWT_SECRET = "test-admin-secret";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api", authRoutes(JWT_SECRET));
  const authMw = requireAuth(JWT_SECRET);
  app.use("/api", authMw, adminRoutes());
  return app;
}

describe("Admin User Management", () => {
  let app: express.Express;
  let adminToken: string;
  let operatorToken: string;

  beforeAll(async () => {
    app = createApp();
    const adminRes = await request(app).post("/api/auth/login").send({ username: "admin", password: "admin123" });
    adminToken = adminRes.body.token;
    const opRes = await request(app).post("/api/auth/login").send({ username: "operator", password: "oper123" });
    operatorToken = opRes.body.token;
  });

  it("admin can list users", async () => {
    const res = await request(app).get("/api/admin/users").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.users.length).toBeGreaterThanOrEqual(3);
  });

  it("operator cannot list users", async () => {
    const res = await request(app).get("/api/admin/users").set("Authorization", `Bearer ${operatorToken}`);
    expect(res.status).toBe(403);
  });

  it("admin can create user", async () => {
    const uname = `testuser-${Date.now()}`;
    const res = await request(app).post("/api/admin/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ username: uname, password: "pass123", name: "新用户", role: "site_operator", siteIds: ["site-001"] });
    expect(res.status).toBe(201);
    expect(res.body.username).toBe(uname);
  });

  it("rejects duplicate username", async () => {
    const res = await request(app).post("/api/admin/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ username: "admin", password: "pass123", name: "重复", role: "site_operator" });
    expect(res.status).toBe(409);
  });

  it("admin can update user", async () => {
    const list = await request(app).get("/api/admin/users").set("Authorization", `Bearer ${adminToken}`);
    const targetId = list.body.users.find((u: any) => u.username === "operator")?.id;
    expect(targetId).toBeDefined();

    const res = await request(app).patch(`/api/admin/users/${targetId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "更新后的运营员" });
    expect(res.status).toBe(200);
  });

  it("admin can reset password", async () => {
    const list = await request(app).get("/api/admin/users").set("Authorization", `Bearer ${adminToken}`);
    const targetId = list.body.users.find((u: any) => u.username === "supervisor")?.id;
    expect(targetId).toBeDefined();

    const res = await request(app).post(`/api/admin/users/${targetId}/reset-password`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ password: "newpass123" });
    expect(res.status).toBe(200);
  });

  it("unauthenticated request rejected", async () => {
    const res = await request(app).get("/api/admin/users");
    expect(res.status).toBe(401);
  });
});
