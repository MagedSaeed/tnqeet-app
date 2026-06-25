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
  const [result, setResult] = useState<{ text: string; label: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [apiKey, setApiKey] = useState(loadJSON<string>(KEYS.apiKey, ""));
  const [model, setModel] = useState(loadJSON<string>(KEYS.model, ""));

  useEffect(() => {
    getMethods().then((m) => {
      setMethods(m);
      const firstAvailable = m.find((x) => x.available);
      if (firstAvailable) setActive(firstAvailable.id);
    }).catch(() => setError(t.errorGeneric));
  }, [t.errorGeneric]);

  const activeMethod = methods.find((m) => m.id === active);

  const onRemoveDots = async () => {
    setError(""); setBusy(true);
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
    setError(""); setBusy(true);
    try {
      const r = await restoreDots({
        text,
        method: active,
        model: active === "llm" ? model : undefined,
        apiKey: active === "llm" ? apiKey : undefined,
      });
      setResult({ text: r.text, label: activeMethod?.label ?? active });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const restoreDisabled = busy || !text.trim() || (active === "llm" && !apiKey);

  return (
    <div dir={dir} className="min-h-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <main className="mx-auto max-w-2xl px-5 py-8">
        <Header theme={theme} onToggleTheme={toggle} />
        <p className="my-4 text-sm leading-relaxed opacity-70">{t.description}</p>

        <TextBox value={text} onChange={setText} onRemoveDots={onRemoveDots} busy={busy} />
        <Examples onPick={(x) => { setText(x); setResult(null); }} />

        <MethodTabs methods={methods} active={active} onSelect={setActive} />

        {active === "llm" ? (
          <LlmPanel apiKey={apiKey} model={model} onChangeKey={setApiKey} onChangeModel={setModel} />
        ) : (
          <div className="rounded-b-xl rounded-tr-xl border border-zinc-300 p-4 dark:border-zinc-700">
            <button
              onClick={onRestore}
              disabled={restoreDisabled}
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              ✦ {t.restore}
            </button>
            <p className="mt-3 text-xs opacity-55">
              {t.modelNote}{" "}
              <a className="underline" href="https://pypi.org/project/tnqeet/" target="_blank" rel="noreferrer">{t.packageWord}</a>.
            </p>
          </div>
        )}

        {active === "llm" && (
          <button
            onClick={onRestore}
            disabled={restoreDisabled}
            className="mt-3 rounded-lg bg-indigo-500 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            ✦ {t.restore}
          </button>
        )}

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        {result && <div className="mt-3"><ResultPanel text={result.text} methodLabel={result.label} /></div>}

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
