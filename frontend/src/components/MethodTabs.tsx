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
    <div className="flex flex-wrap items-end">
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
              "rounded-t-lg border border-b-0 px-3.5 py-1.5 text-sm",
              isActive
                ? "border-indigo-500 bg-indigo-500/15 font-semibold"
                : "border-zinc-300 dark:border-zinc-700",
              disabled ? "cursor-not-allowed opacity-40" : "opacity-70 hover:opacity-100",
            ].join(" ")}
          >
            {m.label}
            {m.requiresKey && <span className="ml-1 text-[0.62rem] opacity-70">🔒</span>}
          </button>
        );
      })}
    </div>
  );
}
