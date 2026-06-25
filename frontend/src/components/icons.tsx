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
