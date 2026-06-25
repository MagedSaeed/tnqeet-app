import { useState } from "react";
import { useI18n } from "../i18n";
import { DiffText, countRestored } from "./DiffText";

interface Props {
  input: string;
  text: string;
  methodLabel: string;
}

export function ResultPanel({ input, text, methodLabel }: Props) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const restored = countRestored(input, text);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="fade-in mt-5 rounded-2xl border border-line bg-surface p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="font-mono text-[0.72rem] uppercase tracking-wider text-muted">
          {methodLabel}
        </span>
        <button onClick={copy} className="text-xs text-muted transition hover:text-ink">
          {copied ? t.copied : t.copy}
        </button>
      </div>
      <DiffText
        input={input}
        output={text}
        className="font-arabic text-3xl leading-[1.9] text-ink"
      />
      {restored > 0 && (
        <div className="mt-3 flex items-center gap-1.5 text-[0.7rem] text-muted">
          <span className="inline-block h-2 w-2 rounded-full bg-accent" />
          {t.restoredLegend}
        </div>
      )}
    </div>
  );
}
