export interface MethodInfo {
  id: string;
  label: string;
  available: boolean;
  requiresKey: boolean;
}

interface ApiError {
  error: { code: string; message: string; detail?: string };
}

// Error carrying an optional upstream `detail` (e.g. the raw provider error),
// so the UI can surface it in a collapsible box.
export class RequestError extends Error {
  detail?: string;
  status: number;
  constructor(message: string, status: number, detail?: string) {
    super(message);
    this.name = "RequestError";
    this.status = status;
    this.detail = detail;
  }
}

async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let detail: string | undefined;
    try {
      const err = (await res.json()) as ApiError;
      message = err.error?.message ?? message;
      detail = err.error?.detail;
    } catch {
      /* keep default */
    }
    throw new RequestError(message, res.status, detail);
  }
  return (await res.json()) as T;
}

export async function getMethods(): Promise<MethodInfo[]> {
  const res = await fetch("/api/methods");
  if (!res.ok) throw new Error("Failed to load methods");
  return ((await res.json()) as { methods: MethodInfo[] }).methods;
}

export function removeDots(text: string): Promise<{ text: string }> {
  return postJSON("/api/remove-dots", { text });
}

export interface RestoreArgs {
  text: string;
  method: string;
  model?: string;
  apiKey?: string;
}

export function restoreDots(args: RestoreArgs): Promise<{ text: string; method: string }> {
  return postJSON("/api/restore-dots", args);
}
