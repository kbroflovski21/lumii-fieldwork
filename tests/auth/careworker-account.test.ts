// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import request from "supertest";
import { authRoutes } from "../../server/routes/auth";
import { socialWorkersRoutes } from "../../server/routes/socialWorkers";
import { requireAuth } from "../../server/middleware/requireAuth";
import { optionalAuth } from "../../server/middleware/optionalAuth";
import { prisma } from "../../server/db/prisma";

const JWT_SECRET = "test-cw-secret";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api", authRoutes(JWT_SECRET));
  const authMw = requireAuth(JWT_SECRET);
  const optAuth = optionalAuth(JWT_SECRET);
  app.use("/api", optAuth, socialWorkersRoutes());
  return app;
}

describe("Careworker auto-account creation via POST /social-workers", () => {
  let app: express.Express;
  let operatorToken: string;
  const createdWorkerIds: string[] = [];

  beforeAll(async () => {
    app = createApp();
    operatorToken = (await request(app).post("/api/auth/login").send({ username: "operator", password: "oper123" })).body.token;
  });

  afterAll(async () => {
    for (const id of createdWorkerIds) {
      const worker = await prisma.socialWorker.findUnique({ where: { id } });
      if (worker) {
        await prisma.user.deleteMany({ where: { id: worker.userId } });
        await prisma.socialWorker.delete({ where: { id } });
      }
    }
  });

  it("creating a social worker auto-creates CW account", async () => {
    const res = await request(app)
      .post("/api/social-workers")
      .set("Authorization", `Bearer ${operatorToken}`)
      .send({ name: "测试自动账号", phone: "13800009001", workerType: "service_personnel" });
    expect(res.status).toBe(201);
    createdWorkerIds.push(res.body.id);

    expect(res.body.account).toBeDefined();
    expect(res.body.account.username).toMatch(/^CW\d{6}$/);
    expect(res.body.account.initialPassword).toBeDefined();
    expect(res.body.account.initialPassword.length).toBeGreaterThanOrEqual(6);
  });

  it("CW account has mustChangePassword=true", async () => {
    const res = await request(app)
      .post("/api/social-workers")
      .set("Authorization", `Bearer ${operatorToken}`)
      .send({ name: "测试改密标记", phone: "13800009002" });
    createdWorkerIds.push(res.body.id);

    const user = await prisma.user.findFirst({ where: { username: res.body.account.username } });
    expect(user!.mustChangePassword).toBe(true);
    expect(user!.initialPassword).toBe(res.body.account.initialPassword);
  });

  it("CW can login and gets mustChangePassword flag", async () => {
    const createRes = await request(app)
      .post("/api/social-workers")
      .set("Authorization", `Bearer ${operatorToken}`)
      .send({ name: "测试登录", phone: "13800009003" });
    createdWorkerIds.push(createRes.body.id);

    const loginRes = await request(app).post("/api/auth/login")
      .send({ username: createRes.body.account.username, password: createRes.body.account.initialPassword });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.mustChangePassword).toBe(true);
    expect(loginRes.body.user.role).toBe("careworker");
  });

  it("forced password change clears mustChangePassword", async () => {
    const createRes = await request(app)
      .post("/api/social-workers")
      .set("Authorization", `Bearer ${operatorToken}`)
      .send({ name: "测试改密", phone: "13800009004" });
    createdWorkerIds.push(createRes.body.id);

    const loginRes = await request(app).post("/api/auth/login")
      .send({ username: createRes.body.account.username, password: createRes.body.account.initialPassword });
    const cwToken = loginRes.body.token;

    const changeRes = await request(app).patch("/api/auth/change-password")
      .set("Authorization", `Bearer ${cwToken}`)
      .send({ oldPassword: "__force_change__", newPassword: "newpass123" });
    expect(changeRes.status).toBe(200);

    const user = await prisma.user.findFirst({ where: { username: createRes.body.account.username } });
    expect(user!.mustChangePassword).toBe(false);
    expect(user!.initialPassword).toBeNull();

    // Can login with new password
    const reloginRes = await request(app).post("/api/auth/login")
      .send({ username: createRes.body.account.username, password: "newpass123" });
    expect(reloginRes.status).toBe(200);
    expect(reloginRes.body.mustChangePassword).toBe(false);
  });

  it("GET /social-workers includes account info", async () => {
    const res = await request(app)
      .get("/api/social-workers")
      .set("Authorization", `Bearer ${operatorToken}`);
    expect(res.status).toBe(200);

    const withAccount = res.body.socialWorkers.find((w: any) => w.account?.username?.startsWith("CW"));
    expect(withAccount).toBeDefined();
    expect(withAccount.account.username).toMatch(/^CW\d{6}$/);
  });
});
