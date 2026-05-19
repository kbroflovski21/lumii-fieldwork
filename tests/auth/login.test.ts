// @vitest-environment node
import { describe, it, expect, beforeAll } from "vitest";
import express from "express";
import request from "supertest";
import { authRoutes } from "../../server/routes/auth";

const JWT_SECRET = "test-auth-secret";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api", authRoutes(JWT_SECRET));
  return app;
}

describe("POST /api/auth/login", () => {
  let app: express.Express;

  beforeAll(() => {
    app = createApp();
  });

  it("logs in with valid credentials", async () => {
    const res = await request(app).post("/api/auth/login").send({ username: "admin", password: "admin123" });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe("org_admin");
    expect(res.body.user.name).toBe("系统管理员");
    expect(res.body.user.siteIds).toEqual(["site-001"]);
  });

  it("logs in as site_operator", async () => {
    const res = await request(app).post("/api/auth/login").send({ username: "operator", password: "oper123" });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("site_operator");
  });

  it("rejects wrong password", async () => {
    const res = await request(app).post("/api/auth/login").send({ username: "admin", password: "wrong" });
    expect(res.status).toBe(401);
    expect(res.body.error).toContain("密码");
  });

  it("rejects non-existent user", async () => {
    const res = await request(app).post("/api/auth/login").send({ username: "nobody", password: "test" });
    expect(res.status).toBe(401);
  });

  it("rejects empty body", async () => {
    const res = await request(app).post("/api/auth/login").send({});
    expect(res.status).toBe(400);
  });
});

describe("GET /api/auth/me", () => {
  let app: express.Express;
  let token: string;

  beforeAll(async () => {
    app = createApp();
    const res = await request(app).post("/api/auth/login").send({ username: "admin", password: "admin123" });
    token = res.body.token;
  });

  it("returns user info with valid token", async () => {
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe("admin");
    expect(res.body.user.role).toBe("org_admin");
  });

  it("rejects without token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("rejects invalid token", async () => {
    const res = await request(app).get("/api/auth/me").set("Authorization", "Bearer invalid");
    expect(res.status).toBe(401);
  });
});
