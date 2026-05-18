import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { requireAuth, requireRole } from "../../server/middleware/requireAuth";
import { signJwt } from "../../server/ws/auth";

const SECRET = "test-middleware-secret";

function createApp() {
  const app = express();
  app.use(express.json());

  // Public route
  app.get("/public", (_req, res) => res.json({ ok: true }));

  // Protected route
  app.get("/protected", requireAuth(SECRET), (req, res) => {
    res.json({ user: req.authUser });
  });

  // Admin-only route
  app.get("/admin-only", requireAuth(SECRET), requireRole("org_admin"), (req, res) => {
    res.json({ ok: true });
  });

  return app;
}

describe("requireAuth middleware", () => {
  it("passes with valid token", async () => {
    const app = createApp();
    const token = signJwt({ sub: "u1", username: "test", name: "Test", role: "site_operator", orgId: "org-001", siteIds: ["site-001"] }, SECRET, "1h");
    const res = await request(app).get("/protected").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("site_operator");
    expect(res.body.user.siteIds).toEqual(["site-001"]);
  });

  it("rejects missing header", async () => {
    const app = createApp();
    const res = await request(app).get("/protected");
    expect(res.status).toBe(401);
  });

  it("rejects invalid token", async () => {
    const app = createApp();
    const res = await request(app).get("/protected").set("Authorization", "Bearer invalid");
    expect(res.status).toBe(401);
  });

  it("does not affect public routes", async () => {
    const app = createApp();
    const res = await request(app).get("/public");
    expect(res.status).toBe(200);
  });
});

describe("requireRole middleware", () => {
  it("allows matching role", async () => {
    const app = createApp();
    const token = signJwt({ sub: "u1", role: "org_admin", orgId: "org-001", siteIds: [] }, SECRET, "1h");
    const res = await request(app).get("/admin-only").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it("rejects non-matching role", async () => {
    const app = createApp();
    const token = signJwt({ sub: "u1", role: "site_operator", orgId: "org-001", siteIds: [] }, SECRET, "1h");
    const res = await request(app).get("/admin-only").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});
