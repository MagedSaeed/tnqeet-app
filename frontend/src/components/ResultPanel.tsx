import { useState } from "react";
import { useI18n } from "../i18n";
import { useDismiss } from "../hooks/useDismiss";
import { DiffText } from "./DiffText";
import { CopyIcon, CheckIcon, CloseIcon } from "./icons";

interface Props {
  input: string;
  text: string;
  methodLabel: string;
  onClose: () => void;
}

export function ResultPanel({ input, text, methodLabel, onClose }: Props) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const { ref, dismiss, onTransitionEnd, className } = useDismiss(onClose);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div
      ref={ref}
      onTransitionEnd={onTransitionEnd}
      className={`${className} mt-5 overflow-hidden rounded-2xl border border-line bg-surface`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-line bg-paper/50 px-5 py-2.5">
        <span className="font-mono text-[0.72rem] uppercase tracking-wider text-muted">
          {methodLabel}
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={copy}
            className={`inline-flex items-center gap-1.5 text-xs transition ${
              copied ? "text-emerald-500" : "text-muted hover:text-ink"
            }`}
          >
            {copied ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
            {copied ? t.copied : t.copy}
          </button>
          <button
            onClick={dismiss}
            aria-label={t.close}
            className="rounded p-0.5 text-muted transition hover:text-ink"
          >
            <CloseIcon />
          </button>
        </div>
      </div>
      <DiffText
        input={input}
        output={text}
        className="p-5 font-arabic text-[1.05rem] leading-[1.8] text-ink"
      />
    </div>
  );
}
