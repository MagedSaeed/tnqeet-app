import { useState } from "react";
import { useI18n } from "../i18n";
import type { MethodInfo } from "../lib/api";
import { restoreDots } from "../lib/api";
import { DiffText } from "./DiffText";
import { Collapse } from "./Collapse";
import { Spinner } from "./icons";

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
  const [running, setRunning] = useState(false);

  const runAll = async () => {
    setRunning(true);
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
          className="text-[0.9rem] font-semibold text-muted transition hover:text-accent"
          aria-expanded={open}
        >
          <span className="font-mono">{open ? "–" : "+"}</span> {t.compareAll}
        </button>
        {open && (
          <button
            onClick={runAll}
            disabled={running || !text.trim()}
            className="inline-flex items-center gap-1.5 text-[0.9rem] font-semibold text-accent underline-offset-4 transition hover:underline disabled:cursor-not-allowed disabled:text-muted/50 disabled:no-underline"
          >
            {running && <Spinner />}
            {t.runAll}
          </button>
        )}
      </div>
      <Collapse open={open}>
        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {methods.map((m) => {
            const cell = results[m.id];
            return (
              <div key={m.id} className="rounded-xl border border-line bg-surface p-3.5">
                <div className="mb-2 font-mono text-[0.68rem] uppercase tracking-wider text-muted">
                  {m.label}
                </div>
                {!cell ? (
                  <div className="text-muted">
                    {running ? <Spinner /> : "…"}
                  </div>
                ) : cell.kind === "ok" ? (
                  <DiffText
                    output={cell.value}
                    className="font-arabic text-[0.95rem] leading-[1.9] text-ink"
                  />
                ) : (
                  <div className="text-sm text-muted">{cell.value}</div>
                )}
              </div>
            );
          })}
        </div>
      </Collapse>
    </section>
  );
}
