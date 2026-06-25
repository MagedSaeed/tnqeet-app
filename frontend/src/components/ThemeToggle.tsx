import type { Theme } from "../hooks/useTheme";

export function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-label="Toggle theme"
      className="rounded-full border border-line px-3 py-1.5 text-sm text-muted transition hover:border-accent/50 hover:text-ink"
    >
      {theme === "dark" ? "☀" : "☾"}
    </button>
  );
}
