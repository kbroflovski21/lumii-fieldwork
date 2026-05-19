import { describe, it, expect } from "vitest";
import request from "supertest";
import express from "express";
import { authRoutes } from "../../server/routes/auth";

const JWT_SECRET = "test-secret";

describe("dev-token endpoint removed", () => {
  it("GET /api/auth/dev-token returns 404 (removed)", async () => {
    const app = express();
    app.use(express.json());
    app.use("/api", authRoutes(JWT_SECRET));

    const res = await request(app).get("/api/auth/dev-token");
    // Should be 404 since the endpoint no longer exists in auth routes
    expect(res.status).toBe(404);
  });

  it("POST /api/auth/login still works", async () => {
    const app = express();
    app.use(express.json());
    app.use("/api", authRoutes(JWT_SECRET));

    const res = await request(app).post("/api/auth/login").send({ username: "admin", password: "admin123" });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });
});
