import { useI18n } from "../i18n";
import { LangToggle } from "./LangToggle";
import { ThemeToggle } from "./ThemeToggle";
import type { Theme } from "../hooks/useTheme";

export function Header({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  const { t } = useI18n();
  return (
    <header className="flex items-start justify-between gap-4">
      <div>
        {/* Bilingual wordmark; the red dot echoes the restored diacritical point. */}
        <div className="flex items-baseline gap-2.5">
          <h1 className="font-arabic text-4xl leading-none">تَنقيط</h1>
          <span className="inline-block h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
          <span className="font-mono text-sm tracking-tight text-muted">tnqeet</span>
        </div>
        <p className="mt-2.5 max-w-sm text-sm text-muted">{t.subtitle}</p>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        <LangToggle />
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
    </header>
  );
}
