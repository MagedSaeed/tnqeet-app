// Shared button class strings so every button feels consistent.

// Solid accent action. A top inner highlight + drop shadow give subtle depth;
// hover lifts with an accent-colored glow, press settles back. Focus-visible
// ring for keyboard users.
const primaryBase =
  "inline-flex items-center justify-center gap-2 rounded-full bg-accent font-semibold text-accent-contrast transition " +
  "shadow-[0_1px_2px_rgb(0_0_0/0.18),inset_0_1px_0_rgb(255_255_255/0.18)] " +
  "hover:-translate-y-px hover:brightness-105 hover:shadow-[0_8px_20px_-6px_rgb(var(--accent)/0.6)] " +
  "active:translate-y-0 active:brightness-95 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper " +
  "disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:brightness-100 disabled:hover:shadow-none";

// Standard primary (Save, Run all).
export const btnPrimary = `${primaryBase} px-5 py-2.5 text-sm`;

// Hero primary (the main Restore action) — a touch larger.
export const btnPrimaryHero = `${primaryBase} px-6 py-3 text-base`;

// Solid neutral action (Remove dots) — clearly a button (ink text, surface fill,
// shadow), but neutral so it doesn't compete with the accent primary.
export const btnSecondary =
  "inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-4 py-1.5 " +
  "text-xs font-semibold text-ink shadow-sm transition " +
  "hover:border-accent/60 hover:bg-accent/10 hover:text-accent active:translate-y-px " +
  "disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:border-line disabled:hover:bg-surface disabled:hover:text-ink";

// Quiet bordered action (Show, Edit). Clear accent-tinted hover.
export const btnGhost =
  "inline-flex items-center gap-2 rounded-full border border-line px-3.5 py-1.5 " +
  "text-xs font-medium text-muted transition " +
  "hover:border-accent/60 hover:bg-accent/10 hover:text-ink " +
  "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:bg-transparent disabled:hover:text-muted";

// Destructive bordered action (Delete).
export const btnDanger =
  "inline-flex items-center gap-2 rounded-full border border-accent/50 px-3.5 py-1.5 " +
  "text-xs font-medium text-accent transition hover:bg-accent/10";
