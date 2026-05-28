import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useRouteDetail } from "../hooks/useRouteDetail";
import type { ReactNode } from "react";

const mockNavigate = vi.fn();
let mockParams: Record<string, string> = {};
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: () => mockParams,
    useNavigate: () => mockNavigate,
  };
});

const items = [
  { id: "w-001", name: "张三" },
  { id: "w-002", name: "李四" },
];

function wrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

describe("useRouteDetail", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockParams = {};
  });

  it("returns no selection when no route id", () => {
    const { result } = renderHook(() => useRouteDetail("/workers", items, (i) => i.id), { wrapper });
    expect(result.current.routeId).toBeUndefined();
    expect(result.current.selectedItem).toBeUndefined();
    expect(result.current.isCreate).toBe(false);
  });

  it("selects item by route id", () => {
    mockParams = { id: "w-001" };
    const { result } = renderHook(() => useRouteDetail("/workers", items, (i) => i.id), { wrapper });
    expect(result.current.routeId).toBe("w-001");
    expect(result.current.selectedItem).toEqual({ id: "w-001", name: "张三" });
  });

  it("detects create mode", () => {
    mockParams = { id: "new" };
    const { result } = renderHook(() => useRouteDetail("/workers", items, (i) => i.id), { wrapper });
    expect(result.current.isCreate).toBe(true);
    expect(result.current.selectedItem).toBeUndefined();
  });

  it("close navigates to basePath", () => {
    mockParams = { id: "w-001" };
    const { result } = renderHook(() => useRouteDetail("/workers", items, (i) => i.id), { wrapper });
    act(() => result.current.close());
    expect(mockNavigate).toHaveBeenCalledWith("/workers");
  });

  it("open navigates to item path", () => {
    const { result } = renderHook(() => useRouteDetail("/workers", items, (i) => i.id), { wrapper });
    act(() => result.current.open("w-002"));
    expect(mockNavigate).toHaveBeenCalledWith("/workers/w-002");
  });

  it("openCreate navigates to new path", () => {
    const { result } = renderHook(() => useRouteDetail("/workers", items, (i) => i.id), { wrapper });
    act(() => result.current.openCreate());
    expect(mockNavigate).toHaveBeenCalledWith("/workers/new");
  });
});
