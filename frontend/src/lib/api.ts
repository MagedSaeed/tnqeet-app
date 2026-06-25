export interface MethodInfo {
  id: string;
  label: string;
  available: boolean;
  requiresKey: boolean;
}

interface ApiError {
  error: { code: string; message: string };
}

async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const err = (await res.json()) as ApiError;
      message = err.error?.message ?? message;
    } catch {
      /* keep default */
    }
    throw new Error(message);
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
