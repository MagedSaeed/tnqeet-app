import { useI18n } from "../i18n";
import { btnPrimary } from "../lib/ui";
import { RemoveDotsIcon } from "./icons";

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
      <div className="mb-2">
        <span className="text-[0.9rem] font-semibold text-muted">{t.yourText}</span>
      </div>
      <textarea
        dir="rtl"
        value={value}
        rows={3}
        onChange={(e) => onChange(e.target.value)}
        className="w-full resize-y rounded-2xl border border-line bg-surface px-4 py-3.5 font-arabic text-[1.05rem] leading-[1.8] text-ink outline-none transition focus:border-accent"
      />
      <div className="mt-2 flex justify-end">
        <button onClick={onRemoveDots} disabled={busy || !value.trim()} className={btnPrimary}>
          <RemoveDotsIcon />
          {t.removeDots}
        </button>
      </div>
    </section>
  );
}
