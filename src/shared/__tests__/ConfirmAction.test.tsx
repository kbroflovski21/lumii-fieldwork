import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmAction } from "../components/ConfirmAction";

describe("ConfirmAction", () => {
  it("renders trigger button with label", () => {
    render(<ConfirmAction label="归档" onConfirm={() => {}} />);
    expect(screen.getByText("归档")).toBeInTheDocument();
  });

  it("shows confirmation on click", async () => {
    render(<ConfirmAction label="归档" onConfirm={() => {}} />);
    await userEvent.click(screen.getByText("归档"));
    expect(screen.getByText("确认归档？")).toBeInTheDocument();
    expect(screen.getByText("确认归档")).toBeInTheDocument();
    expect(screen.getByText("取消")).toBeInTheDocument();
  });

  it("calls onConfirm when confirm button clicked", async () => {
    const onConfirm = vi.fn();
    render(<ConfirmAction label="停用" onConfirm={onConfirm} />);
    await userEvent.click(screen.getByText("停用"));
    await userEvent.click(screen.getByText("确认停用"));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("resets on cancel", async () => {
    render(<ConfirmAction label="删除" onConfirm={() => {}} />);
    await userEvent.click(screen.getByText("删除"));
    expect(screen.getByText("确认删除？")).toBeInTheDocument();
    await userEvent.click(screen.getByText("取消"));
    expect(screen.queryByText("确认删除？")).toBeNull();
    expect(screen.getByText("删除")).toBeInTheDocument();
  });

  it("uses danger-ghost tone by default for trigger", () => {
    const { container } = render(<ConfirmAction label="归档" onConfirm={() => {}} />);
    expect(container.querySelector(".sw-btn--danger-ghost")).toBeTruthy();
  });

  it("respects disabled prop", () => {
    render(<ConfirmAction label="归档" onConfirm={() => {}} disabled />);
    expect(screen.getByText("归档")).toBeDisabled();
  });

  it("uses custom confirmLabel", async () => {
    render(<ConfirmAction label="通过" confirmLabel="确认通过审核" onConfirm={() => {}} />);
    await userEvent.click(screen.getByText("通过"));
    expect(screen.getByText("确认通过审核")).toBeInTheDocument();
  });

  it("passes buttonStyle to trigger button", () => {
    render(<ConfirmAction label="归档" onConfirm={() => {}} buttonStyle={{ height: 28 }} />);
    expect(screen.getByText("归档")).toHaveStyle({ height: "28px" });
  });
});
