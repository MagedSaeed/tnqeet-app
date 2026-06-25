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
      <mark className="rounded bg-accent/25 text-inherit">{text.slice(i, i + q.length)}</mark>
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

  const label = "mb-1.5 block text-[0.7rem] font-medium uppercase tracking-[0.15em] text-muted";
  const field =
    "rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none transition focus:border-accent";

  return (
    <div className="space-y-4">
      {/* API key */}
      <div>
        <span className={label}>{t.llmKeyLabel}</span>
        {editingKey ? (
          <>
            <div className="flex gap-2">
              <input
                type={showKey ? "text" : "password"}
                value={draftKey}
                placeholder={t.llmKeyPlaceholder}
                onChange={(e) => setDraftKey(e.target.value)}
                className={`flex-1 font-mono ${field}`}
              />
              <button
                onClick={() => setShowKey((s) => !s)}
                className="rounded-lg border border-line px-3 text-sm text-muted transition hover:text-ink"
              >
                {showKey ? t.hide : t.show}
              </button>
              <button
                onClick={saveKey}
                disabled={!draftKey}
                className="rounded-lg bg-accent px-4 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40"
              >
                {t.save}
              </button>
            </div>
            <p className="mt-2 flex gap-1.5 text-xs leading-relaxed text-muted">
              <span aria-hidden="true">🔒</span>
              <span>
                {t.llmKeyNote}{" "}
                <a
                  className="text-accent underline-offset-2 hover:underline"
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t.getKey} →
                </a>
              </span>
            </p>
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <code className="font-mono text-muted">{masked}</code>
            <span className="rounded-full border border-accent/40 px-2 py-0.5 text-[0.66rem] text-accent">
              {t.inBrowserOnly}
            </span>
            <span className="flex-1" />
            <button
              onClick={() => {
                setDraftKey(apiKey);
                setEditingKey(true);
              }}
              className="rounded-lg border border-line px-3 py-1 text-sm text-muted transition hover:text-ink"
            >
              {t.edit}
            </button>
            <button
              onClick={deleteKey}
              className="rounded-lg border border-accent/50 px-3 py-1 text-sm text-accent transition hover:bg-accent/10"
            >
              {t.delete}
            </button>
          </div>
        )}
      </div>

      {/* Model search */}
      <div>
        <span className={label}>{t.modelLabel}</span>
        <input
          value={query}
          placeholder={t.modelPlaceholder}
          onChange={(e) => setQuery(e.target.value)}
          className={`w-full ${field} focus:border-accent`}
        />
        {query && (
          <div className="mt-1.5 max-h-44 overflow-auto rounded-lg border border-line">
            {filtered.map((m) => (
              <div
                key={m.id}
                onClick={() => {
                  saveJSON(KEYS.model, m.id);
                  onChangeModel(m.id);
                  setQuery("");
                }}
                className="flex cursor-pointer justify-between gap-3 px-3 py-2 text-sm transition hover:bg-accent/10"
              >
                <span className="font-mono">{highlight(m.id, query)}</span>
                {m.name && m.name !== m.id && (
                  <span className="text-muted">{highlight(m.name, query)}</span>
                )}
              </div>
            ))}
          </div>
        )}
        {model && (
          <div className="mt-2 text-sm text-muted">
            {t.selected}: <code className="font-mono text-ink">{model}</code>
          </div>
        )}
      </div>
    </div>
  );
}
