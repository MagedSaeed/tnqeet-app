import { useCallback, useRef, useState } from "react";

const EXIT = "height 0.28s ease, opacity 0.28s ease, margin 0.28s ease, padding 0.28s ease";

// Smoothly collapses an element before the parent unmounts it: fades it out
// while shrinking its height/margins to zero, so content below slides up
// instead of snapping. Attach `ref` and `onTransitionEnd` to the element, use
// `className` for the entrance, and call `dismiss` from the close button.
//
// Honors prefers-reduced-motion by closing immediately.
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
    // Pin the current height, then collapse to zero on the next frame so the
    // browser has a concrete start value to transition from.
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
