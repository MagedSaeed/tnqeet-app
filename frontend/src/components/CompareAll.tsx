import { useState } from "react";
import { useI18n } from "../i18n";
import type { MethodInfo } from "../lib/api";
import { restoreDots } from "../lib/api";
import { DiffText } from "./DiffText";

interface Props {
  text: string;
  methods: MethodInfo[];
  apiKey: string;
  model: string;
}

type Cell = { kind: "ok"; value: string } | { kind: "msg"; value: string };

export function CompareAll({ text, methods, apiKey, model }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Record<string, Cell>>({});
  const [comparedInput, setComparedInput] = useState("");
  const [running, setRunning] = useState(false);

  const runAll = async () => {
    setRunning(true);
    setComparedInput(text);
    const out: Record<string, Cell> = {};
    // Sequential: bounds memory (matches the backend's resident-model cache).
    for (const m of methods) {
      if (!m.available) {
        out[m.id] = { kind: "msg", value: `— ${t.unavailable} —` };
        continue;
      }
      if (m.requiresKey && (!apiKey || !model)) {
        out[m.id] = { kind: "msg", value: `— ${t.enterKeyFirst} —` };
        continue;
      }
      try {
        const r = await restoreDots({
          text,
          method: m.id,
          model,
          apiKey: m.requiresKey ? apiKey : undefined,
        });
        out[m.id] = { kind: "ok", value: r.text };
      } catch (e) {
        out[m.id] = { kind: "msg", value: (e as Error).message };
      }
      setResults({ ...out });
    }
    setRunning(false);
  };

  return (
    <section className="mt-8 border-t border-line pt-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setOpen((o) => !o)}
          className="text-sm font-medium text-ink transition hover:text-accent"
          aria-expanded={open}
        >
          <span className="font-mono text-muted">{open ? "–" : "+"}</span> {t.compareAll}
        </button>
        {open && (
          <button
            onClick={runAll}
            disabled={running || !text.trim()}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />
            {t.runAll}
          </button>
        )}
      </div>
      {open && (
        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {methods.map((m) => {
            const cell = results[m.id];
            return (
              <div key={m.id} className="rounded-xl border border-line bg-surface p-3.5">
                <div className="mb-2 font-mono text-[0.68rem] uppercase tracking-wider text-muted">
                  {m.label}
                </div>
                {!cell ? (
                  <div dir="rtl" className="font-arabic text-lg text-muted">
                    …
                  </div>
                ) : cell.kind === "ok" ? (
                  <DiffText
                    input={comparedInput}
                    output={cell.value}
                    className="font-arabic text-lg leading-[1.9] text-ink"
                  />
                ) : (
                  <div className="text-sm text-muted">{cell.value}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
