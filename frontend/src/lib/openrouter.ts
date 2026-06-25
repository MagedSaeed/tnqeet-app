export interface ORModel {
  id: string;
  name: string;
}

const MAX_RESULTS = 50;

export function filterModels(models: ORModel[], query: string): ORModel[] {
  const q = query.trim().toLowerCase();
  const matches = q
    ? models.filter(
        (m) => m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)
      )
    : models;
  return matches.slice(0, MAX_RESULTS);
}

export async function fetchModels(): Promise<ORModel[]> {
  const res = await fetch("https://openrouter.ai/api/v1/models");
  if (!res.ok) throw new Error(`OpenRouter models fetch failed: ${res.status}`);
  const json = (await res.json()) as { data: Array<{ id: string; name?: string }> };
  return json.data.map((m) => ({ id: m.id, name: m.name ?? m.id }));
}
