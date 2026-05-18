import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { gyTokenMiddleware } from "../../server/middleware/gy-token";
import { signGyToken } from "../../server/ws/auth";

const GY_SECRET = "test-gy-secret";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/protected", gyTokenMiddleware(GY_SECRET));
  app.get("/api/protected/test", (req, res) => {
    res.json({ actor: req.gyActor });
  });
  return app;
}

describe("gyTokenMiddleware", () => {
  it("passes with valid token and attaches gyActor", async () => {
    const app = createApp();
    const token = signGyToken({
      sub: "u1", role: "site_operator", siteIds: ["s1"], scope: "home",
      permissions: { social_workers: ["read", "write"] },
    }, GY_SECRET);

    const res = await request(app).get("/api/protected/test").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.actor.sub).toBe("u1");
    expect(res.body.actor.role).toBe("site_operator");
    expect(res.body.actor.siteIds).toEqual(["s1"]);
    expect(res.body.actor.scope).toBe("home");
  });

  it("rejects missing Authorization header with 401", async () => {
    const app = createApp();
    const res = await request(app).get("/api/protected/test");
    expect(res.status).toBe(401);
    expect(res.body.error).toContain("missing");
  });

  it("rejects invalid token with 401", async () => {
    const app = createApp();
    const res = await request(app).get("/api/protected/test").set("Authorization", "Bearer garbage");
    expect(res.status).toBe(401);
    expect(res.body.error).toContain("invalid");
  });

  it("rejects token signed with wrong secret", async () => {
    const app = createApp();
    const token = signGyToken({ sub: "u1", role: "op", siteIds: [], scope: "home", permissions: {} }, "wrong-secret");
    const res = await request(app).get("/api/protected/test").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it("rejects malformed Authorization header", async () => {
    const app = createApp();
    const res = await request(app).get("/api/protected/test").set("Authorization", "Basic abc123");
    expect(res.status).toBe(401);
  });
});
