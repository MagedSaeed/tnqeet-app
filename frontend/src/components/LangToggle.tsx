import { useI18n } from "../i18n";

export function LangToggle() {
  const { lang, setLang } = useI18n();
  const base = "px-2.5 py-1 text-sm cursor-pointer";
  const on = "bg-indigo-500/15 font-semibold";
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-zinc-300 dark:border-zinc-700">
      <span className={`${base} ${lang === "en" ? on : ""}`} onClick={() => setLang("en")}>EN</span>
      <span className={`${base} ${lang === "ar" ? on : ""}`} onClick={() => setLang("ar")}>ع</span>
    </div>
  );
}
