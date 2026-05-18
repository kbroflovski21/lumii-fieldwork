import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "../AuthContext";

function TestConsumer() {
  const { user, loading, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? user.name : "null"}</span>
      <button onClick={() => login("admin", "admin123")}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("starts with no user when no token in localStorage", async () => {
    globalThis.fetch = vi.fn();
    render(<AuthProvider><TestConsumer /></AuthProvider>);
    // Wait for loading to finish
    await act(async () => { await new Promise(r => setTimeout(r, 10)); });
    expect(screen.getByTestId("user").textContent).toBe("null");
    expect(screen.getByTestId("loading").textContent).toBe("false");
  });

  it("login stores token and sets user", async () => {
    const mockUser = { id: "u1", username: "admin", name: "管理员", role: "org_admin", orgId: "org-001", siteIds: ["site-001"] };
    globalThis.fetch = vi.fn()
      // First call: POST /api/auth/login
      .mockResolvedValueOnce({ ok: true, json: async () => ({ token: "test-token", user: mockUser }) })
      // Second call: GET /api/auth/me (triggered by token state change)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ user: mockUser }) });

    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await act(async () => { await new Promise(r => setTimeout(r, 10)); });

    const user = userEvent.setup();
    await user.click(screen.getByText("Login"));

    // Wait for the /me effect to settle
    await act(async () => { await new Promise(r => setTimeout(r, 50)); });

    expect(screen.getByTestId("user").textContent).toBe("管理员");
    expect(localStorage.getItem("gy_auth_token")).toBe("test-token");
  });

  it("logout clears user and token", async () => {
    localStorage.setItem("gy_auth_token", "existing-token");
    const mockUser = { id: "u1", username: "admin", name: "管理员", role: "org_admin", orgId: "org-001", siteIds: ["site-001"] };
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ user: mockUser }) });

    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await act(async () => { await new Promise(r => setTimeout(r, 50)); });
    expect(screen.getByTestId("user").textContent).toBe("管理员");

    const u = userEvent.setup();
    await u.click(screen.getByText("Logout"));

    expect(screen.getByTestId("user").textContent).toBe("null");
    expect(localStorage.getItem("gy_auth_token")).toBeNull();
  });
});
