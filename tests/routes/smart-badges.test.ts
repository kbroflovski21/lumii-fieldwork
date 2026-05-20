// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import request from "supertest";
import { authRoutes } from "../../server/routes/auth";
import { smartBadgesRoutes } from "../../server/routes/smartBadges";
import { socialWorkersRoutes } from "../../server/routes/socialWorkers";
import { requireAuth } from "../../server/middleware/requireAuth";
import { optionalAuth } from "../../server/middleware/optionalAuth";
import { prisma } from "../../server/db/prisma";

const JWT_SECRET = "test-smart-badges-secret";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api", authRoutes(JWT_SECRET));
  const authMw = requireAuth(JWT_SECRET);
  const optAuth = optionalAuth(JWT_SECRET);
  app.use("/api", authMw, smartBadgesRoutes());
  app.use("/api", optAuth, socialWorkersRoutes());
  return app;
}

describe("Smart Badges API", () => {
  let app: express.Express;
  let operatorToken: string;
  const createdBadgeIds: string[] = [];
  const createdWorkerIds: string[] = [];

  beforeAll(async () => {
    app = createApp();
    const opRes = await request(app).post("/api/auth/login").send({ username: "operator", password: "oper123" });
    operatorToken = opRes.body.token;
  });

  afterAll(async () => {
    for (const id of createdBadgeIds) {
      await prisma.smartBadge.deleteMany({ where: { id } });
    }
    for (const id of createdWorkerIds) {
      const worker = await prisma.socialWorker.findUnique({ where: { id } });
      if (worker) {
        await prisma.user.deleteMany({ where: { id: worker.userId } });
        await prisma.socialWorker.deleteMany({ where: { id } });
      }
    }
  });

  describe("PATCH /api/smart-badges/:id", () => {
    it("updates preferredWorkerName when preferredWorkerId changes", async () => {
      // Create a social worker first
      const workerRes = await request(app)
        .post("/api/social-workers")
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({ name: "工牌测试员", phone: "13800009999" });
      const workerId = workerRes.body.id;
      createdWorkerIds.push(workerId);

      // Create a badge
      const badgeRes = await request(app)
        .post("/api/smart-badges/activations")
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({ deviceCode: "FW-TEST-001", siteId: "site-001" });
      const badgeId = badgeRes.body.id;
      createdBadgeIds.push(badgeId);

      // Assign the worker to the badge
      const patchRes = await request(app)
        .patch(`/api/smart-badges/${badgeId}`)
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({ preferredWorkerId: workerId });
      expect(patchRes.status).toBe(200);
      expect(patchRes.body.preferredWorkerId).toBe(workerId);
      expect(patchRes.body.preferredWorkerName).toBe("工牌测试员");
    });

    it("clears preferredWorkerName when preferredWorkerId is empty", async () => {
      // Create a badge with a worker assigned
      const workerRes = await request(app)
        .post("/api/social-workers")
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({ name: "清除测试员", phone: "13800008888" });
      createdWorkerIds.push(workerRes.body.id);

      const badgeRes = await request(app)
        .post("/api/smart-badges/activations")
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({ deviceCode: "FW-TEST-002", siteId: "site-001", preferredWorkerId: workerRes.body.id });
      createdBadgeIds.push(badgeRes.body.id);

      // Clear the worker
      const patchRes = await request(app)
        .patch(`/api/smart-badges/${badgeRes.body.id}`)
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({ preferredWorkerId: "" });
      expect(patchRes.status).toBe(200);
      expect(patchRes.body.preferredWorkerId).toBeNull();
      expect(patchRes.body.preferredWorkerName).toBeNull();
    });
  });

  describe("GET /api/smart-badges", () => {
    it("filters by siteId", async () => {
      // Create badges in different sites
      const res1 = await request(app)
        .post("/api/smart-badges/activations")
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({ deviceCode: "FW-SITE-A", siteId: "site-badge-filter-a" });
      createdBadgeIds.push(res1.body.id);

      const res2 = await request(app)
        .post("/api/smart-badges/activations")
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({ deviceCode: "FW-SITE-B", siteId: "site-badge-filter-b" });
      createdBadgeIds.push(res2.body.id);

      const listA = await request(app)
        .get("/api/smart-badges?siteId=site-badge-filter-a")
        .set("Authorization", `Bearer ${operatorToken}`);
      expect(listA.status).toBe(200);
      expect(listA.body.smartBadges.some((b: any) => b.deviceCode === "FW-SITE-A")).toBe(true);
      expect(listA.body.smartBadges.every((b: any) => b.deviceCode !== "FW-SITE-B")).toBe(true);
    });

    it("returns all badges without siteId filter", async () => {
      const res = await request(app)
        .get("/api/smart-badges")
        .set("Authorization", `Bearer ${operatorToken}`);
      expect(res.status).toBe(200);
      expect(res.body.smartBadges).toBeDefined();
      expect(Array.isArray(res.body.smartBadges)).toBe(true);
    });
  });
});
