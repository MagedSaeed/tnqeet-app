import { useI18n } from "../i18n";
import type { Lang } from "../i18n/detect";

export function LangToggle() {
  const { lang, setLang } = useI18n();

  const option = (code: Lang, text: string) => (
    <button
      aria-pressed={lang === code}
      onClick={() => setLang(code)}
      className={`relative z-10 w-9 rounded-full py-1 text-center text-sm font-bold leading-none transition-colors ${
        lang === code ? "text-accent-contrast" : "text-muted hover:text-ink"
      }`}
    >
      {text}
    </button>
  );

  return (
    // Pinned LTR so the sliding indicator stays predictable regardless of UI dir.
    <div
      dir="ltr"
      role="group"
      aria-label="Language"
      className="relative inline-flex rounded-full border border-line bg-surface p-0.5"
    >
      {/* Sliding accent indicator. */}
      <span
        aria-hidden="true"
        className="absolute bottom-0.5 left-0.5 top-0.5 w-9 rounded-full bg-accent shadow transition-transform duration-200 ease-out"
        style={{ transform: lang === "ar" ? "translateX(100%)" : "translateX(0)" }}
      />
      {option("en", "EN")}
      {option("ar", "ع")}
    </div>
  );
}
