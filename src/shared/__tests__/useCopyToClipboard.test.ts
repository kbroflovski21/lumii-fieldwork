import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCopyToClipboard } from "../hooks/useCopyToClipboard";

describe("useCopyToClipboard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.execCommand = vi.fn().mockReturnValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with copied=false", () => {
    const { result } = renderHook(() => useCopyToClipboard());
    expect(result.current.copied).toBe(false);
  });

  it("sets copied=true after copy()", () => {
    const { result } = renderHook(() => useCopyToClipboard());
    act(() => result.current.copy("hello"));
    expect(result.current.copied).toBe(true);
  });

  it("resets copied after 1.5s", () => {
    const { result } = renderHook(() => useCopyToClipboard());
    act(() => result.current.copy("hello"));
    expect(result.current.copied).toBe(true);
    act(() => vi.advanceTimersByTime(1500));
    expect(result.current.copied).toBe(false);
  });
});
