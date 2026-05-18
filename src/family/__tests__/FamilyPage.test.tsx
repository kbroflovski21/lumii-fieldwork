import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FamilyPage } from "../FamilyPage";

describe("FamilyPage", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders header with elder name", () => {
    render(<FamilyPage />);
    expect(screen.getByText("张大伟的服务")).toBeInTheDocument();
  });

  it("shows family member info in header", () => {
    render(<FamilyPage />);
    expect(screen.getByText("张明（儿子）· 金色年华翠苑站")).toBeInTheDocument();
  });

  it("shows elder avatar emoji", () => {
    render(<FamilyPage />);
    expect(screen.getByText("👴")).toBeInTheDocument();
  });

  it("has feed tab active by default", () => {
    render(<FamilyPage />);
    const feedBtn = screen.getByText("消息动态");
    expect(feedBtn.closest("button")).toHaveClass("family-nav__btn--active");
  });

  it("shows bottom nav with two tabs", () => {
    render(<FamilyPage />);
    expect(screen.getByText("消息动态")).toBeInTheDocument();
    expect(screen.getByText("意见反馈")).toBeInTheDocument();
  });

  it("renders all feed cards with tags", () => {
    render(<FamilyPage />);
    // Feed tags
    const reportTags = screen.getAllByText("服务报告");
    expect(reportTags.length).toBe(2); // two 服务报告 items
    expect(screen.getByText("健康周报")).toBeInTheDocument();
    expect(screen.getByText("通知")).toBeInTheDocument();
    expect(screen.getByText("月度汇总")).toBeInTheDocument();
  });

  it("shows feed card titles", () => {
    render(<FamilyPage />);
    // "探访关爱服务已完成" appears in 2 feed cards (f1 and f4)
    expect(screen.getAllByText("探访关爱服务已完成").length).toBe(2);
    expect(screen.getByText("张大伟 · 本周健康状态总结")).toBeInTheDocument();
    expect(screen.getByText("服务时间调整通知")).toBeInTheDocument();
    expect(screen.getByText("张大伟 · 4 月服务月度汇总")).toBeInTheDocument();
  });

  it("shows feed card dates", () => {
    render(<FamilyPage />);
    expect(screen.getByText("今天 09:50")).toBeInTheDocument();
    expect(screen.getByText("05-14")).toBeInTheDocument();
  });

  it("feed cards show preview text when collapsed", () => {
    render(<FamilyPage />);
    // Preview is first ~60 chars of body content
    expect(screen.getByText(/社工王建国于今日/)).toBeInTheDocument();
  });

  it("expands feed card on click to show full body", async () => {
    render(<FamilyPage />);
    const user = userEvent.setup();

    // Click the first feed card's header button (first "探访关爱服务已完成")
    const titles = screen.getAllByText("探访关爱服务已完成");
    const headerButton = titles[0].closest("button")!;
    await user.click(headerButton);

    // Full body should be visible now
    expect(screen.getByText(/SOP 完成率 100%/)).toBeInTheDocument();
  });

  it("collapses expanded card on second click", async () => {
    render(<FamilyPage />);
    const user = userEvent.setup();

    const titles = screen.getAllByText("探访关爱服务已完成");
    const headerButton = titles[0].closest("button")!;

    // Expand
    await user.click(headerButton);
    expect(screen.getByText(/SOP 完成率 100%/)).toBeInTheDocument();

    // Collapse
    await user.click(headerButton);
    // Full body should disappear, preview should come back
    expect(screen.queryByText(/SOP 完成率 100%/)).not.toBeInTheDocument();
  });

  it("only one card is expanded at a time", async () => {
    render(<FamilyPage />);
    const user = userEvent.setup();

    // Expand first card
    const titles = screen.getAllByText("探访关爱服务已完成");
    await user.click(titles[0].closest("button")!);
    expect(screen.getByText(/SOP 完成率 100%/)).toBeInTheDocument();

    // Expand second card (health weekly)
    const secondTitle = screen.getByText("张大伟 · 本周健康状态总结");
    await user.click(secondTitle.closest("button")!);

    // First card body should be collapsed
    expect(screen.queryByText(/SOP 完成率 100%/)).not.toBeInTheDocument();
    // Second card body should be expanded
    expect(screen.getByText(/本周共完成 3 次探访关爱服务/)).toBeInTheDocument();
  });

  it("can switch to feedback tab", async () => {
    render(<FamilyPage />);
    const user = userEvent.setup();

    await user.click(screen.getByText("意见反馈"));

    // Feedback tab should now be active
    const feedbackBtn = screen.getByText("意见反馈");
    expect(feedbackBtn.closest("button")).toHaveClass("family-nav__btn--active");

    // Should show welcome message from agent
    expect(screen.getByText(/我是客服小张/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("输入您的反馈...")).toBeInTheDocument();
  });

  it("feedback tab shows agent avatar", async () => {
    render(<FamilyPage />);
    const user = userEvent.setup();
    await user.click(screen.getByText("意见反馈"));

    expect(screen.getByText("👩‍💼")).toBeInTheDocument();
  });

  it("can send feedback message", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<FamilyPage />);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    await user.click(screen.getByText("意见反馈"));

    const input = screen.getByPlaceholderText("输入您的反馈...");
    await user.type(input, "服务很好");

    // Send button should be active
    const sendBtn = document.querySelector(".family-chat-input__send--active") as HTMLElement;
    expect(sendBtn).toBeTruthy();
    await user.click(sendBtn);

    // User message should appear
    expect(screen.getByText("服务很好")).toBeInTheDocument();

    // Wait for auto-reply
    await act(async () => {
      vi.advanceTimersByTime(900);
    });

    // Auto-reply should appear
    expect(screen.getByText(/收到您的反馈/)).toBeInTheDocument();
  });

  it("send button is disabled when input is empty", async () => {
    render(<FamilyPage />);
    const user = userEvent.setup();
    await user.click(screen.getByText("意见反馈"));

    // Send button should have disabled class
    const sendBtn = document.querySelector(".family-chat-input__send--disabled") as HTMLElement;
    expect(sendBtn).toBeTruthy();
  });

  it("can send feedback via Enter key", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<FamilyPage />);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    await user.click(screen.getByText("意见反馈"));

    const input = screen.getByPlaceholderText("输入您的反馈...");
    await user.type(input, "请增加助浴服务{enter}");

    // User message should appear
    expect(screen.getByText("请增加助浴服务")).toBeInTheDocument();
  });

  it("switching back from feedback to feed preserves feed state", async () => {
    render(<FamilyPage />);
    const user = userEvent.setup();

    // Switch to feedback
    await user.click(screen.getByText("意见反馈"));
    expect(screen.getByText(/我是客服小张/)).toBeInTheDocument();

    // Switch back to feed
    await user.click(screen.getByText("消息动态"));
    expect(screen.getAllByText("探访关爱服务已完成").length).toBe(2);
  });
});
