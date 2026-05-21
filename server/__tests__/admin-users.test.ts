import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma before importing the module
vi.mock("../db/prisma", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { adminRoutes } from "../routes/admin";
import { prisma } from "../db/prisma";

// Helper to create mock Express req/res
function mockReqRes(overrides: {
  method?: string;
  path?: string;
  query?: Record<string, string>;
  body?: any;
  params?: Record<string, string>;
  authUser?: { id: string; role: string; orgId: string; username: string } | null;
}) {
  const req: any = {
    method: overrides.method ?? "GET",
    path: overrides.path ?? "/admin/users",
    query: overrides.query ?? {},
    body: overrides.body ?? {},
    params: overrides.params ?? {},
    authUser: overrides.authUser ?? { id: "u1", role: "org_admin", orgId: "org1", username: "admin" },
  };
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    statusCode: 200,
  };
  return { req, res };
}

// Use the router to get the handler for a specific route
function getHandler(router: any, method: string, path: string) {
  // Express Router stores routes in router.stack
  for (const layer of router.stack) {
    if (layer.route) {
      const route = layer.route;
      if (route.path === path && route.methods[method.toLowerCase()]) {
        // Return the last handler (the actual handler, not middleware)
        return route.stack[route.stack.length - 1].handle;
      }
    }
  }
  throw new Error(`No handler found for ${method} ${path}`);
}

describe("GET /admin/users", () => {
  let router: any;
  let handler: Function;

  beforeEach(() => {
    vi.clearAllMocks();
    router = adminRoutes();
    handler = getHandler(router, "GET", "/admin/users");
  });

  it("excludes careworker users by default", async () => {
    const mockUsers = [
      { id: "u1", username: "admin1", name: "Admin", role: "org_admin", orgId: "org1", siteIds: [], phone: "", status: "active", createdAt: new Date("2026-01-01") },
      { id: "u2", username: "op1", name: "Operator", role: "site_operator", orgId: "org1", siteIds: ["s1"], phone: "", status: "active", createdAt: new Date("2026-01-02") },
    ];
    vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as any);

    const { req, res } = mockReqRes({ query: {} });
    await handler(req, res);

    // Verify prisma was called with careworker exclusion filter
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          orgId: "org1",
          role: { not: "careworker" },
        }),
      })
    );

    expect(res.json).toHaveBeenCalledWith({
      users: expect.arrayContaining([
        expect.objectContaining({ id: "u1", role: "org_admin" }),
        expect.objectContaining({ id: "u2", role: "site_operator" }),
      ]),
    });
  });

  it("includes careworker users when include_careworker=true", async () => {
    const mockUsers = [
      { id: "u1", username: "admin1", name: "Admin", role: "org_admin", orgId: "org1", siteIds: [], phone: "", status: "active", createdAt: new Date("2026-01-01") },
      { id: "u3", username: "cw1", name: "Careworker", role: "careworker", orgId: "org1", siteIds: ["s1"], phone: "", status: "active", createdAt: new Date("2026-01-03") },
    ];
    vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as any);

    const { req, res } = mockReqRes({ query: { include_careworker: "true" } });
    await handler(req, res);

    // Verify prisma was called WITHOUT careworker exclusion
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { orgId: "org1" },
      })
    );

    expect(res.json).toHaveBeenCalledWith({
      users: expect.arrayContaining([
        expect.objectContaining({ id: "u1", role: "org_admin" }),
        expect.objectContaining({ id: "u3", role: "careworker" }),
      ]),
    });
  });

  it("rejects non-admin users with 403", async () => {
    const { req, res } = mockReqRes({
      authUser: { id: "u2", role: "site_operator", orgId: "org1", username: "op1" },
    });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "无权限" });
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated requests with 403", async () => {
    const req: any = { query: {}, authUser: undefined };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it("serializes createdAt as ISO string", async () => {
    const testDate = new Date("2026-05-20T12:00:00Z");
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: "u1", username: "a", name: "A", role: "org_admin", orgId: "org1", siteIds: [], phone: "", status: "active", createdAt: testDate },
    ] as any);

    const { req, res } = mockReqRes({});
    await handler(req, res);

    const response = res.json.mock.calls[0][0];
    expect(response.users[0].createdAt).toBe("2026-05-20T12:00:00.000Z");
  });
});
