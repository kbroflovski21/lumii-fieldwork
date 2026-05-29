import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { DetailPageProvider, useDetailEntity, useSetDetailEntity } from "../DetailPageContext";
import type { ReactNode } from "react";

function wrapper({ children }: { children: ReactNode }) {
  return <DetailPageProvider>{children}</DetailPageProvider>;
}

describe("DetailPageContext", () => {
  it("returns null when no entity is set", () => {
    const { result } = renderHook(() => useDetailEntity(), { wrapper });
    expect(result.current).toBeNull();
  });

  it("returns entity after setDetailEntity", () => {
    const { result } = renderHook(() => {
      const entity = useDetailEntity();
      const setEntity = useSetDetailEntity();
      return { entity, setEntity };
    }, { wrapper });

    act(() => {
      result.current.setEntity({ entityType: "social_worker", entityId: "w-001", entityName: "张三" });
    });

    expect(result.current.entity).toEqual({
      entityType: "social_worker",
      entityId: "w-001",
      entityName: "张三",
    });
  });

  it("clears entity when set to null", () => {
    const { result } = renderHook(() => {
      const entity = useDetailEntity();
      const setEntity = useSetDetailEntity();
      return { entity, setEntity };
    }, { wrapper });

    act(() => {
      result.current.setEntity({ entityType: "social_worker", entityId: "w-001", entityName: "张三" });
    });
    expect(result.current.entity).not.toBeNull();

    act(() => {
      result.current.setEntity(null);
    });
    expect(result.current.entity).toBeNull();
  });

  it("useDetailEntity throws outside provider", () => {
    expect(() => {
      renderHook(() => useDetailEntity());
    }).toThrow();
  });

  it("useSetDetailEntity throws outside provider", () => {
    expect(() => {
      renderHook(() => useSetDetailEntity());
    }).toThrow();
  });
});
