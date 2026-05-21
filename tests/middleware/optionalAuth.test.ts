import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { optionalAuth } from "../../server/middleware/optionalAuth";
import { signJwt, signGyToken } from "../../server/ws/auth";

const JWT_SECRET = "test-jwt-secret";
const GY_SECRET = "test-gy-secret";

function createApp(gySecret?: string) {
  const app = express();
  app.use(express.json());
  app.use(optionalAuth(JWT_SECRET, gySecret));
  app.get("/api/test", (req, res) => {
    res.json({ authUser: req.authUser ?? null });
  });
  return app;
}

describe("optionalAuth middleware", () => {
  it("allows request without token (no authUser)", async () => {
    const app = createApp();
    const res = await request(app).get("/api/test");
    expect(res.status).toBe(200);
    expect(res.body.authUser).toBeNull();
  });

  it("attaches authUser from valid user JWT", async () => {
    const app = createApp();
    const token = signJwt({ sub: "u1", username: "admin", name: "管理员", role: "org_admin", orgId: "org-001", siteIds: ["site-001"] }, JWT_SECRET, "1h");
    const res = await request(app).get("/api/test").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.authUser.role).toBe("org_admin");
    expect(res.body.authUser.siteIds).toEqual(["site-001"]);
  });

  it("attaches authUser from valid GY_API_TOKEN", async () => {
    const app = createApp(GY_SECRET);
    const token = signGyToken({ sub: "cc-user", role: "site_operator", siteIds: ["site-001"], scope: "home", permissions: {} }, GY_SECRET);
    const res = await request(app).get("/api/test").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.authUser.role).toBe("site_operator");
    expect(res.body.authUser.username).toBe("cc-session");
  });

  it("allows through with invalid token (no authUser, no 401)", async () => {
    const app = createApp();
    const res = await request(app).get("/api/test").set("Authorization", "Bearer garbage");
    expect(res.status).toBe(200);
    expect(res.body.authUser).toBeNull();
  });

  it("ignores GY token when gySecret not configured", async () => {
    const app = createApp(); // no gySecret
    const token = signGyToken({ sub: "cc", role: "op", siteIds: [], scope: "home", permissions: {} }, GY_SECRET);
    const res = await request(app).get("/api/test").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.authUser).toBeNull(); // GY token not verified without secret
  });

  it("skips processing if authUser is already set (by prior middleware)", async () => {
    // Simulate requireAuth setting authUser before optionalAuth runs
    const app = express();
    app.use(express.json());
    // First middleware sets authUser
    app.use((req, _res, next) => {
      (req as any).authUser = {
        id: "u-prior",
        username: "prior-mw",
        name: "Prior MW User",
        role: "org_admin",
        orgId: "org-001",
        siteIds: ["site-001"],
      };
      next();
    });
    // Then optionalAuth runs — should NOT overwrite
    app.use(optionalAuth(JWT_SECRET, GY_SECRET));
    app.get("/api/test", (req, res) => {
      res.json({ authUser: req.authUser ?? null });
    });

    // Send a GY token that would set a different user
    const token = signGyToken({ sub: "cc-different", role: "site_operator", siteIds: ["site-999"], scope: "home", permissions: {} }, GY_SECRET);
    const res = await request(app).get("/api/test").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    // Should still have the prior middleware's user, not the GY token user
    expect(res.body.authUser.id).toBe("u-prior");
    expect(res.body.authUser.username).toBe("prior-mw");
  });
});
