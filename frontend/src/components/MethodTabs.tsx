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
    <div className="flex flex-wrap gap-1 border-b border-line">
      {methods.map((m) => {
        const disabled = !m.available;
        const isActive = m.id === active;
        return (
          <button
            key={m.id}
            disabled={disabled}
            onClick={() => onSelect(m.id)}
            title={disabled ? t.unavailable : undefined}
            className={[
              "relative -mb-px px-3.5 py-2.5 font-mono text-[0.8rem] transition",
              isActive
                ? "text-ink"
                : disabled
                ? "cursor-not-allowed text-muted/50"
                : "text-muted hover:text-ink",
            ].join(" ")}
          >
            {m.label}
            {m.requiresKey && <span className="ms-1 align-text-top text-[0.6rem]">🔒</span>}
            {isActive && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" />
            )}
          </button>
        );
      })}
    </div>
  );
}
