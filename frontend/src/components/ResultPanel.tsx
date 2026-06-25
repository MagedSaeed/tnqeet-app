import { useState } from "react";
import { useI18n } from "../i18n";
import { DiffText } from "./DiffText";

interface Props {
  input: string;
  text: string;
  methodLabel: string;
}

export function ResultPanel({ input, text, methodLabel }: Props) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

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
        className="font-arabic text-[1.05rem] leading-[1.8] text-ink"
      />
    </div>
  );
}
