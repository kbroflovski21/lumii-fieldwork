import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock useAuth before importing the component
vi.mock("../../auth/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "u1",
      username: "admin",
      name: "管理员",
      role: "org_admin" as const,
      orgId: "org-001",
      siteIds: ["site-001"],
    },
    token: "mock-token",
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

// Mock CopilotPanel to avoid WebSocket dependencies in unit tests
vi.mock("../../features/siteOperations/CopilotPanel", () => ({
  CopilotPanel: ({ isOpen }: { workAreaId: string; isOpen: boolean; onClose: () => void }) => (
    <aside className="copilot-panel" data-open={isOpen} aria-label="AI 助手" />
  ),
}));

import { QualityPage } from "../QualityPage";

describe("QualityPage", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the page header with title", () => {
    render(<QualityPage />);
    expect(screen.getByText("金色年华 · 集团管理")).toBeInTheDocument();
  });

  it("shows running status line", () => {
    render(<QualityPage />);
    expect(screen.getByText(/运行中 · 4 个站点 · 本周 168 单/)).toBeInTheDocument();
  });

  it("renders dashboard view by default with KPI cards", () => {
    render(<QualityPage />);
    // Dashboard subtitle
    expect(screen.getByText("跨站点服务质量监测与分析")).toBeInTheDocument();
    // KPI labels (these use class quality-kpi-card__label)
    const kpiLabels = document.querySelectorAll(".quality-kpi-card__label");
    const labelTexts = Array.from(kpiLabels).map(el => el.textContent);
    expect(labelTexts).toContain("本周服务总量");
    expect(labelTexts).toContain("服务完成率");
    expect(labelTexts).toContain("SOP 平均完成率");
    expect(labelTexts).toContain("客户满意度");
    expect(labelTexts).toContain("异常率");
    expect(labelTexts).toContain("投诉率");
  });

  it("renders KPI values correctly", () => {
    render(<QualityPage />);
    // Use class-based selector to find KPI values specifically
    const kpiCards = document.querySelectorAll(".quality-kpi-card__value");
    const values = Array.from(kpiCards).map(el => el.textContent);
    expect(values).toContain("168");
    expect(values).toContain("93%");
    expect(values).toContain("87%");
    expect(values).toContain("4.6/5");
    expect(values).toContain("6.2%");
    expect(values).toContain("1.8%");
  });

  it("shows site comparison table with all four sites", () => {
    render(<QualityPage />);
    expect(screen.getByText("站点对比")).toBeInTheDocument();
    expect(screen.getByText("翠苑站")).toBeInTheDocument();
    expect(screen.getByText("三墩站")).toBeInTheDocument();
    expect(screen.getByText("古荡站")).toBeInTheDocument();
    expect(screen.getByText("文新站")).toBeInTheDocument();
  });

  it("shows SOP completion rates by service type", () => {
    render(<QualityPage />);
    expect(screen.getByText("服务项目 SOP 完成率")).toBeInTheDocument();
    expect(screen.getByText("探访关爱")).toBeInTheDocument();
    expect(screen.getByText("助浴")).toBeInTheDocument();
    expect(screen.getByText("用药提醒")).toBeInTheDocument();
    expect(screen.getByText("助餐")).toBeInTheDocument();
  });

  it("shows user avatar in sidebar with first character of name", () => {
    render(<QualityPage />);
    const avatar = screen.getByLabelText("用户菜单");
    expect(avatar).toBeInTheDocument();
    expect(avatar.textContent).toBe("管");
  });

  it("shows user name and logout in profile dropdown", async () => {
    render(<QualityPage />);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    // Click avatar to open profile menu
    const avatar = screen.getByLabelText("用户菜单");
    await user.click(avatar);

    // Profile menu should show user name and logout
    expect(screen.getByText("管理员")).toBeInTheDocument();
    expect(screen.getByText("退出登录")).toBeInTheDocument();
  });

  it("shows 'enter site operations' link for org_admin role", () => {
    render(<QualityPage />);
    const link = screen.getByText("进入站点运营");
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute("href", "/site-operations");
  });

  it("can switch to sites view via nav button", async () => {
    render(<QualityPage />);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByTitle("站点管理"));
    expect(screen.getByText("站点管理")).toBeInTheDocument();
    expect(screen.getByText("管理服务站点及运营人员分配")).toBeInTheDocument();
  });

  it("can switch back to dashboard from sites", async () => {
    render(<QualityPage />);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByTitle("站点管理"));
    expect(screen.getByText("管理服务站点及运营人员分配")).toBeInTheDocument();
    await user.click(screen.getByTitle("质量总览"));
    expect(screen.getByText("跨站点服务质量监测与分析")).toBeInTheDocument();
  });

  it("has a copilot toggle button in the header", () => {
    render(<QualityPage />);
    const toggle = screen.getByLabelText("打开 AI 助手");
    expect(toggle).toBeInTheDocument();
  });

  it("renders CopilotPanel component", () => {
    render(<QualityPage />);
    // CopilotPanel is rendered (initially closed)
    const panel = document.querySelector(".copilot-panel");
    expect(panel).toBeTruthy();
  });

  it("toggles copilot panel open and closed", async () => {
    render(<QualityPage />);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    // Initially copilot is closed
    expect(document.querySelector('.quality-page')?.getAttribute("data-copilot-open")).toBe("false");

    // Click to open
    const toggle = screen.getByLabelText("打开 AI 助手");
    await user.click(toggle);

    // Now copilot should be open
    expect(document.querySelector('.quality-page')?.getAttribute("data-copilot-open")).toBe("true");

    // Click to close
    const closeToggle = screen.getByLabelText("关闭 AI 助手");
    await user.click(closeToggle);

    expect(document.querySelector('.quality-page')?.getAttribute("data-copilot-open")).toBe("false");
  });
});

describe("QualityPage - site operations link visibility", () => {
  it("link is present for org_admin and links to correct URL", () => {
    // The default mock has role "org_admin", so the link should be visible
    render(<QualityPage />);
    const link = screen.getByText("进入站点运营");
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute("href", "/site-operations");
  });
});
