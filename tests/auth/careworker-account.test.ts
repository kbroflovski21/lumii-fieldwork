// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import request from "supertest";
import { authRoutes } from "../../server/routes/auth";
import { prisma } from "../../server/db/prisma";

const JWT_SECRET = "test-cw-secret";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api", authRoutes(JWT_SECRET));
  return app;
}

describe("POST /api/auth/create-careworker-account", () => {
  let app: express.Express;
  let operatorToken: string;
  let adminToken: string;
  const createdPhones: string[] = [];

  beforeAll(async () => {
    app = createApp();
    operatorToken = (await request(app).post("/api/auth/login").send({ username: "operator", password: "oper123" })).body.token;
    adminToken = (await request(app).post("/api/auth/login").send({ username: "admin", password: "admin123" })).body.token;
  });

  afterAll(async () => {
    // Clean up created careworker accounts so other tests are not affected
    for (const phone of createdPhones) {
      await prisma.user.deleteMany({ where: { username: phone } });
    }
  });

  it("site_operator can create careworker account", async () => {
    const phone = `138${Date.now().toString().slice(-8)}`;
    createdPhones.push(phone);
    const res = await request(app)
      .post("/api/auth/create-careworker-account")
      .set("Authorization", `Bearer ${operatorToken}`)
      .send({ phone, name: "测试服务员", siteId: "site-001" });
    expect(res.status).toBe(201);
    expect(res.body.username).toBe(phone);
    expect(res.body.password).toBeDefined();
    expect(res.body.password.length).toBeGreaterThanOrEqual(6);
    expect(res.body.role).toBe("careworker");
  });

  it("org_admin can also create careworker account", async () => {
    const phone = `139${Date.now().toString().slice(-8)}`;
    createdPhones.push(phone);
    const res = await request(app)
      .post("/api/auth/create-careworker-account")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ phone, name: "管理员创建的服务员" });
    expect(res.status).toBe(201);
  });

  it("rejects duplicate phone", async () => {
    const phone = `137${Date.now().toString().slice(-8)}`;
    createdPhones.push(phone);
    await request(app).post("/api/auth/create-careworker-account")
      .set("Authorization", `Bearer ${operatorToken}`)
      .send({ phone, name: "第一个" });

    const res = await request(app).post("/api/auth/create-careworker-account")
      .set("Authorization", `Bearer ${operatorToken}`)
      .send({ phone, name: "重复的" });
    expect(res.status).toBe(409);
  });

  it("careworker can login with generated credentials", async () => {
    const phone = `136${Date.now().toString().slice(-8)}`;
    createdPhones.push(phone);
    const createRes = await request(app).post("/api/auth/create-careworker-account")
      .set("Authorization", `Bearer ${operatorToken}`)
      .send({ phone, name: "可登录服务员" });

    const loginRes = await request(app).post("/api/auth/login")
      .send({ username: phone, password: createRes.body.password });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.role).toBe("careworker");
  });

  it("unauthenticated request rejected", async () => {
    const res = await request(app).post("/api/auth/create-careworker-account")
      .send({ phone: "13800000000", name: "test" });
    expect(res.status).toBe(401);
  });

  it("supervisor cannot create careworker account", async () => {
    const supToken = (await request(app).post("/api/auth/login").send({ username: "supervisor", password: "super123" })).body.token;
    const res = await request(app).post("/api/auth/create-careworker-account")
      .set("Authorization", `Bearer ${supToken}`)
      .send({ phone: "13800009999", name: "test" });
    expect(res.status).toBe(403);
  });
});
