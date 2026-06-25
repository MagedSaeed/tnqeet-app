import { useState } from "react";
import { useI18n } from "../i18n";
import type { MethodInfo } from "../lib/api";
import { restoreDots } from "../lib/api";

interface Props {
  text: string;
  methods: MethodInfo[];
  apiKey: string;
  model: string;
}

export function CompareAll({ text, methods, apiKey, model }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Record<string, string>>({});
  const [running, setRunning] = useState(false);

  const runAll = async () => {
    setRunning(true);
    const out: Record<string, string> = {};
    // Sequential: bounds memory (matches backend cache limit).
    for (const m of methods) {
      if (!m.available) { out[m.id] = `— ${t.unavailable} —`; continue; }
      if (m.requiresKey && !apiKey) { out[m.id] = `— ${t.unavailable} —`; continue; }
      try {
        const r = await restoreDots({ text, method: m.id, model, apiKey: m.requiresKey ? apiKey : undefined });
        out[m.id] = r.text;
      } catch (e) {
        out[m.id] = (e as Error).message;
      }
      setResults({ ...out });
    }
    setRunning(false);
  };

  return (
    <div className="mt-4 border-t border-dashed border-zinc-300 pt-3 dark:border-zinc-700">
      <div className="flex items-center gap-3">
        <button onClick={() => setOpen((o) => !o)} className="text-sm opacity-80">
          {open ? "▾" : "▸"} {t.compareAll}
        </button>
        {open && (
          <button onClick={runAll} disabled={running || !text.trim()} className="rounded-lg bg-indigo-500 px-3 py-1.5 text-sm text-white disabled:opacity-50">
            ✦ {t.runAll}
          </button>
        )}
      </div>
      {open && (
        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {methods.map((m) => (
            <div key={m.id} className="rounded-lg border border-zinc-300 p-3 dark:border-zinc-700">
              <div className="mb-1.5 text-[0.7rem] opacity-55">{m.label}</div>
              <div dir="rtl" className="text-right text-lg">{results[m.id] ?? "…"}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
