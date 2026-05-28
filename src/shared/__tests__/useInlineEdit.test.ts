import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useInlineEdit } from "../hooks/useInlineEdit";

describe("useInlineEdit", () => {
  it("starts in non-editing state", () => {
    const { result } = renderHook(() => useInlineEdit("hello", vi.fn()));
    expect(result.current.editing).toBe(false);
    expect(result.current.draft).toBe("hello");
    expect(result.current.saving).toBe(false);
  });

  it("startEdit sets editing to true", () => {
    const { result } = renderHook(() => useInlineEdit("hello", vi.fn()));
    act(() => result.current.startEdit());
    expect(result.current.editing).toBe(true);
  });

  it("setDraft updates draft value", () => {
    const { result } = renderHook(() => useInlineEdit("hello", vi.fn()));
    act(() => result.current.startEdit());
    act(() => result.current.setDraft("world"));
    expect(result.current.draft).toBe("world");
  });

  it("cancel resets draft and exits editing", () => {
    const { result } = renderHook(() => useInlineEdit("hello", vi.fn()));
    act(() => result.current.startEdit());
    act(() => result.current.setDraft("world"));
    act(() => result.current.cancel());
    expect(result.current.editing).toBe(false);
    expect(result.current.draft).toBe("hello");
  });

  it("save calls onSave with draft and exits editing on success", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useInlineEdit("hello", onSave));
    act(() => result.current.startEdit());
    act(() => result.current.setDraft("world"));
    await act(async () => { await result.current.save(); });
    expect(onSave).toHaveBeenCalledWith("world");
    expect(result.current.editing).toBe(false);
    expect(result.current.saving).toBe(false);
  });

  it("save keeps editing on rejection", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("fail"));
    const { result } = renderHook(() => useInlineEdit("hello", onSave));
    act(() => result.current.startEdit());
    act(() => result.current.setDraft("world"));
    await act(async () => { await result.current.save(); });
    expect(result.current.editing).toBe(true);
    expect(result.current.saving).toBe(false);
  });

  it("syncs draft when initialValue changes and not editing", () => {
    const { result, rerender } = renderHook(
      ({ initial }) => useInlineEdit(initial, vi.fn()),
      { initialProps: { initial: "hello" } }
    );
    expect(result.current.draft).toBe("hello");
    rerender({ initial: "updated" });
    expect(result.current.draft).toBe("updated");
  });

  it("does not sync draft when editing", () => {
    const { result, rerender } = renderHook(
      ({ initial }) => useInlineEdit(initial, vi.fn()),
      { initialProps: { initial: "hello" } }
    );
    act(() => result.current.startEdit());
    act(() => result.current.setDraft("my-edit"));
    rerender({ initial: "updated" });
    expect(result.current.draft).toBe("my-edit");
  });

  it("works with object values", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const initial = { name: "张三", phone: "123" };
    const { result } = renderHook(() => useInlineEdit(initial, onSave));
    act(() => result.current.startEdit());
    act(() => result.current.setDraft({ name: "李四", phone: "456" }));
    await act(async () => { await result.current.save(); });
    expect(onSave).toHaveBeenCalledWith({ name: "李四", phone: "456" });
  });
});
