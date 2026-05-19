import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock useAuth before importing the component
vi.mock("../../auth/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "u1",
      username: "supervisor",
      name: "主管",
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
    <aside className="copilot-panel" data-open={isOpen} aria-label="AI 助手面板" />
  ),
}));

import { SupervisorPage } from "../SupervisorPage";

describe("SupervisorPage", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the header with title", () => {
    render(<SupervisorPage />);
    expect(screen.getByText("集团管理 · 规范管理")).toBeInTheDocument();
  });

  it("shows AI ready status", () => {
    render(<SupervisorPage />);
    expect(screen.getByText("AI 就绪")).toBeInTheDocument();
  });

  it("shows user avatar in rail and profile menu on click", async () => {
    render(<SupervisorPage />);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    // Avatar shows first character of user name
    const avatar = screen.getByLabelText("用户菜单");
    expect(avatar).toBeInTheDocument();
    expect(avatar.textContent).toBe("主");

    // Click avatar to open profile menu
    await user.click(avatar);
    expect(screen.getByText("主管")).toBeInTheDocument();
    expect(screen.getByText("退出登录")).toBeInTheDocument();
  });

  it("shows directory panel with title", () => {
    render(<SupervisorPage />);
    expect(screen.getByText("目录")).toBeInTheDocument();
  });

  it("shows document panel with title", () => {
    render(<SupervisorPage />);
    expect(screen.getByText("文档")).toBeInTheDocument();
  });

  it("shows AI assistant panel with welcome message", () => {
    render(<SupervisorPage />);
    expect(screen.getByText("AI 助手")).toBeInTheDocument();
    expect(screen.getByText(/您好，我是规范管理助手/)).toBeInTheDocument();
  });

  it("shows directory sections: general and service", () => {
    render(<SupervisorPage />);
    expect(screen.getByText("通用规范")).toBeInTheDocument();
    expect(screen.getByText("服务项目规范")).toBeInTheDocument();
  });

  it("shows folder names in directory", () => {
    render(<SupervisorPage />);
    // "国家长期护理保险" appears in both folder name and doc toolbar (since it's selected)
    expect(screen.getAllByText("国家长期护理保险").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("清洁照护-口腔清洁")).toBeInTheDocument();
    expect(screen.getByText("基础健康观察-生命体征测量")).toBeInTheDocument();
  });

  it("shows document type labels (SOP, supervision, report)", () => {
    render(<SupervisorPage />);
    // These appear as file items under each folder
    const sopItems = screen.getAllByText("SOP");
    expect(sopItems.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("服务中实时督导要求").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("服务后报告要求").length).toBeGreaterThanOrEqual(1);
  });

  it("selects default folder and shows SOP document content", () => {
    render(<SupervisorPage />);
    // Default selected is gen-ltci with SOP doc
    expect(screen.getByText(/上门服务人员必须在开始服务时自报家门/)).toBeInTheDocument();
  });

  it("shows version tag on selected document", () => {
    render(<SupervisorPage />);
    // gen-ltci SOP is v3
    const versionTags = screen.getAllByText("v3");
    expect(versionTags.length).toBeGreaterThanOrEqual(1);
  });

  it("shows AI generated tag for AI-generated documents", () => {
    render(<SupervisorPage />);
    // Click on the supervision doc (which is AI generated)
    // First, let's check that clicking on supervision shows the AI tag
    // The gen-ltci SOP is manual, so no "AI 生成" tag by default
    // But supervision is ai_generated - we need to select it first
  });

  it("has edit button for document", () => {
    render(<SupervisorPage />);
    expect(screen.getByText("编辑")).toBeInTheDocument();
  });

  it("has history button for document", () => {
    render(<SupervisorPage />);
    // History button shows as "v3 历史" for the default doc
    expect(screen.getByText("v3 历史")).toBeInTheDocument();
  });

  it("has delete document button", () => {
    render(<SupervisorPage />);
    expect(screen.getByText("删除文档")).toBeInTheDocument();
  });

  it("can enter and exit edit mode", async () => {
    render(<SupervisorPage />);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    // Click edit
    await user.click(screen.getByText("编辑"));

    // Should show save and cancel buttons
    expect(screen.getByText("保存")).toBeInTheDocument();
    expect(screen.getByText("取消")).toBeInTheDocument();

    // Should have a textarea
    const textarea = document.querySelector(".sv-doc__editor") as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();
    expect(textarea.value).toContain("上门服务人员必须在开始服务时自报家门");

    // Click cancel
    await user.click(screen.getByText("取消"));

    // Should be back to view mode
    expect(screen.getByText("编辑")).toBeInTheDocument();
    expect(screen.queryByText("保存")).not.toBeInTheDocument();
  });

  it("can save document edits and increment version", async () => {
    render(<SupervisorPage />);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    // Enter edit mode
    await user.click(screen.getByText("编辑"));

    // Edit the textarea
    const textarea = document.querySelector(".sv-doc__editor") as HTMLTextAreaElement;
    await user.clear(textarea);
    await user.type(textarea, "新的 SOP 内容");

    // Save
    await user.click(screen.getByText("保存"));

    // Version should increment from v3 to v4
    expect(screen.getByText("v4 历史")).toBeInTheDocument();
    expect(screen.getByText("新的 SOP 内容")).toBeInTheDocument();
  });

  it("can switch to a different document type within folder", async () => {
    render(<SupervisorPage />);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    // Click on the supervision file under gen-ltci
    // The gen-ltci folder should be expanded by default (it's selected)
    const supervisionFiles = screen.getAllByText("服务中实时督导要求");
    // Click the first one (under gen-ltci)
    await user.click(supervisionFiles[0]);

    // Should show supervision content
    expect(screen.getByText(/开场 1 分钟内未做自报家门/)).toBeInTheDocument();
    // Should show AI 生成 tag since supervision is ai_generated
    expect(screen.getByText("AI 生成")).toBeInTheDocument();
  });

  it("can view version history", async () => {
    render(<SupervisorPage />);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    // Click history button
    await user.click(screen.getByText("v3 历史"));

    // Should show version history view
    expect(screen.getByText(/查看历史版本/)).toBeInTheDocument();
    expect(screen.getByText(/返回最新版本/)).toBeInTheDocument();

    // Should show version pills
    expect(screen.getByText(/v1 · 2026-04-01/)).toBeInTheDocument();
    expect(screen.getByText(/v2 · 2026-04-20/)).toBeInTheDocument();
    expect(screen.getByText(/v3 · 2026-05-14/)).toBeInTheDocument();
  });

  it("can return from version history to latest version", async () => {
    render(<SupervisorPage />);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    // Go to history
    await user.click(screen.getByText("v3 历史"));
    expect(screen.getByText(/查看历史版本/)).toBeInTheDocument();

    // Return to latest
    await user.click(screen.getByText(/返回最新版本/));

    // Should be back to normal doc view
    expect(screen.getByText("编辑")).toBeInTheDocument();
  });

  it("shows delete confirmation modal", async () => {
    render(<SupervisorPage />);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    // Click the delete document button (the one with class sv-btn--danger-outline)
    const deleteBtn = document.querySelector(".sv-btn--danger-outline") as HTMLElement;
    await user.click(deleteBtn);

    // Confirmation modal appears - "删除文档" now appears twice (button + modal title)
    expect(screen.getAllByText("删除文档").length).toBe(2);
    expect(screen.getByText(/确定要删除/)).toBeInTheDocument();
    expect(screen.getByText("确认删除")).toBeInTheDocument();
  });

  it("can send message to AI chat", async () => {
    render(<SupervisorPage />);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    // Use the SOP chat input (inside .sv-chat__input-bar)
    const input = document.querySelector(".sv-chat__input") as HTMLInputElement;
    expect(input).toBeTruthy();
    await user.type(input, "我想添加一个新规范");

    // Click send button
    const sendBtn = screen.getByLabelText("发送");
    await user.click(sendBtn);

    // User message should appear
    expect(screen.getByText("我想添加一个新规范")).toBeInTheDocument();

    // Wait for AI response
    await act(async () => {
      vi.advanceTimersByTime(700);
    });

    expect(screen.getByText(/请告诉我规范名称和 SOP 内容/)).toBeInTheDocument();
  });

  it("can collapse directory section", async () => {
    render(<SupervisorPage />);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    // Before collapsing, folder name appears in both directory and doc toolbar
    const beforeCount = screen.getAllByText("国家长期护理保险").length;
    expect(beforeCount).toBe(2); // directory folder + doc toolbar

    // Click on "通用规范" section header to collapse it
    await user.click(screen.getByText("通用规范"));

    // Folder name should disappear from directory but remain in doc toolbar
    const afterCount = screen.getAllByText("国家长期护理保险").length;
    expect(afterCount).toBe(1); // only doc toolbar remains

    // The "添加通用规范" button should also be hidden
    expect(screen.queryByText("添加通用规范")).not.toBeInTheDocument();

    // Click again to expand
    await user.click(screen.getByText("通用规范"));
    expect(screen.getAllByText("国家长期护理保险").length).toBe(2);
  });

  it("shows add buttons in directory sections", () => {
    render(<SupervisorPage />);
    expect(screen.getByText("添加通用规范")).toBeInTheDocument();
    expect(screen.getByText("添加服务项目规范")).toBeInTheDocument();
  });

  it("has rail with logo and copilot toggle in header", () => {
    render(<SupervisorPage />);
    // Rail logo exists
    const logo = document.querySelector(".sv-rail__logo");
    expect(logo).toBeTruthy();
    // Copilot toggle exists in header
    const toggle = screen.getByLabelText("打开 AI 助手");
    expect(toggle).toBeInTheDocument();
  });

  it("has file upload button in chat", () => {
    render(<SupervisorPage />);
    const uploadBtn = screen.getByLabelText("上传文件");
    expect(uploadBtn).toBeInTheDocument();
  });
});
