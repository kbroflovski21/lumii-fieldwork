// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import request from "supertest";
import { authRoutes } from "../../server/routes/auth";
import { socialWorkersRoutes } from "../../server/routes/socialWorkers";
import { requireAuth } from "../../server/middleware/requireAuth";
import { optionalAuth } from "../../server/middleware/optionalAuth";
import { prisma } from "../../server/db/prisma";

const JWT_SECRET = "test-sw-secret";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api", authRoutes(JWT_SECRET));
  const optAuth = optionalAuth(JWT_SECRET);
  app.use("/api", optAuth, socialWorkersRoutes());
  return app;
}

describe("Social Worker Reset Password", () => {
  let app: express.Express;
  let operatorToken: string;
  let createdWorkerId: string;
  let createdAccount: { username: string; initialPassword: string };

  beforeAll(async () => {
    app = createApp();
    const opRes = await request(app).post("/api/auth/login").send({ username: "operator", password: "oper123" });
    operatorToken = opRes.body.token;

    // Create a social worker to test with
    const createRes = await request(app)
      .post("/api/social-workers")
      .set("Authorization", `Bearer ${operatorToken}`)
      .send({ name: "密码重置测试员", phone: "13800008888" });
    createdWorkerId = createRes.body.id;
    createdAccount = createRes.body.account;
  });

  afterAll(async () => {
    if (createdWorkerId) {
      const worker = await prisma.socialWorker.findUnique({ where: { id: createdWorkerId } });
      if (worker) {
        await prisma.user.deleteMany({ where: { id: worker.userId } });
        await prisma.socialWorker.delete({ where: { id: createdWorkerId } });
      }
    }
  });

  it("resets password and returns new credentials", async () => {
    const res = await request(app)
      .post(`/api/social-workers/${createdWorkerId}/reset-password`)
      .set("Authorization", `Bearer ${operatorToken}`);
    expect(res.status).toBe(200);
    expect(res.body.username).toBe(createdAccount.username);
    expect(res.body.initialPassword).toBeDefined();
    expect(res.body.initialPassword).not.toBe(createdAccount.initialPassword);
  });

  it("new password works for login after reset", async () => {
    const resetRes = await request(app)
      .post(`/api/social-workers/${createdWorkerId}/reset-password`)
      .set("Authorization", `Bearer ${operatorToken}`);

    const loginRes = await request(app).post("/api/auth/login")
      .send({ username: resetRes.body.username, password: resetRes.body.initialPassword });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.mustChangePassword).toBe(true);
  });

  it("reset sets mustChangePassword back to true", async () => {
    // First, change password to clear mustChangePassword
    const resetRes1 = await request(app)
      .post(`/api/social-workers/${createdWorkerId}/reset-password`)
      .set("Authorization", `Bearer ${operatorToken}`);

    const loginRes = await request(app).post("/api/auth/login")
      .send({ username: resetRes1.body.username, password: resetRes1.body.initialPassword });
    const cwToken = loginRes.body.token;

    // Change password (clears mustChangePassword)
    await request(app).patch("/api/auth/change-password")
      .set("Authorization", `Bearer ${cwToken}`)
      .send({ oldPassword: "__force_change__", newPassword: "myNewPass123" });

    const user1 = await prisma.user.findFirst({ where: { username: resetRes1.body.username } });
    expect(user1!.mustChangePassword).toBe(false);

    // Now reset again
    const resetRes2 = await request(app)
      .post(`/api/social-workers/${createdWorkerId}/reset-password`)
      .set("Authorization", `Bearer ${operatorToken}`);
    expect(resetRes2.status).toBe(200);

    const user2 = await prisma.user.findFirst({ where: { username: resetRes1.body.username } });
    expect(user2!.mustChangePassword).toBe(true);
    expect(user2!.initialPassword).toBe(resetRes2.body.initialPassword);
  });

  it("returns 404 for non-existent worker", async () => {
    const res = await request(app)
      .post("/api/social-workers/worker-nonexistent/reset-password")
      .set("Authorization", `Bearer ${operatorToken}`);
    expect(res.status).toBe(404);
  });
});
