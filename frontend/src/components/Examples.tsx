import { useState } from "react";
import { useI18n } from "../i18n";
import { EXAMPLES } from "../data/examples";
import { Collapse } from "./Collapse";

export function Examples({ onPick }: { onPick: (text: string) => void }) {
  const { t } = useI18n();
  const [showMore, setShowMore] = useState(false);
  const short = EXAMPLES.filter((e) => !e.isLong); // quick chips, always visible
  const long = EXAMPLES.filter((e) => e.isLong); // longer passages, behind disclosure

  return (
    <section className="mt-6 text-center">
      <span className="text-[0.9rem] font-semibold text-muted">{t.examples}</span>
      {/* Centered so the layout doesn't shift between LTR and RTL UIs. */}
      <div className="mt-2.5 flex flex-wrap justify-center gap-2">
        {short.map((e) => (
          <button
            key={e.text}
            dir="rtl"
            onClick={() => onPick(e.text)}
            className="rounded-full border border-line bg-surface px-3.5 py-1.5 font-arabic text-[0.95rem] leading-none text-ink transition hover:border-accent/50"
          >
            {e.text}
          </button>
        ))}
      </div>

      {long.length > 0 && (
        <>
          <button
            onClick={() => setShowMore((s) => !s)}
            className="mt-3 text-[0.9rem] font-semibold text-muted transition hover:text-accent"
            aria-expanded={showMore}
          >
            <span className="font-mono">{showMore ? "–" : "+"}</span> {t.moreExamples}
          </button>
          <Collapse open={showMore}>
            <div className="mt-2 flex flex-col gap-1.5">
              {long.map((e) => (
                <button
                  key={e.text}
                  dir="rtl"
                  onClick={() => onPick(e.text)}
                  title={e.text}
                  className="truncate rounded-xl border border-line bg-surface px-4 py-2.5 text-right font-arabic text-sm text-muted transition hover:border-accent/40 hover:text-ink"
                >
                  {e.text}
                </button>
              ))}
            </div>
          </Collapse>
        </>
      )}
    </section>
  );
}
