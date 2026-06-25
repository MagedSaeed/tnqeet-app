import { useMemo, useState } from "react";
import { useI18n } from "../i18n";
import { useDismiss } from "../hooks/useDismiss";
import { classifyOutput } from "../lib/diff";
import { DiffText } from "./DiffText";
import { CopyIcon, CheckIcon, CloseIcon, DotsIcon } from "./icons";

interface Props {
  rasm: string;
  text: string;
  methodLabel: string;
  onClose: () => void;
}

export function ResultPanel({ rasm, text, methodLabel, onClose }: Props) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [highlight, setHighlight] = useState(true);
  const { ref, dismiss, onTransitionEnd, className } = useDismiss(onClose);

  // Ignore leading/trailing whitespace the model may add; internal differences
  // are kept and shown.
  const base = rasm.trim();
  const out = text.trim();
  const segments = useMemo(() => classifyOutput(base, out), [base, out]);
  const inLen = [...base].length;
  const outLen = [...out].length;
  const lengthMismatch = inLen !== outLen;
  const hasOther = !!segments?.some((s) => s.kind === "other");

  const copy = async () => {
    await navigator.clipboard.writeText(out);
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setHighlight((h) => !h)}
            aria-label={t.toggleHighlight}
            aria-pressed={highlight}
            title={t.toggleHighlight}
            className={`rounded p-0.5 transition ${
              highlight ? "text-accent" : "text-muted/40 hover:text-muted"
            }`}
          >
            <DotsIcon />
          </button>
          <span className="font-mono text-[0.72rem] uppercase tracking-wider text-muted">
            {methodLabel}
          </span>
        </div>
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
        output={out}
        segments={segments}
        highlight={highlight}
        className="p-5 font-arabic text-[1.05rem] leading-[1.8] text-ink"
      />
      {highlight && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line bg-paper/50 px-5 py-2.5 text-xs text-muted">
          <span>
            {t.charsInput}: {inLen} {t.charsUnit} · {t.charsOutput}: {outLen} {t.charsUnit}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
            {t.legendDots}
          </span>
          {hasOther && (
            <span className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full bg-sky-600 dark:bg-sky-400"
                aria-hidden="true"
              />
              {t.legendOther}
            </span>
          )}
          {lengthMismatch && (
            <span className="leading-relaxed">
              <span aria-hidden="true">ℹ</span> {t.lengthMismatchNote}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
