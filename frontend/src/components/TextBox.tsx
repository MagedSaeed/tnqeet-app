import { useI18n } from "../i18n";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onRemoveDots: () => void;
  busy?: boolean;
}

export function TextBox({ value, onChange, onRemoveDots, busy }: Props) {
  const { t } = useI18n();
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide opacity-50">{t.yourText}</span>
        <button
          onClick={onRemoveDots}
          disabled={busy || !value.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          ✕ {t.removeDots}
          <span className="text-[0.7rem] opacity-55">({t.ruleBased})</span>
        </button>
      </div>
      <textarea
        dir="rtl"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[80px] w-full rounded-xl border border-zinc-300 bg-transparent p-3 text-xl leading-loose outline-none focus:border-indigo-500 dark:border-zinc-700"
      />
    </div>
  );
}
