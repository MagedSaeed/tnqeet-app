import { useI18n } from "../i18n";
import { LangToggle } from "./LangToggle";
import { ThemeToggle } from "./ThemeToggle";
import type { Theme } from "../hooks/useTheme";

export function Header({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  const { t } = useI18n();
  return (
    <header className="flex items-start justify-between gap-3">
      <div>
        <h1 className="m-0 text-2xl font-bold tracking-tight">{t.title}</h1>
        <p className="m-0 mt-1 text-sm opacity-60">{t.subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        <LangToggle />
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
    </header>
  );
}
