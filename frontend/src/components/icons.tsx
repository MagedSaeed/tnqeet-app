// Three i'jam dots — the icon for the restore action (adding dots back).
export function DotsIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="6" r="1.5" />
      <circle cx="11" cy="6" r="1.5" />
      <circle cx="8" cy="10.5" r="1.5" />
    </svg>
  );
}

// Dots with a slash — the icon for removing dots (back to the rasm).
export function RemoveDotsIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <circle cx="5" cy="6" r="1.4" fill="currentColor" />
      <circle cx="11" cy="6" r="1.4" fill="currentColor" />
      <circle cx="8" cy="10.5" r="1.4" fill="currentColor" />
      <line
        x1="2.5"
        y1="13.5"
        x2="13.5"
        y2="2.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
