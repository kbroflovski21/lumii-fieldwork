import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { CardBubble, type CardData } from "../CardBubble";

const sampleCard: CardData = {
  elements: [
    { type: "markdown", content: "确认要归档服务人员 **王丽** 吗？" },
    { type: "divider" },
    {
      type: "actions",
      buttons: [
        { text: "确认归档", btn_type: "danger", value: "confirm_archive:w1" },
        { text: "取消", btn_type: "default", value: "cancel" },
      ],
    },
  ],
};

describe("CardBubble", () => {
  it("renders markdown element text", () => {
    render(<CardBubble card={sampleCard} msgId="m1" />);
    expect(screen.getByText(/确认要归档服务人员/)).toBeInTheDocument();
  });

  it("renders divider element as <hr>", () => {
    const { container } = render(<CardBubble card={sampleCard} msgId="m1" />);
    expect(container.querySelector("hr.cb-divider")).toBeInTheDocument();
  });

  it("renders action buttons", () => {
    render(<CardBubble card={sampleCard} msgId="m1" />);
    expect(screen.getByText("确认归档")).toBeInTheDocument();
    expect(screen.getByText("取消")).toBeInTheDocument();
  });

  it("calls onAction with msgId and button value on click", async () => {
    const onAction = vi.fn();
    const user = userEvent.setup();
    render(<CardBubble card={sampleCard} msgId="m1" onAction={onAction} />);

    await user.click(screen.getByText("确认归档"));

    expect(onAction).toHaveBeenCalledWith("m1", "confirm_archive:w1");
  });

  it("disables all buttons after a click", async () => {
    const onAction = vi.fn();
    const user = userEvent.setup();
    render(<CardBubble card={sampleCard} msgId="m1" onAction={onAction} />);

    await user.click(screen.getByText("确认归档"));

    // Both buttons should be disabled
    expect(screen.getByText(/确认归档/)).toBeDisabled();
    expect(screen.getByText("取消")).toBeDisabled();
  });

  it("marks selected button with checkmark prefix", async () => {
    const user = userEvent.setup();
    render(<CardBubble card={sampleCard} msgId="m1" onAction={vi.fn()} />);

    await user.click(screen.getByText("确认归档"));

    // The selected button should now have a checkmark
    expect(screen.getByText(/✓ 确认归档/)).toBeInTheDocument();
    // The non-selected button should not
    expect(screen.getByText("取消").textContent).not.toContain("✓");
  });

  it("does not call onAction when already disabled", async () => {
    const onAction = vi.fn();
    const user = userEvent.setup();
    render(<CardBubble card={sampleCard} msgId="m1" onAction={onAction} />);

    // Click first time
    await user.click(screen.getByText("确认归档"));
    expect(onAction).toHaveBeenCalledTimes(1);

    // Try clicking the other button (disabled) - should not fire
    await user.click(screen.getByText("取消"));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("applies btn_type CSS class to buttons", () => {
    render(<CardBubble card={sampleCard} msgId="m1" />);
    const dangerBtn = screen.getByText("确认归档");
    expect(dangerBtn.classList.contains("cb-btn--danger")).toBe(true);
    const defaultBtn = screen.getByText("取消");
    expect(defaultBtn.classList.contains("cb-btn--default")).toBe(true);
  });

  it("renders card with only markdown elements (no actions)", () => {
    const infoCard: CardData = {
      elements: [
        { type: "markdown", content: "操作已完成。" },
      ],
    };
    render(<CardBubble card={infoCard} msgId="m2" />);
    expect(screen.getByText("操作已完成。")).toBeInTheDocument();
  });

  it("renders multiple action groups", () => {
    const multiCard: CardData = {
      elements: [
        { type: "markdown", content: "找到 2 个匹配：" },
        {
          type: "actions",
          buttons: [
            { text: "王丽 (翠苑站)", btn_type: "default", value: "select:w1" },
            { text: "王芳 (三墩站)", btn_type: "default", value: "select:w2" },
          ],
        },
      ],
    };
    render(<CardBubble card={multiCard} msgId="m3" />);
    expect(screen.getByText("王丽 (翠苑站)")).toBeInTheDocument();
    expect(screen.getByText("王芳 (三墩站)")).toBeInTheDocument();
  });

  it("skips unknown element types without crashing", () => {
    const weirdCard: CardData = {
      elements: [
        { type: "unknown_type" as any, content: "nope" },
        { type: "markdown", content: "正常内容" },
      ],
    };
    render(<CardBubble card={weirdCard} msgId="m4" />);
    expect(screen.getByText("正常内容")).toBeInTheDocument();
    expect(screen.queryByText("nope")).not.toBeInTheDocument();
  });
});
