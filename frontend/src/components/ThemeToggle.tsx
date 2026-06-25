import type { Theme } from "../hooks/useTheme";

export function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-label="Toggle theme"
      className="rounded-full p-2 text-base leading-none text-muted transition hover:bg-accent/10 hover:text-ink"
    >
      {theme === "dark" ? "☀" : "☾"}
    </button>
  );
}
