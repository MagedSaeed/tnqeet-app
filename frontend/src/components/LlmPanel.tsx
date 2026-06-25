import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../i18n";
import { KEYS, saveJSON } from "../lib/storage";
import { fetchModels, filterModels, type ORModel } from "../lib/openrouter";

interface Props {
  apiKey: string;
  model: string;
  onChangeKey: (k: string) => void;
  onChangeModel: (m: string) => void;
}

// Highlight the matched portion of `text` for the given query.
function highlight(text: string, query: string) {
  const q = query.trim();
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded bg-indigo-400/40 text-inherit">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

export function LlmPanel({ apiKey, model, onChangeKey, onChangeModel }: Props) {
  const { t } = useI18n();
  const [editingKey, setEditingKey] = useState(!apiKey);
  const [draftKey, setDraftKey] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
  const [models, setModels] = useState<ORModel[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchModels().then(setModels).catch(() => setModels([]));
  }, []);

  const filtered = useMemo(() => filterModels(models, query), [models, query]);

  const saveKey = () => {
    saveJSON(KEYS.apiKey, draftKey);
    onChangeKey(draftKey);
    setEditingKey(false);
  };
  const deleteKey = () => {
    saveJSON(KEYS.apiKey, "");
    onChangeKey("");
    setDraftKey("");
    setEditingKey(true);
  };
  const masked = apiKey ? `${apiKey.slice(0, 6)}…${apiKey.slice(-4)}` : "";

  return (
    <div className="rounded-b-xl rounded-tr-xl border border-zinc-300 p-4 dark:border-zinc-700">
      {/* API key */}
      <div className="mb-3">
        <div className="mb-1 text-xs uppercase tracking-wide opacity-55">{t.llmKeyLabel}</div>
        {editingKey ? (
          <>
            <div className="flex gap-2">
              <input
                type={showKey ? "text" : "password"}
                value={draftKey}
                placeholder={t.llmKeyPlaceholder}
                onChange={(e) => setDraftKey(e.target.value)}
                className="flex-1 rounded-lg border border-zinc-300 bg-transparent px-3 py-2 font-mono text-sm dark:border-zinc-700"
              />
              <button onClick={() => setShowKey((s) => !s)} className="rounded-lg border border-zinc-300 px-3 text-sm dark:border-zinc-700">
                {showKey ? t.hide : t.show}
              </button>
              <button onClick={saveKey} disabled={!draftKey} className="rounded-lg bg-indigo-500 px-3 text-sm text-white disabled:opacity-50">
                {t.save}
              </button>
            </div>
            <p className="mt-1.5 flex gap-1.5 text-xs opacity-60">
              🔒 <span>{t.llmKeyNote}{" "}
                <a className="underline" href="https://openrouter.ai/keys" target="_blank" rel="noreferrer">{t.getKey} →</a>
              </span>
            </p>
          </>
        ) : (
          <div className="flex items-center gap-2 text-sm">
            <span>🔑 <code className="font-mono">{masked}</code></span>
            <span className="rounded border border-emerald-500 px-1.5 text-[0.68rem] text-emerald-500">{t.inBrowserOnly}</span>
            <span className="flex-1" />
            <button onClick={() => { setDraftKey(apiKey); setEditingKey(true); }} className="rounded-lg border border-zinc-300 px-2.5 py-1 text-sm dark:border-zinc-700">✎ {t.edit}</button>
            <button onClick={deleteKey} className="rounded-lg border border-red-400 px-2.5 py-1 text-sm text-red-500">🗑 {t.delete}</button>
          </div>
        )}
      </div>

      {/* Model search */}
      <div>
        <div className="mb-1 text-xs uppercase tracking-wide opacity-55">{t.modelLabel}</div>
        <input
          value={query}
          placeholder={t.modelPlaceholder}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-lg border border-indigo-500 bg-transparent px-3 py-2 text-sm"
        />
        {query && (
          <div className="mt-1.5 max-h-44 overflow-auto rounded-lg border border-zinc-300 dark:border-zinc-700">
            {filtered.map((m) => (
              <div
                key={m.id}
                onClick={() => { saveJSON(KEYS.model, m.id); onChangeModel(m.id); setQuery(""); }}
                className="flex cursor-pointer justify-between gap-3 px-3 py-2 text-sm hover:bg-indigo-500/10"
              >
                <span className="font-mono opacity-85">{highlight(m.id, query)}</span>
                {m.name && m.name !== m.id && <span className="opacity-50">{highlight(m.name, query)}</span>}
              </div>
            ))}
          </div>
        )}
        {model && (
          <div className="mt-2 text-sm">{t.selected}: <code className="font-mono">{model}</code></div>
        )}
      </div>
    </div>
  );
}
