import { describe, it, expect } from "vitest";
import { signJwt, verifyJwt, verifyWsToken, signGyToken, verifyGyToken } from "../../server/ws/auth";

describe("JWT auth", () => {
  const SECRET = "test-secret";

  it("signs and verifies valid token", () => {
    const token = signJwt({ userId: "u1", name: "Test" }, SECRET, "1h");
    const p = verifyJwt(token, SECRET);
    expect(p).not.toBeNull();
    expect(p!.userId).toBe("u1");
    expect(p!.name).toBe("Test");
  });

  it("returns null for invalid token", () => {
    expect(verifyJwt("garbage", SECRET)).toBeNull();
  });

  it("returns null for wrong secret", () => {
    const token = signJwt({ userId: "u1" }, SECRET, "1h");
    expect(verifyJwt(token, "wrong")).toBeNull();
  });
});

describe("ws_token auth", () => {
  it("accepts matching token", () => {
    expect(verifyWsToken("abc123", "abc123")).toBe(true);
  });

  it("rejects non-matching", () => {
    expect(verifyWsToken("wrong", "abc123")).toBe(false);
  });

  it("rejects empty", () => {
    expect(verifyWsToken("", "abc123")).toBe(false);
  });
});

describe("GY API token", () => {
  const SECRET = "gy-secret";

  it("signs and verifies", () => {
    const token = signGyToken({ sub: "u1", role: "op", siteIds: ["s1"], scope: "home", permissions: { sw: ["read"] } }, SECRET);
    const p = verifyGyToken(token, SECRET);
    expect(p).not.toBeNull();
    expect(p!.sub).toBe("u1");
    expect(p!.siteIds).toEqual(["s1"]);
  });

  it("rejects wrong secret", () => {
    const token = signGyToken({ sub: "u1", role: "op", siteIds: [], scope: "home", permissions: {} }, SECRET);
    expect(verifyGyToken(token, "wrong")).toBeNull();
  });
});
