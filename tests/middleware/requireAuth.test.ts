import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { requireAuth, requireRole } from "../../server/middleware/requireAuth";
import { signJwt, signGyToken } from "../../server/ws/auth";

const SECRET = "test-middleware-secret";
const GY_SECRET = "test-gy-secret";

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

function createAppWithGy() {
  const app = express();
  app.use(express.json());

  // Route that accepts both JWT and GY token
  app.get("/protected", requireAuth(SECRET, GY_SECRET), (req, res) => {
    res.json({ user: req.authUser });
  });

  // Admin-only route with GY token support
  app.get("/admin-only", requireAuth(SECRET, GY_SECRET), requireRole("org_admin"), (req, res) => {
    res.json({ ok: true, user: req.authUser });
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

describe("requireAuth with gyTokenSecret fallback", () => {
  it("accepts GY token when gyTokenSecret is configured", async () => {
    const app = createAppWithGy();
    const token = signGyToken({
      sub: "cc-user",
      role: "org_admin",
      siteIds: ["site-001"],
      scope: "admin",
      permissions: { users: ["read", "write"] },
    }, GY_SECRET);

    const res = await request(app).get("/protected").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe("cc-user");
    expect(res.body.user.username).toBe("cc-session");
    expect(res.body.user.role).toBe("org_admin");
  });

  it("GY token with org_admin role passes requireRole('org_admin')", async () => {
    const app = createAppWithGy();
    const token = signGyToken({
      sub: "cc-user",
      role: "org_admin",
      siteIds: ["site-001"],
      scope: "admin",
      permissions: {},
    }, GY_SECRET);

    const res = await request(app).get("/admin-only").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("org_admin");
  });

  it("GY token defaults empty role + admin scope to org_admin", async () => {
    const app = createAppWithGy();
    const token = signGyToken({
      sub: "cc-user",
      role: "",
      siteIds: ["site-001"],
      scope: "admin",
      permissions: {},
    }, GY_SECRET);

    const res = await request(app).get("/protected").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("org_admin");
  });

  it("GY token defaults empty role + non-admin scope to site_operator", async () => {
    const app = createAppWithGy();
    const token = signGyToken({
      sub: "cc-user",
      role: "",
      siteIds: ["site-001"],
      scope: "social_workers",
      permissions: {},
    }, GY_SECRET);

    const res = await request(app).get("/protected").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("site_operator");
  });

  it("GY token with explicit site_operator role is preserved", async () => {
    const app = createAppWithGy();
    const token = signGyToken({
      sub: "cc-user",
      role: "site_operator",
      siteIds: ["site-001"],
      scope: "social_workers",
      permissions: {},
    }, GY_SECRET);

    const res = await request(app).get("/protected").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("site_operator");
  });

  it("prefers JWT over GY token when JWT is valid", async () => {
    const app = createAppWithGy();
    const token = signJwt({
      sub: "u1",
      username: "admin",
      name: "Admin",
      role: "org_admin",
      orgId: "org-001",
      siteIds: ["site-001"],
    }, SECRET, "1h");

    const res = await request(app).get("/protected").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    // Should use JWT payload, not GY
    expect(res.body.user.username).toBe("admin");
    expect(res.body.user.id).toBe("u1");
  });

  it("rejects GY token signed with wrong secret", async () => {
    const app = createAppWithGy();
    const token = signGyToken({
      sub: "cc-user",
      role: "org_admin",
      siteIds: [],
      scope: "admin",
      permissions: {},
    }, "wrong-secret");

    const res = await request(app).get("/protected").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it("rejects GY token when gyTokenSecret is not configured", async () => {
    const app = createApp(); // no gyTokenSecret
    const token = signGyToken({
      sub: "cc-user",
      role: "org_admin",
      siteIds: [],
      scope: "admin",
      permissions: {},
    }, GY_SECRET);

    const res = await request(app).get("/protected").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
  });
});
