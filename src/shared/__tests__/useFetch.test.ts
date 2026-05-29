import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useFetch } from "../hooks/useFetch";

describe("useFetch", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
  });

  it("starts with loading=true when url is provided", () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useFetch("/api/test", [], mockFetch));
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("skips fetch when url is null", () => {
    const { result } = renderHook(() => useFetch(null, [], mockFetch));
    expect(result.current.loading).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("sets data on success", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ items: [1, 2] }) } as any);
    const { result } = renderHook(() => useFetch<{ items: number[] }>("/api/test", [], mockFetch));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual({ items: [1, 2] });
    expect(result.current.error).toBeNull();
  });

  it("sets error on HTTP error", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 } as any);
    const { result } = renderHook(() => useFetch("/api/test", [], mockFetch));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();
    expect(result.current.data).toBeNull();
  });

  it("sets error on network failure", async () => {
    mockFetch.mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => useFetch("/api/test", [], mockFetch));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("network");
  });

  it("re-fetches when deps change", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve("a") } as any);
    const { result, rerender } = renderHook(
      ({ dep }) => useFetch<string>("/api/test", [dep], mockFetch),
      { initialProps: { dep: 1 } }
    );
    await waitFor(() => expect(result.current.data).toBe("a"));
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve("b") } as any);
    rerender({ dep: 2 });
    await waitFor(() => expect(result.current.data).toBe("b"));
  });
});
