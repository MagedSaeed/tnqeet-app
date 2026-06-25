import type { MethodInfo } from "../lib/api";
import { useI18n } from "../i18n";

interface Props {
  methods: MethodInfo[];
  active: string;
  onSelect: (id: string) => void;
}

export function MethodTabs({ methods, active, onSelect }: Props) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {methods.map((m) => {
        const disabled = !m.available;
        const isActive = m.id === active;
        return (
          <button
            key={m.id}
            disabled={disabled}
            onClick={() => onSelect(m.id)}
            title={disabled ? t.unavailable : undefined}
            aria-pressed={isActive}
            className={[
              "rounded-full border px-4 py-1.5 font-mono text-[0.8rem] transition",
              isActive
                ? "-translate-y-px border-accent bg-accent/20 font-semibold text-accent shadow-[0_2px_9px_-1px_rgb(var(--accent)/0.4)]"
                : disabled
                ? "cursor-not-allowed border-line/60 text-muted/40"
                : "border-line text-muted shadow-sm hover:-translate-y-px hover:border-accent/50 hover:bg-accent/5 hover:text-ink hover:shadow",
            ].join(" ")}
          >
            {m.label}
            {m.requiresKey && <span className="ms-1 align-text-top text-[0.6rem]">🔒</span>}
          </button>
        );
      })}
    </div>
  );
}
