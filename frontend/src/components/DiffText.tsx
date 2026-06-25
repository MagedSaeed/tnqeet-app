import { isDotted } from "../lib/arabic";
import type { Seg } from "../lib/diff";

interface Props {
  output: string;
  segments?: Seg[] | null;
  className?: string;
  highlight?: boolean;
}

const DOT = "text-accent";
const OTHER = "text-sky-600 dark:text-sky-400";
// Whitespace has no glyph; tint its background so it stays visible.
const OTHER_BG = "rounded bg-sky-500/25";

// Render an "other" change in sky; whitespace gets a background block. Combining
// marks need no special case — they sit on their (also-blued) base letter.
function other(ch: string, key: number) {
  return (
    <span key={key} className={/\s/.test(ch) ? `px-0.5 ${OTHER_BG}` : OTHER}>
      {ch}
    </span>
  );
}

// Tint restored dots (accent). With `segments` (a rasm-vs-output diff), also
// tints other changes (sky); otherwise falls back to plain dotted-letter tinting.
export function DiffText({ output, segments, className, highlight = true }: Props) {
  return (
    <div dir="rtl" className={className}>
      {!highlight
        ? output
        : segments
          ? segments.map((s, i) =>
              s.kind === "same" ? (
                <span key={i}>{s.ch}</span>
              ) : s.kind === "dot" ? (
                <span key={i} className={DOT}>{s.ch}</span>
              ) : (
                other(s.ch, i)
              )
            )
          : [...output].map((ch, i) =>
              isDotted(ch) ? (
                <span key={i} className={DOT}>{ch}</span>
              ) : (
                <span key={i}>{ch}</span>
              )
            )}
    </div>
  );
}
