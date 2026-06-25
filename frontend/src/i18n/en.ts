export interface Dict {
  subtitle: string;
  description: string;
  yourText: string;
  removeDots: string;
  restore: string;
  examples: string;
  moreExamples: string;
  copy: string;
  copied: string;
  compareAll: string;
  runAll: string;
  unavailable: string;
  llmKeyLabel: string;
  llmKeyPlaceholder: string;
  llmKeyNote: string;
  inBrowserOnly: string;
  save: string;
  show: string;
  hide: string;
  edit: string;
  delete: string;
  getKey: string;
  modelLabel: string;
  modelPlaceholder: string;
  selected: string;
  enterKeyFirst: string;
  modelNote: string;
  packageWord: string;
  errorGeneric: string;
}

export const en: Dict = {
  subtitle: "Arabic Rasm dot restoration",
  description:
    "Undotted Arabic script (Rasm) is ambiguous — many letters share the same skeleton. tnqeet restores the missing dots. Type your own text or pick an example below, remove its dots, then restore them with any method.",
  yourText: "Your text",
  removeDots: "Remove dots",
  restore: "Restore dots",
  examples: "Examples",
  moreExamples: "More examples",
  copy: "Copy",
  copied: "Copied",
  compareAll: "Compare all methods",
  runAll: "Run all",
  unavailable: "unavailable",
  llmKeyLabel: "OpenRouter API key",
  llmKeyPlaceholder: "sk-or-v1-…",
  llmKeyNote:
    "Stored only in your browser. It is sent nowhere else — only attached to your request so the server can call OpenRouter on your behalf, and never logged or saved server-side.",
  inBrowserOnly: "in browser only",
  save: "Save",
  show: "Show",
  hide: "Hide",
  edit: "Edit",
  delete: "Delete",
  getKey: "Get a key",
  modelLabel: "Model — search OpenRouter",
  modelPlaceholder: "Type to filter models…",
  selected: "Selected",
  enterKeyFirst: "Enter a key first",
  modelNote: "tnqeet has more sizes/variants, omitted here for brevity. See the",
  packageWord: "package",
  errorGeneric: "Something went wrong. Please try again.",
};
