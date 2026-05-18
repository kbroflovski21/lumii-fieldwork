import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { CopilotPanel } from "../CopilotPanel";

// Mock WebSocket same as useAgentChat test
class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static readonly OPEN = 1;
  readyState = 1;
  onopen: (() => void) | null = null;
  onmessage: ((evt: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  sent: string[] = [];
  OPEN = 1;
  constructor(public url: string) {
    MockWebSocket.instances.push(this);
    setTimeout(() => {
      this.onopen?.();
      this.onmessage?.({ data: JSON.stringify({ type: "init", connected: true, wip: false, messages: [], in_flight: [], capabilities: [] }) });
    }, 0);
  }
  send(data: string) { this.sent.push(data); }
  close() {}
}

describe("CopilotPanel", () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    (globalThis as any).WebSocket = MockWebSocket;
    localStorage.setItem("gy_chat_token", "test-mock-token");
  });
  afterEach(() => {
    delete (globalThis as any).WebSocket;
    localStorage.removeItem("gy_chat_token");
  });

  it("is hidden when isOpen is false", () => {
    render(<CopilotPanel workAreaId="social_workers" isOpen={false} onClose={() => {}} />);
    const panel = screen.getByLabelText("AI 助手");
    expect(panel).toBeInTheDocument();
    expect(panel.dataset.open).toBe("false");
  });

  it("renders panel when open", async () => {
    render(<CopilotPanel workAreaId="social_workers" isOpen={true} onClose={() => {}} />);
    const panel = await screen.findByLabelText("AI 助手");
    expect(panel).toBeInTheDocument();
    expect(panel.dataset.open).toBe("true");
    expect(screen.getByText("AI 助手 · 服务人员")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("输入指令...")).toBeInTheDocument();
  });

  it("calls onClose when X clicked", async () => {
    let closeCalled = 0;
    render(<CopilotPanel workAreaId="smart_badges" isOpen={true} onClose={() => { closeCalled++; }} />);
    const user = userEvent.setup();
    const closeButton = screen.getByLabelText("关闭 AI 助手");
    await user.click(closeButton);
    expect(closeCalled).toBe(1);
  });

  it("uses correct sessionId per workAreaId", async () => {
    render(<CopilotPanel workAreaId="service_records" isOpen={true} onClose={() => {}} />);
    // Wait for WS to be created
    await new Promise((r) => setTimeout(r, 50));
    const ws = MockWebSocket.instances[0];
    expect(ws).toBeDefined();
    expect(ws.url).toContain("sessionId=service_records");
  });
});
