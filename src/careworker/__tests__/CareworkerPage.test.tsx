import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CareworkerPage } from "../CareworkerPage";

// Mock fetch for login API
const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  localStorage.clear();
  mockFetch.mockReset();
  // Default: /api/auth/me returns 401 (no stored session)
  mockFetch.mockImplementation((url: string) => {
    if (url === "/api/auth/me") {
      return Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({ error: "未登录" }) });
    }
    return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("CareworkerPage - Login Screen", () => {
  it("shows login screen initially with app title", () => {
    render(<CareworkerPage />);
    expect(screen.getByText("金色年华")).toBeInTheDocument();
    expect(screen.getByText("养老智慧服务平台")).toBeInTheDocument();
  });

  it("shows phone and password input fields", () => {
    render(<CareworkerPage />);
    expect(screen.getByText("账号")).toBeInTheDocument();
    expect(screen.getByText("密码")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("请输入账号")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("请输入密码")).toBeInTheDocument();
  });

  it("has enter button", () => {
    render(<CareworkerPage />);
    expect(screen.getByText("进入工作台")).toBeInTheDocument();
  });

  it("shows error when submitting empty form", async () => {
    render(<CareworkerPage />);
    const user = userEvent.setup();
    await user.click(screen.getByText("进入工作台"));
    expect(screen.getByText("请输入账号和密码")).toBeInTheDocument();
  });

  it("shows error from API on wrong credentials", async () => {
    mockFetch.mockImplementation((url: string, opts?: any) => {
      if (url === "/api/auth/login") {
        return Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({ error: "用户名或密码错误" }) });
      }
      return Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({ error: "未登录" }) });
    });

    render(<CareworkerPage />);
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText("请输入账号"), "13800001111");
    await user.type(screen.getByPlaceholderText("请输入密码"), "wrongpwd");
    await user.click(screen.getByText("进入工作台"));

    await waitFor(() => {
      expect(screen.getByText("用户名或密码错误")).toBeInTheDocument();
    });
  });
});

