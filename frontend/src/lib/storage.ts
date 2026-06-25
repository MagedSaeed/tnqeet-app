export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveJSON<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota/availability errors */
  }
}

// Storage keys used across the app.
export const KEYS = {
  theme: "tnqeet.theme",
  lang: "tnqeet.lang",
  apiKey: "tnqeet.openrouter.key",
  model: "tnqeet.openrouter.model",
} as const;
