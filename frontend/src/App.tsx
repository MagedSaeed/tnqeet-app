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
import { ErrorBox } from "./components/ErrorBox";
import { WarningBox } from "./components/WarningBox";
import { getMethods, removeDots, restoreDots, RequestError, type MethodInfo } from "./lib/api";
import { hasDots } from "./lib/arabic";
import { KEYS, loadJSON } from "./lib/storage";
import { btnPrimaryHero } from "./lib/ui";
import { DotsIcon, Spinner } from "./components/icons";
import { EXAMPLES } from "./data/examples";

function Inner() {
  const { t, dir } = useI18n();
  const { theme, toggle } = useTheme();

  const [methods, setMethods] = useState<MethodInfo[]>([]);
  const [active, setActive] = useState("transformer");
  const [text, setText] = useState(EXAMPLES[0].text);
  const [result, setResult] = useState<{ rasm: string; text: string; label: string } | null>(
    null
  );
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<{ message: string; detail?: string } | null>(null);
  // Shown only after Restore is clicked while the text still has dots (i.e. the
  // user skipped "Remove dots"). Dismissible; cleared once dots are removed.
  const [showDotsWarning, setShowDotsWarning] = useState(false);

  const [apiKey, setApiKey] = useState(loadJSON<string>(KEYS.apiKey, ""));
  const [model, setModel] = useState(loadJSON<string>(KEYS.model, ""));

  useEffect(() => {
    // Fetch the method catalog once on mount. `t.errorGeneric` is intentionally
    // NOT a dependency — including it would re-fetch on every language switch.
    getMethods()
      .then((m) => {
        setMethods(m);
        // Prefer the transformer; fall back to the first available method.
        const preferred =
          m.find((x) => x.id === "transformer" && x.available) ?? m.find((x) => x.available);
        if (preferred) setActive(preferred.id);
      })
      .catch(() => setError({ message: t.errorGeneric }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeMethod = methods.find((m) => m.id === active);

  const toError = (e: unknown) => ({
    message: (e as Error).message,
    detail: e instanceof RequestError ? e.detail : undefined,
  });

  const onRemoveDots = async () => {
    setError(null);
    setShowDotsWarning(false);
    setBusy(true);
    try {
      const r = await removeDots(text);
      setText(r.text);
      setResult(null);
    } catch (e) {
      setError(toError(e));
    } finally {
      setBusy(false);
    }
  };

  const onRestore = async () => {
    setError(null);
    if (hasDots(text)) {
      // First click on dotted input: warn and stop. Second click proceeds.
      if (!showDotsWarning) {
        setShowDotsWarning(true);
        return;
      }
    } else {
      setShowDotsWarning(false);
    }
    setBusy(true);
    setRestoring(true);
    const sent = text;
    try {
      const r = await restoreDots({
        text: sent,
        method: active,
        model: active === "llm" ? model : undefined,
        apiKey: active === "llm" ? apiKey : undefined,
      });
      setResult({ rasm: r.rasm, text: r.text, label: activeMethod?.label ?? active });
    } catch (e) {
      setError(toError(e));
    } finally {
      setBusy(false);
      setRestoring(false);
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

          {active === "llm" ? (
            <div className="mt-5 rounded-2xl border border-line bg-surface p-5">
              <LlmPanel apiKey={apiKey} model={model} onChangeKey={setApiKey} onChangeModel={setModel} />
            </div>
          ) : (
            <p className="mx-auto mt-4 max-w-xl text-center text-xs leading-relaxed text-muted/80">
              {t.modelNote}{" "}
              <a
                className="text-muted/80 underline underline-offset-2 hover:text-ink"
                href="https://pypi.org/project/tnqeet/"
                target="_blank"
                rel="noreferrer"
              >
                {t.packageWord}
              </a>
              .
            </p>
          )}

          <div className="mt-6 flex flex-col items-center gap-3">
            {showDotsWarning && (
              <WarningBox message={t.dotsWarning} onClose={() => setShowDotsWarning(false)} />
            )}
            <button onClick={onRestore} disabled={restoreDisabled} className={btnPrimaryHero}>
              {restoring ? <Spinner /> : <DotsIcon />}
              {t.restore}
            </button>
            {active === "llm" && !apiKey && (
              <span className="text-xs text-muted">{t.enterKeyFirst}</span>
            )}
          </div>
        </section>

        {error && (
          <ErrorBox message={error.message} detail={error.detail} onClose={() => setError(null)} />
        )}
        {result && (
          <ResultPanel
            rasm={result.rasm}
            text={result.text}
            methodLabel={result.label}
            onClose={() => setResult(null)}
          />
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
