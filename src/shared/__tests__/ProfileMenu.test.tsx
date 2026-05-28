import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";

vi.mock("../../auth/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "u1", username: "admin", name: "管理员", role: "org_admin" },
    token: "mock-token",
    logout: vi.fn(),
  }),
}));

import { ProfileMenu } from "../ProfileMenu";

function renderMenu(props: { expanded?: boolean; roleName?: string } = {}) {
  return render(
    <MemoryRouter>
      <ProfileMenu {...props} />
    </MemoryRouter>,
  );
}

describe("ProfileMenu", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders collapsed avatar with user initial", () => {
    renderMenu();
    const btn = screen.getByLabelText("用户菜单");
    expect(btn).toBeInTheDocument();
    expect(btn.textContent).toContain("管");
  });

  it("renders expanded card with name and role", () => {
    renderMenu({ expanded: true, roleName: "集团管理" });
    expect(screen.getByText("管理员")).toBeInTheDocument();
    expect(screen.getByText("集团管理")).toBeInTheDocument();
  });

  it("always uses profile-card class for consistent width", () => {
    const { container } = renderMenu({ expanded: false });
    const btn = container.querySelector("button.site-operations-sidebar__profile-card");
    expect(btn).toBeTruthy();
  });

  it("opens menu on click and shows logout option", async () => {
    renderMenu({ expanded: true, roleName: "集团管理" });
    const user = userEvent.setup();
    await user.click(screen.getByLabelText("用户菜单"));
    expect(screen.getByText("退出登录")).toBeInTheDocument();
    expect(screen.getByText("修改密码")).toBeInTheDocument();
  });

  it("closes menu when backdrop is clicked", async () => {
    renderMenu({ expanded: true, roleName: "集团管理" });
    const user = userEvent.setup();

    await user.click(screen.getByLabelText("用户菜单"));
    expect(screen.getByText("退出登录")).toBeInTheDocument();

    const backdrop = document.querySelector(".so-shell__menu-backdrop") as HTMLElement;
    expect(backdrop).toBeTruthy();
    await user.click(backdrop);

    expect(screen.queryByText("退出登录")).not.toBeInTheDocument();
  });
});
