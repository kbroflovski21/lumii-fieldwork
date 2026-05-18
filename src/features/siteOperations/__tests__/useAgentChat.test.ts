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
});
