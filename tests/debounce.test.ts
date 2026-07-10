import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import debounce from "@/utils/debounce";

describe("debounce", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("invokes only once after the wait elapses", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced();
    debounced();
    debounced();
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("resets the timer on every call", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced();
    vi.advanceTimersByTime(60);
    debounced();
    vi.advanceTimersByTime(60);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(40);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("passes through the latest arguments", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 50);
    debounced("first");
    debounced("second");
    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledWith("second");
  });
});
