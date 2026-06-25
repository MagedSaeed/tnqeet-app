import { useI18n } from "../i18n";
import { EXAMPLES } from "../data/examples";

function truncate(text: string, n = 60): string {
  return text.length > n ? text.slice(0, n) + "…" : text;
}

export function Examples({ onPick }: { onPick: (text: string) => void }) {
  const { t } = useI18n();
  const short = EXAMPLES.filter((e) => !e.isLong);
  const long = EXAMPLES.filter((e) => e.isLong);
  return (
    <div className="my-4">
      <div className="mb-2 text-xs uppercase tracking-wide opacity-50">{t.examples}</div>
      <div className="flex flex-wrap gap-2" dir="rtl">
        {short.map((e) => (
          <button
            key={e.text}
            onClick={() => onPick(e.text)}
            className="rounded-full border border-zinc-300 px-3 py-1.5 text-base hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            title={e.caption}
          >
            {e.text}
          </button>
        ))}
      </div>
      <div className="mt-2 flex flex-col gap-1.5" dir="rtl">
        {long.map((e) => (
          <button
            key={e.text}
            onClick={() => onPick(e.text)}
            className="truncate rounded-lg border border-zinc-200 px-3 py-2 text-right text-sm hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800"
            title={e.text}
          >
            {truncate(e.text)}
          </button>
        ))}
      </div>
    </div>
  );
}
