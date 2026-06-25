import { useEffect, useState } from "react";
import { KEYS, loadJSON, saveJSON } from "../lib/storage";

export type Theme = "light" | "dark";

function initialTheme(): Theme {
  const saved = loadJSON<Theme | null>(KEYS.theme, null);
  if (saved === "light" || saved === "dark") return saved;
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "light";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    saveJSON(KEYS.theme, theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  return { theme, toggle };
}
