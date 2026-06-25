import { describe, it, expect, beforeEach, vi } from "vitest";
import { filterModels, type ORModel } from "../lib/openrouter";
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

describe("filterModels", () => {
  const models: ORModel[] = [
    { id: "anthropic/claude-opus-4", name: "Claude Opus 4" },
    { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4" },
    { id: "openai/gpt-4o", name: "GPT-4o" },
  ];
  it("returns all when query empty", () => {
    expect(filterModels(models, "")).toHaveLength(3);
  });
  it("filters by id or name, case-insensitive", () => {
    expect(filterModels(models, "claude").map((m) => m.id)).toEqual([
      "anthropic/claude-opus-4",
      "anthropic/claude-sonnet-4",
    ]);
    expect(filterModels(models, "gpt")[0].id).toBe("openai/gpt-4o");
  });
  it("caps results", () => {
    const many = Array.from({ length: 100 }, (_, i) => ({ id: `m/${i}`, name: `M${i}` }));
    expect(filterModels(many, "m").length).toBeLessThanOrEqual(50);
  });
});
