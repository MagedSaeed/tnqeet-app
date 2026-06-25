import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from "react";
import { detectLanguage, type Lang } from "./detect";
import { en, type Dict } from "./en";
import { ar } from "./ar";
import { KEYS, loadJSON, saveJSON } from "../lib/storage";

const DICTS: Record<Lang, Dict> = { en, ar };

interface I18nValue {
  lang: Lang;
  t: Dict;
  dir: "ltr" | "rtl";
  setLang: (l: Lang) => void;
}

const I18nContext = createContext<I18nValue | null>(null);

function initialLang(): Lang {
  const saved = loadJSON<Lang | null>(KEYS.lang, null);
  if (saved === "en" || saved === "ar") return saved;
  return detectLanguage(typeof navigator !== "undefined" ? navigator.language : undefined);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const dir = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const setLang = (l: Lang) => {
    saveJSON(KEYS.lang, l);
    setLangState(l);
  };

  return createElement(
    I18nContext.Provider,
    { value: { lang, t: DICTS[lang], dir, setLang } },
    children
  );
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
