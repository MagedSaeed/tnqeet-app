import { describe, it, expect, beforeEach, vi } from "vitest";
import { detectLanguage } from "../i18n/detect";
import { loadJSON, saveJSON } from "../lib/storage";

describe("detectLanguage", () => {
  it("returns 'ar' for Arabic locales", () => {
    expect(detectLanguage("ar")).toBe("ar");
    expect(detectLanguage("ar-SA")).toBe("ar");
  });
  it("returns 'en' for non-Arabic locales", () => {
    expect(detectLanguage("en-US")).toBe("en");
    expect(detectLanguage("fr")).toBe("en");
    expect(detectLanguage(undefined)).toBe("en");
  });
});

describe("storage", () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
    });
  });
  it("round-trips JSON", () => {
    saveJSON("k", { a: 1 });
    expect(loadJSON("k", { a: 0 })).toEqual({ a: 1 });
  });
  it("returns fallback when missing or malformed", () => {
    expect(loadJSON("missing", "fb")).toBe("fb");
  });
});
