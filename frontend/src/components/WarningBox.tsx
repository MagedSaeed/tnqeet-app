import { useI18n } from "../i18n";
import { useDismiss } from "../hooks/useDismiss";
import { CloseIcon } from "./icons";

interface Props {
  message: string;
  onClose: () => void;
}

// Gentle, dismissible advisory shown above the Restore action when the input
// still carries dots (i.e. it isn't dotless rasm yet).
export function WarningBox({ message, onClose }: Props) {
  const { t } = useI18n();
  const { ref, dismiss, onTransitionEnd, className } = useDismiss(onClose);
  return (
    <div
      ref={ref}
      onTransitionEnd={onTransitionEnd}
      className={`${className} flex w-full items-start gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-start text-sm text-amber-700 dark:text-amber-300`}
    >
      <span aria-hidden="true">💡</span>
      <span className="flex-1 leading-relaxed">{message}</span>
      <button
        onClick={dismiss}
        aria-label={t.close}
        className="-me-1 shrink-0 rounded p-0.5 text-amber-700/70 transition hover:text-amber-700 dark:text-amber-300/70 dark:hover:text-amber-300"
      >
        <CloseIcon />
      </button>
    </div>
  );
}
