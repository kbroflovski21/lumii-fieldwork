import { describe, it, expect } from "vitest";
import { computeWip, WIP_TIMEOUT_MS } from "../../server/ws/wip";

describe("computeWip", () => {
  const now = Date.now();

  it("returns false when agent disconnected", () => {
    expect(computeWip([{ role: "user", timestamp: new Date(now - 1000).toISOString() }], false, now)).toBe(false);
  });

  it("returns false when no messages", () => {
    expect(computeWip([], true, now)).toBe(false);
  });

  it("returns false when last message is assistant", () => {
    expect(computeWip([{ role: "assistant", timestamp: new Date(now - 1000).toISOString() }], true, now)).toBe(false);
  });

  it("returns true when last is user within timeout", () => {
    expect(computeWip([{ role: "user", timestamp: new Date(now - 1000).toISOString() }], true, now)).toBe(true);
  });

  it("returns false when user message exceeds timeout", () => {
    const old = new Date(now - WIP_TIMEOUT_MS - 1000).toISOString();
    expect(computeWip([{ role: "user", timestamp: old }], true, now)).toBe(false);
  });

  it("returns true when timestamp missing", () => {
    expect(computeWip([{ role: "user" }], true, now)).toBe(true);
  });

  it("only considers last message", () => {
    expect(computeWip([
      { role: "user", timestamp: new Date(now - 1000).toISOString() },
      { role: "assistant", timestamp: new Date(now - 500).toISOString() },
    ], true, now)).toBe(false);
  });
});
