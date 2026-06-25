import { useI18n } from "../i18n";

export function LangToggle() {
  const { lang, setLang } = useI18n();
  const cell = "px-3 py-1.5 text-xs font-semibold transition";
  const on = "bg-accent text-accent-contrast";
  const off = "text-muted hover:bg-accent/10 hover:text-ink";
  return (
    <div className="inline-flex overflow-hidden rounded-full border border-line">
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
