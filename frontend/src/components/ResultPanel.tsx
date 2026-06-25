import { useState } from "react";
import { useI18n } from "../i18n";

interface Props {
  text: string;
  methodLabel: string;
}

export function ResultPanel({ text, methodLabel }: Props) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="rounded-b-xl rounded-tr-xl border border-zinc-300 p-4 dark:border-zinc-700">
      <div dir="rtl" className="text-right text-2xl leading-loose">{text}</div>
      <div className="mt-2 flex justify-between text-[0.7rem] opacity-50">
        <span>{methodLabel}</span>
        <button onClick={copy} className="hover:opacity-100">⧉ {copied ? t.copied : t.copy}</button>
      </div>
    </div>
  );
}
