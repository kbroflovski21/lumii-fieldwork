import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAgentChat } from "../useAgentChat";

// Mock WebSocket
class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static readonly OPEN = 1;
  static readonly CLOSED = 3;
  readyState = 1; // OPEN
  onopen: (() => void) | null = null;
  onmessage: ((evt: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  sent: string[] = [];
  OPEN = 1;

  constructor(public url: string) {
    MockWebSocket.instances.push(this);
    setTimeout(() => this.onopen?.(), 0);
  }

  send(data: string) { this.sent.push(data); }
  close() { this.onclose?.(); }

  // Test helper: simulate server sending a frame
  simulateMessage(frame: object) {
    this.onmessage?.({ data: JSON.stringify(frame) });
  }
}

const stableGetToken = () => "tok";

describe("useAgentChat", () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    (globalThis as any).WebSocket = MockWebSocket;
  });

  afterEach(() => {
    delete (globalThis as any).WebSocket;
  });

  it("connects and processes init frame", async () => {
    const { result } = renderHook(() =>
      useAgentChat({ agentId: "test", sessionId: "home", getToken: stableGetToken })
    );

    // Wait for WebSocket to be created
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });

    const ws = MockWebSocket.instances[0];
    expect(ws).toBeDefined();
    expect(ws.url).toContain("agentId=test");
    expect(ws.url).toContain("sessionId=home");

    // Simulate init frame
    act(() => {
      ws.simulateMessage({
        type: "init",
        connected: true,
        wip: false,
        messages: [{ id: 1, role: "assistant", content: "Welcome", msg_type: "text", timestamp: "2026-05-16T00:00:00Z" }],
        in_flight: [],
        capabilities: [],
      });
    });

    // Allow effects triggered by state updates to flush
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

    expect(result.current.connected).toBe(true);
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].content).toBe("Welcome");
  });

  it("sends message and shows optimistic bubble", async () => {
    const { result } = renderHook(() =>
      useAgentChat({ agentId: "test", sessionId: "home", getToken: stableGetToken })
    );
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });

    const ws = MockWebSocket.instances[0];
    act(() => { ws.simulateMessage({ type: "init", connected: true, wip: false, messages: [], in_flight: [], capabilities: [] }); });

    // Send message
    act(() => { result.current.handleSend("hello"); });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].content).toBe("hello");
    expect(result.current.messages[0].role).toBe("user");
    expect(result.current.messages[0].sendStatus).toBe("sending");
    expect(result.current.wip).toBe(true);

    // Verify WS send — the MockWebSocket instance that was created
    const allSent = MockWebSocket.instances.flatMap((i) => i.sent);
    expect(allSent).toHaveLength(1);
    expect(JSON.parse(allSent[0])).toEqual({ type: "send", content: "hello" });
  });

  it("handles streaming (start -> chunk -> end)", async () => {
    const { result } = renderHook(() =>
      useAgentChat({ agentId: "test", sessionId: "home", getToken: stableGetToken })
    );
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
    const ws = MockWebSocket.instances[0];
    act(() => { ws.simulateMessage({ type: "init", connected: true, wip: false, messages: [], in_flight: [], capabilities: [] }); });

    // Stream start
    act(() => { ws.simulateMessage({ type: "stream_start", msg_id: "s1", content: "He" }); });
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].isStreaming).toBe(true);
    expect(result.current.messages[0].content).toBe("He");

    // Stream chunk
    act(() => { ws.simulateMessage({ type: "stream_chunk", msg_id: "s1", content: "Hello world" }); });
    expect(result.current.messages[0].content).toBe("Hello world");

    // Stream end
    act(() => { ws.simulateMessage({ type: "stream_end", msg_id: "s1", content: "Hello world!" }); });
    expect(result.current.messages[0].content).toBe("Hello world!");
    expect(result.current.messages[0].isStreaming).toBe(false);
  });

  it("updates wip on wip_update frame", async () => {
    const { result } = renderHook(() =>
      useAgentChat({ agentId: "test", sessionId: "home", getToken: stableGetToken })
    );
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
    const ws = MockWebSocket.instances[0];
    act(() => { ws.simulateMessage({ type: "init", connected: true, wip: false, messages: [], in_flight: [], capabilities: [] }); });

    act(() => { ws.simulateMessage({ type: "wip_update", wip: true, session_key: "sk" }); });
    expect(result.current.wip).toBe(true);

    act(() => { ws.simulateMessage({ type: "wip_update", wip: false, session_key: "sk" }); });
    expect(result.current.wip).toBe(false);
  });

  it("builds session key with siteId when provided", async () => {
    renderHook(() =>
      useAgentChat({ agentId: "gy", sessionId: "copilot", siteId: "site-001", getToken: stableGetToken })
    );
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });

    const ws = MockWebSocket.instances[0];
    expect(ws).toBeDefined();
    expect(ws.url).toContain("sessionId=copilot:site-001");
  });

  it("builds session key without siteId when not provided", async () => {
    renderHook(() =>
      useAgentChat({ agentId: "gy", sessionId: "copilot", getToken: stableGetToken })
    );
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });

    const ws = MockWebSocket.instances[0];
    expect(ws).toBeDefined();
    // Should be just "copilot" without a colon suffix
    expect(ws.url).toContain("sessionId=copilot");
    expect(ws.url).not.toContain("sessionId=copilot:");
  });

  it("strips [ctx:] prefix from optimistic user bubble", async () => {
    const { result } = renderHook(() =>
      useAgentChat({ agentId: "test", sessionId: "home", getToken: stableGetToken })
    );
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });

    const ws = MockWebSocket.instances[0];
    act(() => { ws.simulateMessage({ type: "init", connected: true, wip: false, messages: [], in_flight: [], capabilities: [] }); });

    // Send a message with [ctx:] prefix (as shell's sendWithContext would)
    act(() => { result.current.handleSend("[ctx:服务人员] 查询王丽"); });

    // Optimistic bubble should show stripped content
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].content).toBe("查询王丽");
    expect(result.current.messages[0].role).toBe("user");

    // But the full content with prefix was sent over WS
    const allSent = MockWebSocket.instances.flatMap((i) => i.sent);
    expect(allSent).toHaveLength(1);
    const sent = JSON.parse(allSent[0]);
    expect(sent.content).toBe("[ctx:服务人员] 查询王丽");
  });

  it("deduplicates message event when stream_end already handled", async () => {
    const { result } = renderHook(() =>
      useAgentChat({ agentId: "test", sessionId: "home", getToken: stableGetToken })
    );
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });

    const ws = MockWebSocket.instances[0];
    act(() => { ws.simulateMessage({ type: "init", connected: true, wip: false, messages: [], in_flight: [], capabilities: [] }); });

    // Simulate stream_start -> stream_end -> message (same content)
    act(() => { ws.simulateMessage({ type: "stream_start", msg_id: "msg-1", content: "帮助" }); });
    act(() => { ws.simulateMessage({ type: "stream_end", msg_id: "msg-1", content: "帮助信息..." }); });
    act(() => { ws.simulateMessage({ type: "message", id: "msg-1", role: "assistant", content: "帮助信息...", msg_type: "text", timestamp: "2026-05-20T00:00:00Z" }); });

    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

    // Should only have 1 assistant message, not 2
    const assistantMsgs = result.current.messages.filter(m => m.role === "assistant");
    expect(assistantMsgs).toHaveLength(1);
    expect(assistantMsgs[0].content).toBe("帮助信息...");
  });

  it("deduplicates echoed user message with ctx prefix", async () => {
    const { result } = renderHook(() =>
      useAgentChat({ agentId: "test", sessionId: "home", getToken: stableGetToken })
    );
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });

    const ws = MockWebSocket.instances[0];
    act(() => { ws.simulateMessage({ type: "init", connected: true, wip: false, messages: [], in_flight: [], capabilities: [] }); });

    // Send with context prefix
    act(() => { result.current.handleSend("[ctx:服务人员] hello"); });
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].sendStatus).toBe("sending");

    // Server echoes back with the full content including [ctx:] prefix
    act(() => {
      ws.simulateMessage({
        type: "message",
        id: "server-123",
        role: "user",
        content: "[ctx:服务人员] hello",
        msg_type: "text",
        timestamp: "2026-05-20T00:00:00Z",
      });
    });

    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

    // Should still be 1 message (deduped), now marked as sent
    const userMsgs = result.current.messages.filter(m => m.role === "user");
    expect(userMsgs).toHaveLength(1);
    expect(userMsgs[0].sendStatus).toBe("sent");
    expect(userMsgs[0].id).toBe("server-123");
  });

  it("reconnects with new session key when siteId changes", async () => {
    const { result, rerender } = renderHook(
      ({ siteId }) => useAgentChat({ agentId: "gy", sessionId: "copilot", siteId, getToken: stableGetToken }),
      { initialProps: { siteId: "site-001" } }
    );
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });

    const firstWs = MockWebSocket.instances[0];
    expect(firstWs.url).toContain("sessionId=copilot:site-001");

    // Change siteId
    rerender({ siteId: "site-002" });
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });

    // A new WS should have been created with the new siteId
    const latestWs = MockWebSocket.instances[MockWebSocket.instances.length - 1];
    expect(latestWs.url).toContain("sessionId=copilot:site-002");
  });
});
