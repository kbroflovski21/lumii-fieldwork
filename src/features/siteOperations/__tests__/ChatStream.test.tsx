import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { ChatStream } from "../ChatStream";
import type { ChatMessage } from "../useAgentChat";
import React from "react";

// We need to test parseGyLink which is not exported, so we test via rendering behavior

function makeMsg(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: "msg-1",
    role: "assistant",
    content: "Hello",
    isStreaming: false,
    msgType: "text",
    timestamp: "2026-05-21T00:00:00Z",
    ...overrides,
  };
}

const endRef = React.createRef<HTMLDivElement>();

describe("ChatStream gy:// link rendering", () => {
  it("renders gy:// link as <span> with gy-link class, not <a>", () => {
    const msg = makeMsg({
      content: "已创建 [王丽](gy://social_workers?search=王丽)",
    });
    const { container } = render(
      <ChatStream messages={[msg]} wip={false} connected={true} endRef={endRef} />
    );

    // Should have a span.gy-link
    const gyLink = container.querySelector("span.gy-link");
    expect(gyLink).not.toBeNull();
    expect(gyLink?.textContent).toBe("王丽");

    // Should NOT have an <a> tag for the gy:// link
    const anchors = container.querySelectorAll("a");
    anchors.forEach((a) => {
      expect(a.getAttribute("href")).not.toContain("gy://");
    });
  });

  it("calls onNavigate with area and params when gy:// link is clicked", async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    const msg = makeMsg({
      content: "查看 [王丽](gy://social_workers?search=王丽)",
    });
    render(
      <ChatStream
        messages={[msg]}
        wip={false}
        connected={true}
        endRef={endRef}
        onNavigate={onNavigate}
      />
    );

    const link = screen.getByText("王丽");
    await user.click(link);

    expect(onNavigate).toHaveBeenCalledWith("social_workers", { search: "王丽" });
  });

  it("calls onNavigate on Enter keydown for gy:// link", async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    const msg = makeMsg({
      content: "查看 [王丽](gy://social_workers?search=王丽)",
    });
    render(
      <ChatStream
        messages={[msg]}
        wip={false}
        connected={true}
        endRef={endRef}
        onNavigate={onNavigate}
      />
    );

    const link = screen.getByText("王丽");
    link.focus();
    await user.keyboard("{Enter}");

    expect(onNavigate).toHaveBeenCalledWith("social_workers", { search: "王丽" });
  });

  it("renders normal http links as <a target=_blank>", () => {
    const msg = makeMsg({
      content: "查看 [文档](https://example.com/docs)",
    });
    const { container } = render(
      <ChatStream messages={[msg]} wip={false} connected={true} endRef={endRef} />
    );

    const anchor = container.querySelector('a[href="https://example.com/docs"]');
    expect(anchor).not.toBeNull();
    expect(anchor?.getAttribute("target")).toBe("_blank");
    expect(anchor?.textContent).toBe("文档");
  });

  it("handles gy:// link without query params", async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    const msg = makeMsg({
      content: "回到 [首页](gy://home)",
    });
    render(
      <ChatStream
        messages={[msg]}
        wip={false}
        connected={true}
        endRef={endRef}
        onNavigate={onNavigate}
      />
    );

    await user.click(screen.getByText("首页"));
    expect(onNavigate).toHaveBeenCalledWith("home", {});
  });

  it("handles gy:// link with multiple query params", async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    const msg = makeMsg({
      content: "查看 [排期](gy://service_schedules?search=王丽&date=2026-05-21)",
    });
    render(
      <ChatStream
        messages={[msg]}
        wip={false}
        connected={true}
        endRef={endRef}
        onNavigate={onNavigate}
      />
    );

    await user.click(screen.getByText("排期"));
    expect(onNavigate).toHaveBeenCalledWith("service_schedules", {
      search: "王丽",
      date: "2026-05-21",
    });
  });
});

describe("ChatStream card rendering", () => {
  it("renders CardBubble for card msgType", () => {
    const msg = makeMsg({
      id: "card-1",
      msgType: "card",
      cardData: {
        elements: [
          { type: "markdown", content: "确认操作？" },
          {
            type: "actions",
            buttons: [{ text: "确认", btn_type: "primary", value: "ok" }],
          },
        ],
      },
    });
    render(
      <ChatStream messages={[msg]} wip={false} connected={true} endRef={endRef} />
    );

    expect(screen.getByText("确认操作？")).toBeInTheDocument();
    expect(screen.getByText("确认")).toBeInTheDocument();
  });

  it("calls onCardAction when card button is clicked", async () => {
    const onCardAction = vi.fn();
    const user = userEvent.setup();
    const msg = makeMsg({
      id: "card-2",
      msgType: "card",
      cardData: {
        elements: [
          {
            type: "actions",
            buttons: [{ text: "确认", btn_type: "primary", value: "confirm:1" }],
          },
        ],
      },
    });
    render(
      <ChatStream
        messages={[msg]}
        wip={false}
        connected={true}
        endRef={endRef}
        onCardAction={onCardAction}
      />
    );

    await user.click(screen.getByText("确认"));
    expect(onCardAction).toHaveBeenCalledWith("card-2", "confirm:1");
  });
});

describe("ChatStream general rendering", () => {
  it("shows typing dots when wip is true and no streaming messages", () => {
    const { container } = render(
      <ChatStream messages={[]} wip={true} connected={true} endRef={endRef} />
    );
    const typing = container.querySelector(".chat-bubble__typing");
    expect(typing).not.toBeNull();
  });

  it("does not show standalone typing dots when a message is streaming", () => {
    const msg = makeMsg({ isStreaming: true, content: "He" });
    const { container } = render(
      <ChatStream messages={[msg]} wip={true} connected={true} endRef={endRef} />
    );
    // Should only have one typing indicator (inside the streaming bubble), not the standalone one
    const typingBubbles = container.querySelectorAll(".chat-bubble__typing");
    // The streaming message has content, so no typing dots inside it either
    // The standalone wip dots should be suppressed
    expect(typingBubbles).toHaveLength(0);
  });

  it("shows offline status when not connected", () => {
    render(
      <ChatStream messages={[]} wip={false} connected={false} endRef={endRef} />
    );
    expect(screen.getByText("AI 助手离线中...")).toBeInTheDocument();
  });

  it("renders user messages as plain text (not markdown)", () => {
    const msg = makeMsg({
      role: "user",
      content: "**bold text**",
    });
    const { container } = render(
      <ChatStream messages={[msg]} wip={false} connected={true} endRef={endRef} />
    );

    // User messages should not have <strong> tags
    const strong = container.querySelector("strong");
    expect(strong).toBeNull();
  });

  it("renders assistant messages as markdown", () => {
    const msg = makeMsg({
      content: "**bold text**",
    });
    const { container } = render(
      <ChatStream messages={[msg]} wip={false} connected={true} endRef={endRef} />
    );

    const strong = container.querySelector("strong");
    expect(strong).not.toBeNull();
    expect(strong?.textContent).toBe("bold text");
  });

  it("filters out __lak_progress_card_v1__ messages", () => {
    const messages: ChatMessage[] = [
      makeMsg({ id: "1", content: "正常消息" }),
      makeMsg({ id: "2", content: "__lak_progress_card_v1__:some payload" }),
    ];
    render(
      <ChatStream messages={messages} wip={false} connected={true} endRef={endRef} />
    );

    expect(screen.getByText("正常消息")).toBeInTheDocument();
    expect(screen.queryByText(/__lak_progress_card_v1__/)).not.toBeInTheDocument();
  });
});
