import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "../components/StatusBadge";

describe("StatusBadge", () => {
  it("renders children text", () => {
    render(<StatusBadge tone="success">在职</StatusBadge>);
    expect(screen.getByText("在职")).toBeInTheDocument();
  });

  it("sets data-tone attribute", () => {
    render(<StatusBadge tone="warning">待补全</StatusBadge>);
    const el = screen.getByText("待补全");
    expect(el).toHaveAttribute("data-tone", "warning");
  });

  it("uses sw-status-badge class", () => {
    render(<StatusBadge tone="muted">已归档</StatusBadge>);
    expect(screen.getByText("已归档")).toHaveClass("sw-status-badge");
  });

  it("forwards style prop", () => {
    render(<StatusBadge tone="accent" style={{ fontSize: 10 }}>进行中</StatusBadge>);
    expect(screen.getByText("进行中")).toHaveStyle({ fontSize: "10px" });
  });

  it("renders all tone values correctly", () => {
    const tones = ["success", "warning", "danger", "accent", "info", "muted"];
    tones.forEach(tone => {
      const { unmount } = render(<StatusBadge tone={tone}>{tone}</StatusBadge>);
      expect(screen.getByText(tone)).toHaveAttribute("data-tone", tone);
      unmount();
    });
  });
});
