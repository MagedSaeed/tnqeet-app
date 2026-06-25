import { useI18n } from "../i18n";
import { useDismiss } from "../hooks/useDismiss";
import { CloseIcon } from "./icons";

interface Props {
  message: string;
  detail?: string;
  onClose: () => void;
}

// Inline error notice. When the backend supplies an upstream `detail` (e.g. the
// raw provider error), it's tucked into a collapsible disclosure so the panel
// stays compact until the user wants to dig in.
export function ErrorBox({ message, detail, onClose }: Props) {
  const { t } = useI18n();
  const { ref, dismiss, onTransitionEnd, className } = useDismiss(onClose);
  return (
    <div
      ref={ref}
      onTransitionEnd={onTransitionEnd}
      className={`${className} mt-4 rounded-xl border border-accent/30 bg-accent/5 p-4`}
    >
      <div className="flex items-start gap-2 text-sm text-accent">
        <span aria-hidden="true">⚠</span>
        <span className="flex-1">{message}</span>
        <button
          onClick={dismiss}
          aria-label={t.close}
          className="-me-1 shrink-0 rounded p-0.5 text-accent/70 transition hover:text-accent"
        >
          <CloseIcon />
        </button>
      </div>
      {detail && (
        <details className="group mt-2">
          <summary className="flex cursor-pointer select-none items-center gap-1.5 text-xs text-muted transition hover:text-ink [&::-webkit-details-marker]:hidden list-none">
            <span className="font-mono group-open:hidden">{"+"}</span>
            <span className="hidden font-mono group-open:inline">{"–"}</span>
            {t.errorDetails}
          </summary>
          <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-line bg-paper p-3 text-start text-xs leading-relaxed text-muted">
            {detail}
          </pre>
        </details>
      )}
    </div>
  );
}
