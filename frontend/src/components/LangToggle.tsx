import { useI18n } from "../i18n";

export function LangToggle() {
  const { lang, setLang } = useI18n();
  const cell = "px-3 py-1.5 text-xs font-medium transition";
  const on = "bg-accent/10 text-accent";
  const off = "text-muted hover:text-ink";
  return (
    <div className="inline-flex overflow-hidden rounded-full border border-line">
      <button className={`${cell} ${lang === "en" ? on : off}`} onClick={() => setLang("en")}>
        EN
      </button>
      <button className={`${cell} ${lang === "ar" ? on : off}`} onClick={() => setLang("ar")}>
        ع
      </button>
    </div>
  );
}