describe("CareworkerPage - Main Interface", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockFetch.mockImplementation((url: string, opts?: any) => {
      if (url === "/api/auth/login") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            token: "test-jwt-token",
            user: {
              id: "w1",
              username: "13800001234",
              name: "王建国",
              role: "careworker",
              orgId: "org-001",
              siteIds: ["红培社区站"],
              phone: "138****1234",
              status: "active",
            },
          }),
        });
      }
      if (url === "/api/auth/me") {
        return Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({ error: "未登录" }) });
      }
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function loginAsWorker() {
    render(<CareworkerPage />);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    // Fill in phone and password
    await user.type(screen.getByPlaceholderText("请输入账号"), "13800001234");
    await user.type(screen.getByPlaceholderText("请输入密码"), "testpass");

    // Click the login button
    await user.click(screen.getByText("进入工作台"));

    // Wait for login to complete
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    // Wait for the worker state to be set
    await waitFor(() => {
      expect(screen.getByText("王建国")).toBeInTheDocument();
    });

    return user;
  }

  it("enters main page after login", async () => {
    await loginAsWorker();
    // Should show worker name in header
    expect(screen.getByText("王建国")).toBeInTheDocument();
    expect(screen.getByText("红培社区站")).toBeInTheDocument();
  });

  it("shows badge status chip", async () => {
    await loginAsWorker();
    // Badge shows as disconnected by default (no BroadcastChannel events in test)
    expect(screen.getByText("工牌离线")).toBeInTheDocument();
  });

  it("shows tasks tab as default", async () => {
    await loginAsWorker();
    expect(screen.getByText("我的任务")).toBeInTheDocument();
    expect(screen.getByText("参考资料")).toBeInTheDocument();
  });

  it("shows quick navigation button (本周 for default week view)", async () => {
    await loginAsWorker();
    expect(screen.getByText("本周")).toBeInTheDocument();
  });

  it("shows task cards for selected date", async () => {
    await loginAsWorker();
    // Today's tasks should be shown (t13: 健康监测, t14: 助餐, t15: 助浴)
    expect(screen.getByText("健康监测")).toBeInTheDocument();
    expect(screen.getByText("陈阿姨")).toBeInTheDocument();
  });

  it("shows task status badges", async () => {
    await loginAsWorker();
    // Today has pending and completed tasks
    const pendingBadges = screen.getAllByText("待服务");
    expect(pendingBadges.length).toBeGreaterThanOrEqual(1);
  });

  it("shows calendar view mode toggle", async () => {
    await loginAsWorker();
    // Calendar toggle shows day/week/month options; default is week
    const toggle = document.querySelector(".cw-cal-toggle");
    expect(toggle).toBeTruthy();
    // The toggle has 3 buttons for 日/周/月
    const buttons = toggle!.querySelectorAll(".cw-cal-toggle__btn");
    expect(buttons.length).toBe(3);
    // Default is week mode (周 is active)
    expect(buttons[1]).toHaveClass("cw-cal-toggle__btn--active");
  });

  it("shows week strip with day numbers", async () => {
    await loginAsWorker();
    // Week strip has day labels
    const weekStrip = document.querySelector(".cw-week-strip");
    expect(weekStrip).toBeTruthy();
  });

  it("can switch to reference tab", async () => {
    const user = await loginAsWorker();

    await user.click(screen.getByText("参考资料"));

    // Should show SOP reference list
    expect(screen.getByText("通用规范")).toBeInTheDocument();
    expect(screen.getByText("服务项目规范")).toBeInTheDocument();
    expect(screen.getByText("上门服务通用规范")).toBeInTheDocument();
    expect(screen.getByText("安全与应急处理规范")).toBeInTheDocument();
    expect(screen.getByText("助餐服务 SOP")).toBeInTheDocument();
    expect(screen.getByText("助浴服务 SOP")).toBeInTheDocument();
    expect(screen.getByText("常规探访 SOP")).toBeInTheDocument();
    expect(screen.getByText("康复训练 SOP")).toBeInTheDocument();
  });

  it("shows SOP version info in reference list", async () => {
    const user = await loginAsWorker();
    await user.click(screen.getByText("参考资料"));

    // Version info is shown
    expect(screen.getByText(/v2 · 更新于 2026-05-10/)).toBeInTheDocument();
    expect(screen.getByText(/v3 · 更新于 2026-05-12/)).toBeInTheDocument();
  });

  it("can open task detail drawer by clicking a task", async () => {
    const user = await loginAsWorker();

    // Click on a task card
    const taskCards = document.querySelectorAll(".cw-task-card");
    expect(taskCards.length).toBeGreaterThanOrEqual(1);
    await user.click(taskCards[0]);

    // Drawer should open with task details
    expect(screen.getByText("服务对象")).toBeInTheDocument();
    expect(screen.getByText("服务时间")).toBeInTheDocument();
    expect(screen.getByText("服务地点")).toBeInTheDocument();
    expect(screen.getByText("SOP 执行清单")).toBeInTheDocument();
  });

  it("shows start service button for pending tasks", async () => {
    const user = await loginAsWorker();

    // Find and click a pending task card
    const taskCards = document.querySelectorAll(".cw-task-card");
    await user.click(taskCards[0]);

    // Should have start service button
    expect(screen.getByText("开始服务")).toBeInTheDocument();
  });

  it("can close task detail drawer", async () => {
    const user = await loginAsWorker();

    const taskCards = document.querySelectorAll(".cw-task-card");
    await user.click(taskCards[0]);
    expect(screen.getByText("SOP 执行清单")).toBeInTheDocument();

    // Click the close button (X icon)
    const closeBtn = document.querySelector(".cw-drawer__close") as HTMLElement;
    await user.click(closeBtn);

    // Drawer should close
    expect(screen.queryByText("SOP 执行清单")).not.toBeInTheDocument();
  });

  it("shows logout confirmation when logout button is clicked", async () => {
    const user = await loginAsWorker();

    // Click logout button
    const logoutBtn = screen.getByLabelText("退出登录");
    await user.click(logoutBtn);

    // Confirmation dialog should appear
    expect(screen.getByText("退出登录")).toBeInTheDocument();
    expect(screen.getByText("确认要退出登录吗？")).toBeInTheDocument();
    expect(screen.getByText("确认退出")).toBeInTheDocument();
  });

  it("returns to login screen after confirming logout", async () => {
    const user = await loginAsWorker();

    await user.click(screen.getByLabelText("退出登录"));
    await user.click(screen.getByText("确认退出"));

    // Should be back on login screen
    expect(screen.getByText("金色年华")).toBeInTheDocument();
    expect(screen.getByText("进入工作台")).toBeInTheDocument();
  });

  it("can cancel logout", async () => {
    const user = await loginAsWorker();

    await user.click(screen.getByLabelText("退出登录"));

    // Cancel
    const cancelBtns = screen.getAllByText("取消");
    await user.click(cancelBtns[cancelBtns.length - 1]);

    // Should still be on main page
    expect(screen.getByText("王建国")).toBeInTheDocument();
    expect(screen.queryByText("确认要退出登录吗？")).not.toBeInTheDocument();
  });

  it("can navigate weeks with arrow buttons", async () => {
    const user = await loginAsWorker();

    // Click right arrow to go to next week
    const dayNav = document.querySelector(".cw-day-nav")!;
    const arrows = dayNav.querySelectorAll(".cw-day-nav__arrow");
    expect(arrows.length).toBe(2);

    // Click next week arrow
    await user.click(arrows[1]);

    // The date title should change (we won't assert exact date as it depends on current date)
    // Just verify no crash and the UI is still functional
    expect(screen.getByText("本周")).toBeInTheDocument();
  });
});

