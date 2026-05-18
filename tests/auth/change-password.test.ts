// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import request from "supertest";
import { authRoutes } from "../../server/routes/auth";
import { getDb } from "../../server/db/init";
import { seedDatabase } from "../../server/db/seed";
import bcrypt from "bcryptjs";

const JWT_SECRET = "test-pwd-secret";

function createApp() {
  const app = express();
  app.use(express.json());
  getDb();
  seedDatabase();
  app.use("/api", authRoutes(JWT_SECRET));
  return app;
}

describe("PATCH /api/auth/change-password", () => {
  let app: express.Express;
  let token: string;

  beforeAll(async () => {
    app = createApp();
    const res = await request(app).post("/api/auth/login").send({ username: "operator", password: "oper123" });
    token = res.body.token;
  });

  afterAll(() => {
    // Restore operator password to original so other tests are not affected
    const db = getDb();
    const hash = bcrypt.hashSync("oper123", 10);
    db.prepare("UPDATE users SET password_hash = ? WHERE username = 'operator'").run(hash);
  });

  it("changes password with valid old password", async () => {
    const res = await request(app)
      .patch("/api/auth/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({ oldPassword: "oper123", newPassword: "newpass123" });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    // Login with new password works
    const loginRes = await request(app).post("/api/auth/login").send({ username: "operator", password: "newpass123" });
    expect(loginRes.status).toBe(200);
  });

  it("rejects wrong old password", async () => {
    const res = await request(app)
      .patch("/api/auth/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({ oldPassword: "wrongold", newPassword: "newpass" });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("当前密码");
  });

  it("rejects short new password", async () => {
    const res = await request(app)
      .patch("/api/auth/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({ oldPassword: "newpass123", newPassword: "abc" });
    expect(res.status).toBe(400);
  });

  it("rejects unauthenticated request", async () => {
    const res = await request(app)
      .patch("/api/auth/change-password")
      .send({ oldPassword: "x", newPassword: "y12345" });
    expect(res.status).toBe(401);
  });
});
