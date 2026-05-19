// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createServer, type Server } from "http";
import { WebSocket } from "ws";
import { AgentConnectionPool } from "../../server/ws/pool";
import { ChatDb } from "../../server/db/chat";
import { signJwt } from "../../server/ws/auth";

/** Buffered message queue that never drops messages between awaits */
function createMsgQueue(ws: WebSocket) {
  const buffer: any[] = [];
  const waiters: Array<(msg: any) => void> = [];
  ws.on("message", (d) => {
    const msg = JSON.parse(d.toString());
    if (waiters.length > 0) { waiters.shift()!(msg); }
    else { buffer.push(msg); }
  });
  return {
    next(): Promise<any> {
      if (buffer.length > 0) return Promise.resolve(buffer.shift()!);
      return new Promise((resolve) => { waiters.push(resolve); });
    }
  };
}

function waitForOpen(ws: WebSocket): Promise<void> {
  return new Promise((resolve) => { if (ws.readyState === WebSocket.OPEN) return resolve(); ws.once("open", resolve); });
}

describe("AgentConnectionPool", () => {
  let server: Server;
  let pool: AgentConnectionPool;
  let port: number;
  let chatDb: ChatDb;

  beforeEach(async () => {
    chatDb = new ChatDb();
    await chatDb.migrate();
    pool = new AgentConnectionPool({ chatDb, jwtSecret: "test-secret", wsToken: "agent-token", agentId: "test-agent" });
    server = createServer();
    server.on("upgrade", (req, socket, head) => {
      const url = new URL(req.url!, "http://localhost");
      if (url.pathname === "/api/ws/agent") pool.handleAgentUpgrade(req, socket, head);
      else if (url.pathname === "/api/ws/chat") pool.handleUserUpgrade(req, socket, head);
    });
    await new Promise<void>((r) => server.listen(0, () => { port = (server.address() as any).port; r(); }));
  });

  afterEach(() => { pool.shutdown(); server.close(); });

  it("accepts agent registration with valid ws_token", async () => {
    const ws = new WebSocket(`ws://localhost:${port}/api/ws/agent`);
    const q = createMsgQueue(ws);
    await waitForOpen(ws);
    ws.send(JSON.stringify({ type: "register", platform: "dashboard", capabilities: ["attachments"], metadata: { agent_id: "test-agent", token: "agent-token" } }));
    const ack = await q.next();
    expect(ack.type).toBe("register_ack");
    expect(ack.ok).toBe(true);
    expect(pool.isAgentConnected()).toBe(true);
    ws.close();
  });

  it("rejects agent with wrong ws_token", async () => {
    const ws = new WebSocket(`ws://localhost:${port}/api/ws/agent`);
    const q = createMsgQueue(ws);
    await waitForOpen(ws);
    ws.send(JSON.stringify({ type: "register", platform: "dashboard", capabilities: [], metadata: { agent_id: "test-agent", token: "wrong" } }));
    const ack = await q.next();
    expect(ack.ok).toBe(false);
    expect(ack.error).toContain("auth");
    ws.close();
  });

  it("relays user message to agent and reply back", async () => {
    // Agent connect
    const agentWs = new WebSocket(`ws://localhost:${port}/api/ws/agent`);
    const agentQ = createMsgQueue(agentWs);
    await waitForOpen(agentWs);
    agentWs.send(JSON.stringify({ type: "register", platform: "dashboard", capabilities: [], metadata: { agent_id: "test-agent", token: "agent-token" } }));
    await agentQ.next(); // register_ack

    // User connect
    const token = signJwt({ userId: "u1", name: "Tester" }, "test-secret", "1h");
    const userWs = new WebSocket(`ws://localhost:${port}/api/ws/chat?agentId=test-agent&sessionId=home&token=${token}`);
    const userQ = createMsgQueue(userWs);
    const init = await userQ.next();
    expect(init.type).toBe("init");
    expect(init.connected).toBe(true);

    // User sends
    userWs.send(JSON.stringify({ type: "send", content: "hello" }));
    const echo = await userQ.next();
    expect(echo.role).toBe("user");
    expect(echo.content).toBe("hello");
    const wipUp = await userQ.next();
    expect(wipUp.wip).toBe(true);

    // Agent receives
    const bridge = await agentQ.next();
    expect(bridge.type).toBe("message");
    expect(bridge.content).toBe("hello");
    expect(bridge.session_key).toBe("web:test-agent:u1:home");

    // Agent replies
    agentWs.send(JSON.stringify({ type: "reply", content: "hi back", reply_ctx: bridge.session_key, session_key: bridge.session_key }));
    const reply = await userQ.next();
    expect(reply.type).toBe("message");
    expect(reply.role).toBe("assistant");
    expect(reply.content).toBe("hi back");

    // Wait for async DB persistence
    await new Promise((r) => setTimeout(r, 200));

    // Check DB persistence
    const msgs = await chatDb.getRecent("test-agent", "web:test-agent:u1:home", 50);
    expect(msgs).toHaveLength(2);

    agentWs.close(); userWs.close();
  });

  it("handles streaming", async () => {
    const agentWs = new WebSocket(`ws://localhost:${port}/api/ws/agent`);
    const agentQ = createMsgQueue(agentWs);
    await waitForOpen(agentWs);
    agentWs.send(JSON.stringify({ type: "register", platform: "dashboard", capabilities: [], metadata: { agent_id: "test-agent", token: "agent-token" } }));
    await agentQ.next(); // register_ack

    const token = signJwt({ userId: "u1", name: "T" }, "test-secret", "1h");
    const userWs = new WebSocket(`ws://localhost:${port}/api/ws/chat?agentId=test-agent&sessionId=home&token=${token}`);
    const userQ = createMsgQueue(userWs);
    await userQ.next(); // init
    const sk = "web:test-agent:u1:home";

    // preview_start
    agentWs.send(JSON.stringify({ type: "preview_start", ref_id: "r1", session_key: sk, reply_ctx: sk, content: "He" }));
    const ss = await userQ.next();
    expect(ss.type).toBe("stream_start");
    expect(ss.content).toBe("He");

    const ack = await agentQ.next();
    expect(ack.type).toBe("preview_ack");
    const ph = ack.preview_handle;

    // reply_stream
    agentWs.send(JSON.stringify({ type: "reply_stream", session_key: sk, preview_handle: ph, content: "Hello world" }));
    const chunk = await userQ.next();
    expect(chunk.type).toBe("stream_chunk");
    expect(chunk.content).toBe("Hello world");

    // update_message (finalize)
    agentWs.send(JSON.stringify({ type: "update_message", session_key: sk, preview_handle: ph, content: "Hello world!" }));
    const end = await userQ.next();
    expect(end.type).toBe("stream_end");
    expect(end.content).toBe("Hello world!");

    // Wait for async DB persistence
    await new Promise((r) => setTimeout(r, 200));

    // Persisted
    const msgs = await chatDb.getRecent("test-agent", sk, 50);
    const assistantMsgs = msgs.filter(m => m.role === "assistant");
    expect(assistantMsgs.length).toBeGreaterThanOrEqual(1);
    expect(assistantMsgs[assistantMsgs.length - 1].content).toBe("Hello world!");

    agentWs.close(); userWs.close();
  });

  it("sends wip_update=false after agent reply", async () => {
    const agentWs = new WebSocket(`ws://localhost:${port}/api/ws/agent`);
    const agentQ = createMsgQueue(agentWs);
    await waitForOpen(agentWs);
    agentWs.send(JSON.stringify({ type: "register", platform: "dashboard", capabilities: [], metadata: { agent_id: "test-agent", token: "agent-token" } }));
    await agentQ.next(); // register_ack

    const token = signJwt({ userId: "u1", name: "T" }, "test-secret", "1h");
    const userWs = new WebSocket(`ws://localhost:${port}/api/ws/chat?agentId=test-agent&sessionId=home&token=${token}`);
    const userQ = createMsgQueue(userWs);
    await userQ.next(); // init

    // Send → wip=true
    userWs.send(JSON.stringify({ type: "send", content: "q" }));
    await userQ.next(); // echo
    const wip1 = await userQ.next();
    expect(wip1.wip).toBe(true);

    // Agent reads + replies
    const bridge = await agentQ.next();
    agentWs.send(JSON.stringify({ type: "reply", content: "a", reply_ctx: bridge.session_key, session_key: bridge.session_key }));

    await userQ.next(); // reply message
    const wip2 = await userQ.next(); // wip_update
    expect(wip2.wip).toBe(false);

    agentWs.close(); userWs.close();
  });

  it("rejects user with invalid JWT", async () => {
    const userWs = new WebSocket(`ws://localhost:${port}/api/ws/chat?agentId=test-agent&sessionId=home&token=invalid`);
    const userQ = createMsgQueue(userWs);
    const msg = await userQ.next();
    expect(msg.type).toBe("error");
    expect(msg.error).toContain("auth");
  });

  it("filters out lak progress card replies (not persisted or broadcast)", async () => {
    const agentWs = new WebSocket(`ws://localhost:${port}/api/ws/agent`);
    const agentQ = createMsgQueue(agentWs);
    await waitForOpen(agentWs);
    agentWs.send(JSON.stringify({ type: "register", platform: "dashboard", capabilities: [], metadata: { agent_id: "test-agent", token: "agent-token" } }));
    await agentQ.next(); // register_ack

    const token = signJwt({ userId: "u1", name: "T" }, "test-secret", "1h");
    const userWs = new WebSocket(`ws://localhost:${port}/api/ws/chat?agentId=test-agent&sessionId=home&token=${token}`);
    const userQ = createMsgQueue(userWs);
    await userQ.next(); // init
    const sk = "web:test-agent:u1:home";

    // Agent sends a progress card reply — should be filtered
    agentWs.send(JSON.stringify({
      type: "reply",
      content: '__lak_progress_card_v1__:{"version":2,"state":"running","items":[]}',
      reply_ctx: sk,
      session_key: sk,
    }));

    // Then sends a real reply
    agentWs.send(JSON.stringify({
      type: "reply",
      content: "真正的回复",
      reply_ctx: sk,
      session_key: sk,
    }));

    // User should only see the real reply, not the progress card
    const msg = await userQ.next();
    expect(msg.type).toBe("message");
    expect(msg.content).toBe("真正的回复");
    expect(msg.content).not.toContain("__lak_progress_card_v1__");

    // Wait for async DB persistence
    await new Promise((r) => setTimeout(r, 200));

    // DB should only have the real reply
    const msgs = await chatDb.getRecent("test-agent", sk, 50);
    const assistantMsgs = msgs.filter((m: any) => m.role === "assistant");
    expect(assistantMsgs.filter((m: any) => m.content === "真正的回复")).toHaveLength(1);
    expect(assistantMsgs.filter((m: any) => m.content.includes("__lak_progress_card_v1__"))).toHaveLength(0);

    agentWs.close(); userWs.close();
  });
});
