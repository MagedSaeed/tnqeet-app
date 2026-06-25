import { useLayoutEffect, useRef, type ReactNode } from "react";

const DURATION = "height 0.3s ease";

// Smoothly animates height between 0 and auto as `open` toggles.
// Stays mounted; honors prefers-reduced-motion.
export function Collapse({
  open,
  children,
  className = "",
}: {
  open: boolean;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    // First paint (and reduced-motion) just snaps to the right height.
    if (first.current || reduce) {
      first.current = false;
      el.style.height = open ? "auto" : "0px";
      return;
    }

    if (open) {
      el.style.transition = DURATION;
      el.style.height = `${el.scrollHeight}px`;
      const onEnd = (e: TransitionEvent) => {
        if (e.propertyName !== "height") return;
        el.style.height = "auto"; // let content reflow freely once expanded
        el.removeEventListener("transitionend", onEnd);
      };
      el.addEventListener("transitionend", onEnd);
    } else {
      el.style.height = `${el.scrollHeight}px`; // pin current height…
      void el.offsetHeight; // …reflow…
      el.style.transition = DURATION;
      el.style.height = "0px"; // …then collapse.
    }
  }, [open]);

  // height is managed imperatively (not via React) so re-renders don't reset it.
  return (
    <div ref={ref} style={{ overflow: "hidden" }} className={className}>
      {children}
    </div>
  );
}