describe("HardwareSimulator", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders with title", async () => {
    const { HardwareSimulator } = await import("../HardwareSimulator");
    render(<HardwareSimulator />);
    expect(screen.getByText("智能工牌模拟器")).toBeInTheDocument();
    expect(screen.getByText("模拟物理工牌的单按钮操作")).toBeInTheDocument();
  });

  it("starts in idle state", async () => {
    const { HardwareSimulator } = await import("../HardwareSimulator");
    render(<HardwareSimulator />);
    expect(screen.getByText("● 待命")).toBeInTheDocument();
  });

  it("shows start service button initially", async () => {
    const { HardwareSimulator } = await import("../HardwareSimulator");
    render(<HardwareSimulator />);
    expect(screen.getByText("开始服务")).toBeInTheDocument();
  });

  it("shows battery and signal indicators", async () => {
    const { HardwareSimulator } = await import("../HardwareSimulator");
    render(<HardwareSimulator />);
    expect(screen.getByText("87%")).toBeInTheDocument();
    expect(screen.getByText("良好")).toBeInTheDocument();
  });

  it("shows GPS coordinates", async () => {
    const { HardwareSimulator } = await import("../HardwareSimulator");
    render(<HardwareSimulator />);
    expect(screen.getByText("GPS 定位")).toBeInTheDocument();
    // Coordinates are displayed
    expect(screen.getByText(/30\.\d+N, 120\.\d+E/)).toBeInTheDocument();
  });

  it("shows hint text for idle state", async () => {
    const { HardwareSimulator } = await import("../HardwareSimulator");
    render(<HardwareSimulator />);
    expect(screen.getByText("按下按钮开始服务录音")).toBeInTheDocument();
  });

  it("transitions to recording state on button press", async () => {
    const { HardwareSimulator } = await import("../HardwareSimulator");
    render(<HardwareSimulator />);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    // Click the big button
    const button = document.querySelector(".hw-button") as HTMLElement;
    await user.click(button);

    // Should be recording
    expect(screen.getByText("● 录音中")).toBeInTheDocument();
    expect(screen.getByText("结束服务")).toBeInTheDocument();
    expect(screen.getByText("服务录音中，再次按下按钮结束服务")).toBeInTheDocument();
  });

  it("shows timer when recording", async () => {
    const { HardwareSimulator } = await import("../HardwareSimulator");
    render(<HardwareSimulator />);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    const button = document.querySelector(".hw-button") as HTMLElement;
    await user.click(button);

    // Timer should show 00:00 initially
    expect(screen.getByText("00:00")).toBeInTheDocument();

    // Advance time by 5 seconds
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText("00:05")).toBeInTheDocument();
  });

  it("transitions back to idle on second press", async () => {
    const { HardwareSimulator } = await import("../HardwareSimulator");
    render(<HardwareSimulator />);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    const button = document.querySelector(".hw-button") as HTMLElement;

    // Start recording
    await user.click(button);
    expect(screen.getByText("● 录音中")).toBeInTheDocument();

    // Stop recording
    await user.click(button);
    expect(screen.getByText("● 待命")).toBeInTheDocument();
    expect(screen.getByText("开始服务")).toBeInTheDocument();
  });

  it("shows cross-tab hint", async () => {
    const { HardwareSimulator } = await import("../HardwareSimulator");
    render(<HardwareSimulator />);
    expect(screen.getByText("请在另一个标签页打开护理人员页面观察状态变化")).toBeInTheDocument();
  });
});
