import { describe, it, expect, beforeEach } from "vitest";
import { ChatDb } from "../../server/db/chat";

// These tests require a running MySQL database with Prisma schema applied.
// They use the real Prisma client singleton.

describe("ChatDb", () => {
  let chatDb: ChatDb;

  beforeEach(async () => {
    chatDb = new ChatDb();
    await chatDb.migrate(); // no-op but keeps the contract
  });

  it("inserts and retrieves a message", async () => {
    const id = await chatDb.insert("a1", "sk-test-1", "user", "hello", "text");
    expect(id).toBeGreaterThan(0);
    const msgs = await chatDb.getRecent("a1", "sk-test-1", 50);
    expect(msgs.length).toBeGreaterThanOrEqual(1);
    const last = msgs[msgs.length - 1];
    expect(last.content).toBe("hello");
    expect(last.role).toBe("user");
  });

  it("returns messages in chronological order (newest last)", async () => {
    const sk = `sk-order-${Date.now()}`;
    await chatDb.insert("a", sk, "user", "msg1", "text");
    await chatDb.insert("a", sk, "assistant", "msg2", "text");
    await chatDb.insert("a", sk, "user", "msg3", "text");
    const msgs = await chatDb.getRecent("a", sk, 50);
    expect(msgs.map(m => m.content)).toEqual(["msg1", "msg2", "msg3"]);
  });

  it("respects limit (returns last N)", async () => {
    const sk = `sk-limit-${Date.now()}`;
    await chatDb.insert("a", sk, "user", "msg1", "text");
    await chatDb.insert("a", sk, "assistant", "msg2", "text");
    await chatDb.insert("a", sk, "user", "msg3", "text");
    const msgs = await chatDb.getRecent("a", sk, 2);
    expect(msgs).toHaveLength(2);
    expect(msgs[0].content).toBe("msg2");
    expect(msgs[1].content).toBe("msg3");
  });

  it("isolates by session_key", async () => {
    const sk1 = `sk-iso1-${Date.now()}`;
    const sk2 = `sk-iso2-${Date.now()}`;
    await chatDb.insert("a", sk1, "user", "m1", "text");
    await chatDb.insert("a", sk2, "user", "m2", "text");
    expect(await chatDb.getRecent("a", sk1, 50)).toHaveLength(1);
    expect(await chatDb.getRecent("a", sk2, 50)).toHaveLength(1);
  });

  it("paginates with getBefore", async () => {
    const sk = `sk-page-${Date.now()}`;
    await chatDb.insert("a", sk, "user", "msg1", "text");
    await chatDb.insert("a", sk, "user", "msg2", "text");
    const id3 = await chatDb.insert("a", sk, "user", "msg3", "text");
    const page = await chatDb.getBefore("a", sk, id3, 10);
    expect(page.messages.map(m => m.content)).toEqual(["msg1", "msg2"]);
    expect(page.hasMore).toBe(false);
  });

  it("hasMore is true when more messages exist", async () => {
    const sk = `sk-more-${Date.now()}`;
    for (let i = 0; i < 5; i++) await chatDb.insert("a", sk, "user", `msg${i}`, "text");
    const page = await chatDb.getBefore("a", sk, 999999999, 3);
    expect(page.messages).toHaveLength(3);
    expect(page.hasMore).toBe(true);
  });

  it("getLastMessages returns last N for wip", async () => {
    const sk = `sk-wip-${Date.now()}`;
    await chatDb.insert("a", sk, "user", "u1", "text");
    await chatDb.insert("a", sk, "assistant", "a1", "text");
    await chatDb.insert("a", sk, "user", "u2", "text");
    const last = await chatDb.getLastMessages("a", sk, 1);
    expect(last).toHaveLength(1);
    expect(last[0].role).toBe("user");
  });

  it("stores card_data as string", async () => {
    const sk = `sk-card-${Date.now()}`;
    const data = JSON.stringify({ buttons: [["yes"]] });
    await chatDb.insert("a", sk, "assistant", "choose", "buttons", data);
    const msgs = await chatDb.getRecent("a", sk, 50);
    expect(msgs[0].msg_type).toBe("buttons");
    expect(msgs[0].card_data).toBe(data);
  });
});
