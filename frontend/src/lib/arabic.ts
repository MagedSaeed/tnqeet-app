// Arabic letters that carry i'jam dots — i.e. the exact set that the backend's
// `remove_dots` rewrites to a dotless rasm form. Kept in sync with tnqeet:
// computed as every letter whose remove_dots output differs from itself.
const DOTTED_LETTERS = new Set("بتثجخذزشضظغفقنيئؤإأة");

// True when `text` contains at least one dotted letter (so it isn't pure rasm).
export function hasDots(text: string): boolean {
  for (const ch of text) if (DOTTED_LETTERS.has(ch)) return true;
  return false;
}
