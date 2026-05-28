import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
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

// Mock useAgentChat
vi.mock("../../features/siteOperations/useAgentChat", () => ({
  useAgentChat: () => ({
    messages: [],
    connected: false,
    wip: false,
    handleSend: vi.fn(),
    sendCardAction: vi.fn(),
    endRef: { current: null },
  }),
}));

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { QualityPage } from "../QualityPage";

function renderWithRouter(initialEntry = "/admin") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/admin" element={<QualityPage activeView="dashboard" />} />
        <Route path="/admin/sites" element={<QualityPage activeView="sites" />}>
          <Route index element={null} />
          <Route path=":id" element={null} />
        </Route>
        <Route path="/admin/users" element={<QualityPage activeView="users" />}>
          <Route index element={null} />
          <Route path=":id" element={null} />
        </Route>
        <Route path="/admin/sop" element={<QualityPage activeView="sop" />} />
        <Route path="/admin/feishu" element={<QualityPage activeView="feishu" />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("QualityPage", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ users: [], sites: [] }) });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the dashboard view with KPI cards", () => {
    renderWithRouter("/admin");
    expect(screen.getByText("管理概览")).toBeInTheDocument();
  });

  it("renders users view with table headers", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ users: [] }),
    });
    renderWithRouter("/admin/users");
    expect(screen.getByText("用户管理")).toBeInTheDocument();
    expect(screen.getByText("管理系统用户账号、角色和权限")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("搜索用户名、姓名...")).toBeInTheDocument();
  });

  it("renders sites view with table headers", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ sites: [] }),
    });
    renderWithRouter("/admin/sites");
    expect(screen.getByText("站点管理")).toBeInTheDocument();
    expect(screen.getByText("管理服务站点及运营人员分配")).toBeInTheDocument();
  });
});

describe("QualityPage — URL search param filtering", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockFetch.mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("pre-fills search box from ?search= query param on users page", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        users: [
          { id: "u1", username: "admin", name: "管理员", role: "org_admin", orgId: "org-001", siteIds: [], phone: "", status: "active" },
          { id: "u2", username: "operator", name: "站点运营员", role: "site_operator", orgId: "org-001", siteIds: [], phone: "", status: "active" },
        ],
      }),
    });
    renderWithRouter("/admin/users?search=运营");
    const searchInput = screen.getByPlaceholderText("搜索用户名、姓名...") as HTMLInputElement;
    expect(searchInput.value).toBe("运营");
  });

  it("pre-fills search box from ?search= query param on sites page", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ sites: [] }),
    });
    renderWithRouter("/admin/sites?search=翠苑");
    const searchInput = screen.getByPlaceholderText("搜索站点名称、地址、联系人...") as HTMLInputElement;
    expect(searchInput.value).toBe("翠苑");
  });

  it("filters users table based on URL search param", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        users: [
          { id: "u1", username: "admin", name: "管理员", role: "org_admin", orgId: "org-001", siteIds: [], phone: "138", status: "active" },
          { id: "u2", username: "operator", name: "站点运营员", role: "site_operator", orgId: "org-001", siteIds: [], phone: "139", status: "active" },
        ],
      }),
    });
    renderWithRouter("/admin/users?search=运营");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    // "站点运营员" matches the search; "管理员" does not
    expect(screen.getByText("站点运营员")).toBeInTheDocument();
    expect(screen.queryByText("管理员")).not.toBeInTheDocument();
  });
});

describe("QualityPage — URL modal sync", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockFetch.mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("opens user detail modal when URL has :id param", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        users: [
          { id: "user-admin-001", username: "admin", name: "系统管理员", role: "org_admin", orgId: "org-001", siteIds: ["site-001"], phone: "138", status: "active" },
        ],
      }),
    });
    renderWithRouter("/admin/users/user-admin-001");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    // The modal scrim should be rendered
    expect(document.querySelector(".detail-page")).toBeTruthy();
  });

  it("opens site detail modal when URL has :id param", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        sites: [
          { id: "site-001", name: "翠苑站", address: "翠苑路1号", contactName: "张三", contactPhone: "138", operators: [] },
        ],
      }),
    });
    renderWithRouter("/admin/sites/site-001");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(document.querySelector(".detail-page")).toBeTruthy();
  });

  it("opens create user modal when URL is /admin/users/new", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ users: [] }),
    });
    renderWithRouter("/admin/users/new");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    // Create modal should be present
    expect(document.querySelector(".detail-page")).toBeTruthy();
  });

  it("does NOT open modal when URL has no :id param", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        users: [
          { id: "u1", username: "admin", name: "管理员", role: "org_admin", orgId: "org-001", siteIds: [], phone: "", status: "active" },
        ],
      }),
    });
    renderWithRouter("/admin/users");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(document.querySelector(".detail-page")).toBeNull();
  });
});
