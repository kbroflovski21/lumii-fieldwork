import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { personaRoutes } from "../../server/routes/persona";

const WS_TOKEN = "test-ws-token";
const AGENT_ID = "test-agent";

function createApp() {
  const app = express();
  app.use("/api", personaRoutes(WS_TOKEN, AGENT_ID));
  return app;
}

describe("GET /api/agents/:id/persona", () => {
  it("returns persona with valid token and agent id", async () => {
    const app = createApp();
    const res = await request(app)
      .get(`/api/agents/${AGENT_ID}/persona`)
      .set("Authorization", `Bearer ${WS_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.prompt).toBeDefined();
    expect(typeof res.body.prompt).toBe("string");
    expect(res.body.source).toMatch(/custom|default|none/);
  });

  it("rejects missing Authorization header", async () => {
    const app = createApp();
    const res = await request(app).get(`/api/agents/${AGENT_ID}/persona`);
    expect(res.status).toBe(401);
  });

  it("rejects wrong token", async () => {
    const app = createApp();
    const res = await request(app)
      .get(`/api/agents/${AGENT_ID}/persona`)
      .set("Authorization", "Bearer wrong-token");
    expect(res.status).toBe(401);
  });

  it("rejects wrong agent id", async () => {
    const app = createApp();
    const res = await request(app)
      .get("/api/agents/unknown-agent/persona")
      .set("Authorization", `Bearer ${WS_TOKEN}`);
    expect(res.status).toBe(403);
  });
});
