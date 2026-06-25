import { useCallback, useRef, useState } from "react";

const EXIT = "height 0.28s ease, opacity 0.28s ease, margin 0.28s ease, padding 0.28s ease";

// Collapses height/opacity to zero before unmount, so content below slides up
// instead of snapping. Attach `ref`/`onTransitionEnd`, call `dismiss` to close.
// Honors prefers-reduced-motion.
export function useDismiss(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const [closing, setClosing] = useState(false);

  const dismiss = useCallback(() => {
    const el = ref.current;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !el) {
      onClose();
      return;
    }
    // Pin height, reflow, then collapse so the transition has a start value.
    el.style.height = `${el.scrollHeight}px`;
    el.style.overflow = "hidden";
    void el.offsetHeight; // force reflow
    el.style.transition = EXIT;
    el.style.height = "0px";
    el.style.opacity = "0";
    el.style.marginTop = "0px";
    el.style.marginBottom = "0px";
    el.style.paddingTop = "0px";
    el.style.paddingBottom = "0px";
    setClosing(true);
  }, [onClose]);

  const onTransitionEnd = useCallback(
    (e: React.TransitionEvent) => {
      if (closing && e.target === e.currentTarget && e.propertyName === "height") onClose();
    },
    [closing, onClose]
  );

  return { ref, dismiss, onTransitionEnd, className: closing ? "" : "fade-in" };
}
