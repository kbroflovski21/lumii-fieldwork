import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { CommandInput, SITE_OPS_COMMANDS, ADMIN_COMMANDS, SlashCommand } from "../CommandInput";

describe("CommandInput", () => {
  it("renders with default placeholder", () => {
    render(<CommandInput onSend={() => {}} />);
    expect(screen.getByPlaceholderText("输入 / 查看命令...")).toBeInTheDocument();
  });

  it("renders with custom placeholder", () => {
    render(<CommandInput onSend={() => {}} placeholder="自定义提示" />);
    expect(screen.getByPlaceholderText("自定义提示")).toBeInTheDocument();
  });

  it("sends message on Enter", async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    render(<CommandInput onSend={onSend} />);

    const input = screen.getByPlaceholderText("输入 / 查看命令...");
    await user.type(input, "hello{Enter}");

    expect(onSend).toHaveBeenCalledWith("hello");
  });

  it("does not send empty message", async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    render(<CommandInput onSend={onSend} />);

    const input = screen.getByPlaceholderText("输入 / 查看命令...");
    await user.type(input, "{Enter}");

    expect(onSend).not.toHaveBeenCalled();
  });

  it("shows autocomplete menu when typing /", async () => {
    const user = userEvent.setup();
    render(<CommandInput onSend={() => {}} />);

    const input = screen.getByPlaceholderText("输入 / 查看命令...");
    await user.type(input, "/");

    // Should show all default commands
    expect(screen.getByText("/help")).toBeInTheDocument();
    expect(screen.getByText("/worker-create")).toBeInTheDocument();
  });

  it("filters commands as user types", async () => {
    const user = userEvent.setup();
    render(<CommandInput onSend={() => {}} />);

    const input = screen.getByPlaceholderText("输入 / 查看命令...");
    await user.type(input, "/worker");

    // Should show only worker commands
    expect(screen.getByText("/worker-create")).toBeInTheDocument();
    expect(screen.getByText("/worker-query")).toBeInTheDocument();
    expect(screen.getByText("/worker-update")).toBeInTheDocument();
    // Should NOT show badge commands
    expect(screen.queryByText("/badge-activate")).not.toBeInTheDocument();
  });

  it("uses custom commands prop (ADMIN_COMMANDS)", async () => {
    const user = userEvent.setup();
    render(<CommandInput onSend={() => {}} commands={ADMIN_COMMANDS} />);

    const input = screen.getByPlaceholderText("输入 / 查看命令...");
    await user.type(input, "/");

    // Should show admin commands
    expect(screen.getByText("/quality-overview")).toBeInTheDocument();
    expect(screen.getByText("/site-query")).toBeInTheDocument();
    expect(screen.getByText("/user-create")).toBeInTheDocument();
    // Should NOT show site-ops-only commands
    expect(screen.queryByText("/worker-create")).not.toBeInTheDocument();
    expect(screen.queryByText("/badge-activate")).not.toBeInTheDocument();
  });

  it("uses custom commands list", async () => {
    const custom: SlashCommand[] = [
      { command: "/foo", description: "Foo command" },
      { command: "/bar", description: "Bar command" },
    ];
    const user = userEvent.setup();
    render(<CommandInput onSend={() => {}} commands={custom} />);

    const input = screen.getByPlaceholderText("输入 / 查看命令...");
    await user.type(input, "/");

    expect(screen.getByText("/foo")).toBeInTheDocument();
    expect(screen.getByText("/bar")).toBeInTheDocument();
    expect(screen.queryByText("/help")).not.toBeInTheDocument();
  });

  it("selects command with Tab and appends space", async () => {
    const user = userEvent.setup();
    render(<CommandInput onSend={() => {}} />);

    const input = screen.getByPlaceholderText("输入 / 查看命令...") as HTMLInputElement;
    await user.type(input, "/hel");

    // /help should be the first (and only) match
    expect(screen.getByText("/help")).toBeInTheDocument();

    await user.keyboard("{Tab}");

    // Input should now contain "/help " (with trailing space)
    expect(input.value).toBe("/help ");
  });

  it("send button is disabled when input is empty", () => {
    render(<CommandInput onSend={() => {}} />);
    const sendBtn = screen.getByLabelText("发送");
    expect(sendBtn).toBeDisabled();
  });

  it("send button is enabled when input has content", async () => {
    const user = userEvent.setup();
    render(<CommandInput onSend={() => {}} />);

    const input = screen.getByPlaceholderText("输入 / 查看命令...");
    await user.type(input, "hello");

    const sendBtn = screen.getByLabelText("发送");
    expect(sendBtn).not.toBeDisabled();
  });

  it("clears input after sending", async () => {
    const user = userEvent.setup();
    render(<CommandInput onSend={() => {}} />);

    const input = screen.getByPlaceholderText("输入 / 查看命令...") as HTMLInputElement;
    await user.type(input, "hello{Enter}");

    expect(input.value).toBe("");
  });

  it("disables input when disabled prop is true", () => {
    render(<CommandInput onSend={() => {}} disabled />);
    const input = screen.getByPlaceholderText("输入 / 查看命令...");
    expect(input).toBeDisabled();
  });

  it("SITE_OPS_COMMANDS has 16 commands", () => {
    expect(SITE_OPS_COMMANDS).toHaveLength(16);
    expect(SITE_OPS_COMMANDS[0].command).toBe("/help");
  });

  it("ADMIN_COMMANDS has 9 commands", () => {
    expect(ADMIN_COMMANDS).toHaveLength(9);
    expect(ADMIN_COMMANDS[0].command).toBe("/help");
    // Admin should have quality and sop commands
    expect(ADMIN_COMMANDS.find(c => c.command === "/quality-overview")).toBeDefined();
    expect(ADMIN_COMMANDS.find(c => c.command === "/sop-query")).toBeDefined();
  });
});
