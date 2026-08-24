import { describe, expect, it, vi } from "vitest";

import { readStoredTheme, writeStoredTheme } from "./theme";

describe("theme persistence", () => {
  it("survives unavailable storage reads and writes", () => {
    const storage = {
      getItem: vi.fn(() => {
        throw new DOMException("blocked");
      }),
      setItem: vi.fn(() => {
        throw new DOMException("blocked");
      }),
    };
    expect(readStoredTheme(storage)).toBeNull();
    expect(writeStoredTheme(storage, "dark")).toBe(false);
  });
});
