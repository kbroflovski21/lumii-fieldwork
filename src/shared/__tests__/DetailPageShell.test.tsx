import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { DetailPageShell } from "../DetailPageShell";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderShell(props?: Partial<React.ComponentProps<typeof DetailPageShell>>) {
  return render(
    <MemoryRouter>
      <DetailPageShell
        parentLabel="长者"
        parentPath="/elders"
        title="李明"
        {...props}
      >
        <div data-testid="child-content">Detail content</div>
      </DetailPageShell>
    </MemoryRouter>,
  );
}

describe("DetailPageShell", () => {
  beforeEach(() => mockNavigate.mockClear());

  it("renders breadcrumb with parent label and title", () => {
    renderShell();
    expect(screen.getByText("长者")).toBeInTheDocument();
    expect(screen.getByText("李明")).toBeInTheDocument();
  });

  it("renders children in the body area", () => {
    renderShell();
    expect(screen.getByTestId("child-content")).toBeInTheDocument();
  });

  it("navigates to parentPath when back arrow is clicked", async () => {
    renderShell();
    const user = userEvent.setup();
    await user.click(screen.getByLabelText("返回"));
    expect(mockNavigate).toHaveBeenCalledWith("/elders");
  });

  it("navigates to parentPath when parent label is clicked", async () => {
    renderShell();
    const user = userEvent.setup();
    await user.click(screen.getByText("长者"));
    expect(mockNavigate).toHaveBeenCalledWith("/elders");
  });

  it("renders optional action buttons", () => {
    renderShell({ actions: <button>编辑</button> });
    expect(screen.getByText("编辑")).toBeInTheDocument();
  });

  it("has correct CSS structure classes", () => {
    const { container } = renderShell();
    expect(container.querySelector(".detail-page")).toBeTruthy();
    expect(container.querySelector(".detail-page__header")).toBeTruthy();
    expect(container.querySelector(".detail-page__body")).toBeTruthy();
  });

  it("does not render actions wrapper when no actions prop", () => {
    const { container } = renderShell();
    expect(container.querySelector(".detail-page__actions")).toBeNull();
  });

  it("renders actions wrapper when actions prop is provided", () => {
    const { container } = renderShell({ actions: <button>删除</button> });
    expect(container.querySelector(".detail-page__actions")).toBeTruthy();
    expect(screen.getByText("删除")).toBeInTheDocument();
  });

  it("renders separator between parent label and title", () => {
    const { container } = renderShell();
    expect(container.querySelector(".detail-page__sep")?.textContent).toBe("/");
  });

  it("renders with different parent paths", async () => {
    renderShell({ parentLabel: "录音记录", parentPath: "/recordings", title: "REC-001" });
    const user = userEvent.setup();
    await user.click(screen.getByText("录音记录"));
    expect(mockNavigate).toHaveBeenCalledWith("/recordings");
  });
});
