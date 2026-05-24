import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { requireAuth } from "../../server/middleware/requireAuth";
import { signJwt, signGyToken } from "../../server/ws/auth";

const JWT_SECRET = "test-jwt-secret";
const GY_SECRET = "test-gy-secret";

describe("requireAuth GY token siteIds field", () => {
  function createApp() {
    const app = express();
    app.use(express.json());
    app.get("/test", requireAuth(JWT_SECRET, GY_SECRET), (req, res) => {
      res.json({ user: req.authUser });
    });
    return app;
  }

  it("reads site_ids from GY token (snake_case fallback)", async () => {
    const app = createApp();
    const token = signGyToken({
      sub: "ou_feishu_test",
      role: "service_supervisor",
      siteIds: ["site-001"],
      scope: "site-001",
      permissions: {},
    }, GY_SECRET);

    const res = await request(app).get("/test").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.siteIds).toEqual(["site-001"]);
    expect(res.body.user.forceSiteId).toBe("site-001");
  });

  it("sets forceSiteId from scope for site-xxx", async () => {
    const app = createApp();
    const token = signGyToken({
      sub: "ou_test",
      role: "service_supervisor",
      siteIds: ["site-002"],
      scope: "site-002",
      permissions: {},
    }, GY_SECRET);

    const res = await request(app).get("/test").set("Authorization", `Bearer ${token}`);
    expect(res.body.user.forceSiteId).toBe("site-002");
  });

  it("no forceSiteId for admin scope", async () => {
    const app = createApp();
    const token = signGyToken({
      sub: "ou_admin",
      role: "org_admin",
      siteIds: [],
      scope: "admin",
      permissions: {},
    }, GY_SECRET);

    const res = await request(app).get("/test").set("Authorization", `Bearer ${token}`);
    expect(res.body.user.forceSiteId).toBeUndefined();
  });
});
