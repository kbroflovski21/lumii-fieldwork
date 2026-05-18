import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { ChatDb } from "../../server/db/chat";

describe("ChatDb", () => {
  let db: Database.Database;
  let chatDb: ChatDb;

  beforeEach(() => {
    db = new Database(":memory:");
    db.pragma("journal_mode = WAL");
    chatDb = new ChatDb(db);
    chatDb.migrate();
  });

  afterEach(() => { db.close(); });

  it("inserts and retrieves a message", () => {
    const id = chatDb.insert("a1", "sk1", "user", "hello", "text");
    expect(id).toBeGreaterThan(0);
    const msgs = chatDb.getRecent("a1", "sk1", 50);
    expect(msgs).toHaveLength(1);
    expect(msgs[0].content).toBe("hello");
    expect(msgs[0].role).toBe("user");
  });

  it("returns messages in chronological order (newest last)", () => {
    chatDb.insert("a", "sk", "user", "msg1", "text");
    chatDb.insert("a", "sk", "assistant", "msg2", "text");
    chatDb.insert("a", "sk", "user", "msg3", "text");
    const msgs = chatDb.getRecent("a", "sk", 50);
    expect(msgs.map(m => m.content)).toEqual(["msg1", "msg2", "msg3"]);
  });

  it("respects limit (returns last N)", () => {
    chatDb.insert("a", "sk", "user", "msg1", "text");
    chatDb.insert("a", "sk", "assistant", "msg2", "text");
    chatDb.insert("a", "sk", "user", "msg3", "text");
    const msgs = chatDb.getRecent("a", "sk", 2);
    expect(msgs).toHaveLength(2);
    expect(msgs[0].content).toBe("msg2");
    expect(msgs[1].content).toBe("msg3");
  });

  it("isolates by session_key", () => {
    chatDb.insert("a", "sk1", "user", "m1", "text");
    chatDb.insert("a", "sk2", "user", "m2", "text");
    expect(chatDb.getRecent("a", "sk1", 50)).toHaveLength(1);
    expect(chatDb.getRecent("a", "sk2", 50)).toHaveLength(1);
  });

  it("paginates with getBefore", () => {
    const id1 = chatDb.insert("a", "sk", "user", "msg1", "text");
    const id2 = chatDb.insert("a", "sk", "user", "msg2", "text");
    const id3 = chatDb.insert("a", "sk", "user", "msg3", "text");
    const page = chatDb.getBefore("a", "sk", id3, 10);
    expect(page.messages.map(m => m.content)).toEqual(["msg1", "msg2"]);
    expect(page.hasMore).toBe(false);
  });

  it("hasMore is true when more messages exist", () => {
    for (let i = 0; i < 5; i++) chatDb.insert("a", "sk", "user", `msg${i}`, "text");
    const page = chatDb.getBefore("a", "sk", 999, 3);
    expect(page.messages).toHaveLength(3);
    expect(page.hasMore).toBe(true);
  });

  it("getLastMessages returns last N for wip", () => {
    chatDb.insert("a", "sk", "user", "u1", "text");
    chatDb.insert("a", "sk", "assistant", "a1", "text");
    chatDb.insert("a", "sk", "user", "u2", "text");
    const last = chatDb.getLastMessages("a", "sk", 1);
    expect(last).toHaveLength(1);
    expect(last[0].role).toBe("user");
  });

  it("stores card_data as JSON string", () => {
    const data = JSON.stringify({ buttons: [["yes"]] });
    chatDb.insert("a", "sk", "assistant", "choose", "buttons", data);
    const msgs = chatDb.getRecent("a", "sk", 50);
    expect(msgs[0].msg_type).toBe("buttons");
    expect(msgs[0].card_data).toBe(data);
  });
});
