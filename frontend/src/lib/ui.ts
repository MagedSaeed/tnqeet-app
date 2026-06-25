// Shared button class strings so every button feels consistent.

// Solid accent action (Restore, Save, Run all). Shadow + hover-darken + press
// give it depth so it reads as a deliberate control on either background.
export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 " +
  "text-sm font-semibold text-white shadow-sm ring-1 ring-black/5 transition " +
  "hover:-translate-y-px hover:brightness-95 hover:shadow-md active:translate-y-0 active:brightness-90 " +
  "disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:brightness-100";

// Quiet bordered action (Remove dots, Show, Edit). Clear accent-tinted hover.
export const btnGhost =
  "inline-flex items-center gap-2 rounded-full border border-line px-3.5 py-1.5 " +
  "text-xs font-medium text-muted transition " +
  "hover:border-accent/60 hover:bg-accent/10 hover:text-ink " +
  "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:bg-transparent disabled:hover:text-muted";

// Destructive bordered action (Delete).
export const btnDanger =
  "inline-flex items-center gap-2 rounded-full border border-accent/50 px-3.5 py-1.5 " +
  "text-xs font-medium text-accent transition hover:bg-accent/10";
