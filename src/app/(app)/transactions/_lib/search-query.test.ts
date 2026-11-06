import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SEARCH_QUERY_DEBOUNCE_MS, useDebouncedSearchQuery } from "./search-query";

afterEach(() => {
  vi.useRealTimers();
});

function setup(urlQ = "") {
  vi.useFakeTimers();
  const write = vi.fn();
  const hook = renderHook(({ q }: { q: string }) => useDebouncedSearchQuery(q, write), { initialProps: { q: urlQ } });
  return { write, ...hook };
}

describe("useDebouncedSearchQuery", () => {
  it("shows each letter at once and writes q once, with replace, after the pause", () => {
    const { result, write } = setup();

    act(() => result.current.onQueryChange("a"));
    act(() => result.current.onQueryChange("ac"));
    expect(result.current.query).toBe("ac");
    expect(write).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(SEARCH_QUERY_DEBOUNCE_MS - 1));
    expect(write).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    expect(write).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledWith("ac", "replace");
  });

  it("writes q immediately on commit and does not write again when the timer ends", () => {
    const { result, write } = setup();

    act(() => result.current.onQueryChange("rent"));
    act(() => result.current.commitQuery());
    expect(write).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledWith("rent", "replace");

    act(() => vi.advanceTimersByTime(SEARCH_QUERY_DEBOUNCE_MS));
    expect(write).toHaveBeenCalledTimes(1);
  });

  it("drops a pending query when the draft is replaced", () => {
    const { result, write } = setup("rent");

    act(() => result.current.onQueryChange("rent office"));
    act(() => result.current.replaceDraft(""));
    expect(result.current.query).toBe("");

    act(() => vi.advanceTimersByTime(SEARCH_QUERY_DEBOUNCE_MS));
    expect(write).not.toHaveBeenCalled();
  });

  it("returns the pending draft for another filter and does not write it again on its own", () => {
    const { result, write } = setup();

    act(() => result.current.onQueryChange("ke"));
    let pending = "";
    act(() => {
      pending = result.current.consumeDraft();
    });
    expect(pending).toBe("ke");

    act(() => vi.advanceTimersByTime(SEARCH_QUERY_DEBOUNCE_MS));
    expect(write).not.toHaveBeenCalled();
  });

  it("follows a url change it did not write and cancels the pending write", () => {
    const { result, write, rerender } = setup();

    act(() => result.current.onQueryChange("ab"));
    rerender({ q: "from-back" });
    expect(result.current.query).toBe("from-back");

    act(() => vi.advanceTimersByTime(SEARCH_QUERY_DEBOUNCE_MS));
    expect(write).not.toHaveBeenCalled();
  });

  it("keeps letters typed after a write that has not landed yet", () => {
    const { result, write, rerender } = setup();

    act(() => result.current.onQueryChange("ab"));
    act(() => vi.advanceTimersByTime(SEARCH_QUERY_DEBOUNCE_MS));
    expect(write).toHaveBeenCalledWith("ab", "replace");

    act(() => result.current.onQueryChange("abc"));
    rerender({ q: "ab" });
    expect(result.current.query).toBe("abc");

    act(() => vi.advanceTimersByTime(SEARCH_QUERY_DEBOUNCE_MS));
    expect(write).toHaveBeenLastCalledWith("abc", "replace");
  });
});
