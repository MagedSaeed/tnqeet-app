import { useI18n } from "../i18n";

export function LangToggle() {
  const { lang, setLang } = useI18n();
  const cell = "rounded-full px-3.5 py-1 text-sm font-bold leading-none transition";
  const on = "bg-accent text-accent-contrast shadow";
  const off = "text-muted/50 hover:text-ink";
  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-line bg-surface p-0.5">
      <button
        className={`${cell} ${lang === "en" ? on : off}`}
        aria-pressed={lang === "en"}
        onClick={() => setLang("en")}
      >
        EN
      </button>
      <button
        className={`${cell} ${lang === "ar" ? on : off}`}
        aria-pressed={lang === "ar"}
        onClick={() => setLang("ar")}
      >
        ع
      </button>
    </div>
  );
}
