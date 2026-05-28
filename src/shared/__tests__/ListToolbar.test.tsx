import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ListToolbar } from "../components/ListToolbar";

describe("ListToolbar", () => {
  it("renders search input with placeholder", () => {
    render(<ListToolbar searchValue="" onSearchChange={() => {}} searchPlaceholder="搜索姓名..." />);
    expect(screen.getByPlaceholderText("搜索姓名...")).toBeInTheDocument();
  });

  it("uses default placeholder", () => {
    render(<ListToolbar searchValue="" onSearchChange={() => {}} />);
    expect(screen.getByPlaceholderText("搜索...")).toBeInTheDocument();
  });

  it("calls onSearchChange when typing", async () => {
    const onChange = vi.fn();
    render(<ListToolbar searchValue="" onSearchChange={onChange} />);
    await userEvent.type(screen.getByPlaceholderText("搜索..."), "t");
    expect(onChange).toHaveBeenCalled();
  });

  it("renders filters slot", () => {
    render(<ListToolbar searchValue="" onSearchChange={() => {}} filters={<div data-testid="filters">filters</div>} />);
    expect(screen.getByTestId("filters")).toBeInTheDocument();
  });

  it("renders actions slot", () => {
    render(<ListToolbar searchValue="" onSearchChange={() => {}} actions={<button>新增</button>} />);
    expect(screen.getByText("新增")).toBeInTheDocument();
  });

  it("uses sw-toolbar and sw-search classes", () => {
    const { container } = render(<ListToolbar searchValue="" onSearchChange={() => {}} />);
    expect(container.querySelector(".sw-toolbar")).toBeTruthy();
    expect(container.querySelector(".sw-search")).toBeTruthy();
  });

  it("does not render filters wrapper when no filters", () => {
    const { container } = render(<ListToolbar searchValue="" onSearchChange={() => {}} />);
    expect(container.querySelector(".sw-toolbar__filters")).toBeNull();
  });

  it("renders filters wrapper when filters provided", () => {
    const { container } = render(<ListToolbar searchValue="" onSearchChange={() => {}} filters={<span>f</span>} />);
    expect(container.querySelector(".sw-toolbar__filters")).toBeTruthy();
  });
});
