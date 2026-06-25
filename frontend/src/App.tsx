import { useEffect, useState } from "react";
import { I18nProvider, useI18n } from "./i18n";
import { useTheme } from "./hooks/useTheme";
import { Header } from "./components/Header";
import { TextBox } from "./components/TextBox";
import { Examples } from "./components/Examples";
import { MethodTabs } from "./components/MethodTabs";
import { ResultPanel } from "./components/ResultPanel";
import { CompareAll } from "./components/CompareAll";
import { LlmPanel } from "./components/LlmPanel";
import { getMethods, removeDots, restoreDots, type MethodInfo } from "./lib/api";
import { KEYS, loadJSON } from "./lib/storage";
import { EXAMPLES } from "./data/examples";

function Inner() {
  const { t, dir } = useI18n();
  const { theme, toggle } = useTheme();

  const [methods, setMethods] = useState<MethodInfo[]>([]);
  const [active, setActive] = useState("ngram");
  const [text, setText] = useState(EXAMPLES[0].text);
  const [result, setResult] = useState<{ input: string; text: string; label: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [apiKey, setApiKey] = useState(loadJSON<string>(KEYS.apiKey, ""));
  const [model, setModel] = useState(loadJSON<string>(KEYS.model, ""));

  useEffect(() => {
    // Fetch the method catalog once on mount. `t.errorGeneric` is intentionally
    // NOT a dependency — including it would re-fetch on every language switch.
    getMethods()
      .then((m) => {
        setMethods(m);
        const firstAvailable = m.find((x) => x.available);
        if (firstAvailable) setActive(firstAvailable.id);
      })
      .catch(() => setError(t.errorGeneric));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeMethod = methods.find((m) => m.id === active);

  const onRemoveDots = async () => {
    setError("");
    setBusy(true);
    try {
      const r = await removeDots(text);
      setText(r.text);
      setResult(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onRestore = async () => {
    setError("");
    setBusy(true);
    const sent = text;
    try {
      const r = await restoreDots({
        text: sent,
        method: active,
        model: active === "llm" ? model : undefined,
        apiKey: active === "llm" ? apiKey : undefined,
      });
      setResult({ input: sent, text: r.text, label: activeMethod?.label ?? active });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const restoreDisabled = busy || !text.trim() || (active === "llm" && !apiKey);

  return (
    <div dir={dir} className="min-h-screen bg-paper text-ink">
      <main className="mx-auto max-w-2xl px-5 py-12 sm:py-16">
        <Header theme={theme} onToggleTheme={toggle} />

        <p className="mt-6 max-w-prose text-sm leading-relaxed text-muted">{t.description}</p>

        <div className="mt-8">
          <TextBox value={text} onChange={setText} onRemoveDots={onRemoveDots} busy={busy} />
        </div>

        <Examples onPick={(x) => { setText(x); setResult(null); }} />

        <section className="mt-8">
          <MethodTabs methods={methods} active={active} onSelect={setActive} />
          <div className="mt-4 rounded-2xl border border-line bg-surface p-5">
            {active === "llm" ? (
              <LlmPanel apiKey={apiKey} model={model} onChangeKey={setApiKey} onChangeModel={setModel} />
            ) : (
              <p className="text-xs leading-relaxed text-muted">
                {t.modelNote}{" "}
                <a
                  className="text-accent underline-offset-2 hover:underline"
                  href="https://pypi.org/project/tnqeet/"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t.packageWord}
                </a>
                .
              </p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                onClick={onRestore}
                disabled={restoreDisabled}
                className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />
                {t.restore}
              </button>
              {active === "llm" && !apiKey && (
                <span className="text-xs text-muted">{t.enterKeyFirst}</span>
              )}
            </div>
          </div>
        </section>

        {error && <p className="mt-4 text-sm text-accent">{error}</p>}
        {result && (
          <ResultPanel input={result.input} text={result.text} methodLabel={result.label} />
        )}

        <CompareAll text={text} methods={methods} apiKey={apiKey} model={model} />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <Inner />
    </I18nProvider>
  );
}
