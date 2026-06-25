import { useI18n } from "../i18n";
import { btnGhost } from "../lib/ui";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onRemoveDots: () => void;
  busy?: boolean;
}

export function TextBox({ value, onChange, onRemoveDots, busy }: Props) {
  const { t } = useI18n();
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[0.7rem] font-medium uppercase tracking-[0.18em] text-muted">
          {t.yourText}
        </span>
        <button onClick={onRemoveDots} disabled={busy || !value.trim()} className={btnGhost}>
          {t.removeDots}
        </button>
      </div>
      <textarea
        dir="rtl"
        value={value}
        rows={3}
        onChange={(e) => onChange(e.target.value)}
        className="w-full resize-y rounded-2xl border border-line bg-surface px-4 py-3.5 font-arabic text-3xl leading-[1.9] text-ink outline-none transition focus:border-accent"
      />
    </section>
  );
}
