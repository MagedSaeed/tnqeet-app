// Exact set of letters the backend's `remove_dots` rewrites (dots/hamza/madda),
// i.e. every char whose remove_dots output differs from itself. Kept in sync
// with tnqeet over the full Arabic block.
const DOTTED_LETTERS = new Set("آأؤإئبةتثجخذزشضظغفقني");

// True when `text` contains at least one dotted letter (so it isn't pure rasm).
export function hasDots(text: string): boolean {
  for (const ch of text) if (DOTTED_LETTERS.has(ch)) return true;
  return false;
}

// True when `ch` is a single letter that carries i'jam dots.
export function isDotted(ch: string): boolean {
  return DOTTED_LETTERS.has(ch);
}
