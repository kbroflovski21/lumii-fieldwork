import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SiteProvider, useSite } from "../SiteContext";
import { AuthProvider } from "../AuthContext";

const mockSites = [
  { id: "site-001", name: "阳光社区站", address: "阳光路1号" },
  { id: "site-002", name: "翠苑社区站", address: "翠苑路2号" },
];

function TestConsumer() {
  const { sites, currentSite, loading, needsSelection, selectSite } = useSite();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="sites-count">{sites.length}</span>
      <span data-testid="current-site">{currentSite ? currentSite.name : "none"}</span>
      <span data-testid="needs-selection">{String(needsSelection)}</span>
      {sites.map(s => (
        <button key={s.id} data-testid={`select-${s.id}`} onClick={() => selectSite(s)}>
          {s.name}
        </button>
      ))}
    </div>
  );
}

describe("SiteContext", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("loading starts true and resolves", async () => {
    // Mock fetch: first for /auth/me (AuthProvider), then for /auth/my-sites (SiteProvider)
    const mockUser = { id: "u1", username: "operator", name: "运营员", role: "site_operator", orgId: "org-001", siteIds: ["site-001"] };
    localStorage.setItem("gy_auth_token", "mock-token");
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ user: mockUser }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ sites: mockSites }) });

    render(
      <AuthProvider>
        <SiteProvider>
          <TestConsumer />
        </SiteProvider>
      </AuthProvider>
    );

    // Wait for auth + site loading
    await act(async () => { await new Promise(r => setTimeout(r, 100)); });

    expect(screen.getByTestId("loading").textContent).toBe("false");
    expect(screen.getByTestId("sites-count").textContent).toBe("2");
  });

  it("auto-selects single site", async () => {
    const mockUser = { id: "u1", username: "operator", name: "运营员", role: "site_operator", orgId: "org-001", siteIds: ["site-001"] };
    localStorage.setItem("gy_auth_token", "mock-token");
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ user: mockUser }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ sites: [mockSites[0]] }) });

    render(
      <AuthProvider>
        <SiteProvider>
          <TestConsumer />
        </SiteProvider>
      </AuthProvider>
    );

    await act(async () => { await new Promise(r => setTimeout(r, 100)); });

    expect(screen.getByTestId("current-site").textContent).toBe("阳光社区站");
    expect(screen.getByTestId("needs-selection").textContent).toBe("false");
  });

  it("multi-site operator needs selection", async () => {
    const mockUser = { id: "u1", username: "operator", name: "运营员", role: "site_operator", orgId: "org-001", siteIds: ["site-001", "site-002"] };
    localStorage.setItem("gy_auth_token", "mock-token");
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ user: mockUser }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ sites: mockSites }) });

    render(
      <AuthProvider>
        <SiteProvider>
          <TestConsumer />
        </SiteProvider>
      </AuthProvider>
    );

    await act(async () => { await new Promise(r => setTimeout(r, 100)); });

    expect(screen.getByTestId("needs-selection").textContent).toBe("true");
    expect(screen.getByTestId("current-site").textContent).toBe("none");
  });

  it("selectSite updates current site and saves to localStorage", async () => {
    const mockUser = { id: "u1", username: "operator", name: "运营员", role: "site_operator", orgId: "org-001", siteIds: ["site-001", "site-002"] };
    localStorage.setItem("gy_auth_token", "mock-token");
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ user: mockUser }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ sites: mockSites }) });

    render(
      <AuthProvider>
        <SiteProvider>
          <TestConsumer />
        </SiteProvider>
      </AuthProvider>
    );

    await act(async () => { await new Promise(r => setTimeout(r, 100)); });

    const user = userEvent.setup();
    await user.click(screen.getByTestId("select-site-002"));

    expect(screen.getByTestId("current-site").textContent).toBe("翠苑社区站");
    expect(screen.getByTestId("needs-selection").textContent).toBe("false");
    expect(localStorage.getItem("gy_current_site")).toBe("site-002");
  });

  it("org_admin skips site fetch", async () => {
    const mockUser = { id: "u1", username: "admin", name: "管理员", role: "org_admin", orgId: "org-001", siteIds: ["site-001"] };
    localStorage.setItem("gy_auth_token", "mock-token");
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ user: mockUser }) });

    render(
      <AuthProvider>
        <SiteProvider>
          <TestConsumer />
        </SiteProvider>
      </AuthProvider>
    );

    await act(async () => { await new Promise(r => setTimeout(r, 100)); });

    expect(screen.getByTestId("loading").textContent).toBe("false");
    // org_admin has no needsSelection, fetch was only called once (for /auth/me)
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("restores saved site from localStorage", async () => {
    const mockUser = { id: "u1", username: "operator", name: "运营员", role: "site_operator", orgId: "org-001", siteIds: ["site-001", "site-002"] };
    localStorage.setItem("gy_auth_token", "mock-token");
    localStorage.setItem("gy_current_site", "site-002");
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ user: mockUser }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ sites: mockSites }) });

    render(
      <AuthProvider>
        <SiteProvider>
          <TestConsumer />
        </SiteProvider>
      </AuthProvider>
    );

    await act(async () => { await new Promise(r => setTimeout(r, 100)); });

    expect(screen.getByTestId("current-site").textContent).toBe("翠苑社区站");
    expect(screen.getByTestId("needs-selection").textContent).toBe("false");
  });
});
