export type Lang = "en" | "ar";

export function detectLanguage(locale: string | undefined): Lang {
  if (locale && locale.toLowerCase().startsWith("ar")) return "ar";
  return "en";
}
