import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAutoSave } from "@/hooks/useAutoSave";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useAutoSave", () => {
  it("does NOT call onSave on first render", () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderHook(() => useAutoSave("initial", onSave, 1000));
    act(() => vi.runAllTimers());
    expect(onSave).not.toHaveBeenCalled();
  });

  it("calls onSave after the debounce delay when value changes", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(
      ({ value }) => useAutoSave(value, onSave, 1000),
      { initialProps: { value: "initial" } }
    );

    rerender({ value: "changed" });
    expect(onSave).not.toHaveBeenCalled();

    await act(async () => { vi.advanceTimersByTime(1000); });
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("debounces: only calls onSave once for rapid value changes", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(
      ({ value }) => useAutoSave(value, onSave, 1000),
      { initialProps: { value: "a" } }
    );

    rerender({ value: "b" });
    rerender({ value: "c" });
    rerender({ value: "d" });

    await act(async () => { vi.advanceTimersByTime(1000); });
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("does not call onSave after unmount even when timer was pending", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { rerender, unmount } = renderHook(
      ({ value }) => useAutoSave(value, onSave, 1000),
      { initialProps: { value: "a" } }
    );

    rerender({ value: "b" });
    unmount();

    await act(async () => { vi.runAllTimers(); });
    expect(onSave).not.toHaveBeenCalled();
  });

  it("respects a custom delay", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(
      ({ value }) => useAutoSave(value, onSave, 500),
      { initialProps: { value: "a" } }
    );

    rerender({ value: "b" });
    act(() => vi.advanceTimersByTime(499));
    expect(onSave).not.toHaveBeenCalled();

    await act(async () => { vi.advanceTimersByTime(1); });
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("always uses latest onSave (avoids stale closures)", async () => {
    const onSave1 = vi.fn().mockResolvedValue(undefined);
    const onSave2 = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(
      ({ value, onSave }) => useAutoSave(value, onSave, 1000),
      { initialProps: { value: "a", onSave: onSave1 } }
    );

    rerender({ value: "b", onSave: onSave1 });
    // Replace onSave before timer fires
    rerender({ value: "b", onSave: onSave2 });

    await act(async () => { vi.advanceTimersByTime(1000); });
    expect(onSave2).toHaveBeenCalledTimes(1);
    expect(onSave1).not.toHaveBeenCalled();
  });
});
