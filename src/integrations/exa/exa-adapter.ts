import type { ExaEvidence, ExaResult } from "../../core/types.js";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
export type ExaAdapterOptions = { apiKey?: string; fetch?: FetchLike; timeoutMs?: number };

/** Server-side adapter. Safe degradation protects the broader call pipeline. */
export class ExaWeatherAdapter {
  private readonly fetcher: FetchLike;
  private readonly timeoutMs: number;
  constructor(private readonly options: ExaAdapterOptions = {}) {
    this.fetcher = options.fetch ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 5_000;
  }

  async verifyWeather(query: string): Promise<ExaResult> {
    if (!this.options.apiKey || !query.trim()) return { verified: false, evidence: [] };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetcher("https://api.exa.ai/search", {
        method: "POST", signal: controller.signal,
        headers: { "content-type": "application/json", "x-api-key": this.options.apiKey },
        body: JSON.stringify({ query, type: "auto", contents: { highlights: true } }),
      });
      if (!response.ok) return { verified: false, evidence: [] };
      const body: unknown = await response.json();
      const evidence = parseEvidence(body);
      return evidence.length ? { verified: true, evidence } : { verified: false, evidence: [] };
    } catch { return { verified: false, evidence: [] }; }
    finally { clearTimeout(timer); }
  }
}

function parseEvidence(body: unknown): ExaEvidence[] {
  if (!body || typeof body !== "object" || !Array.isArray((body as { results?: unknown }).results)) return [];
  return (body as { results: unknown[] }).results.flatMap((result): ExaEvidence[] => {
    if (!result || typeof result !== "object") return [];
    const value = result as { title?: unknown; url?: unknown; highlights?: unknown; text?: unknown };
    if (typeof value.title !== "string" || !value.title.trim()) return [];
    const firstHighlight = Array.isArray(value.highlights) && typeof value.highlights[0] === "string" ? value.highlights[0] : undefined;
    const snippet = firstHighlight ?? (typeof value.text === "string" ? value.text : undefined);
    return [{ title: value.title, ...(typeof value.url === "string" ? { url: value.url } : {}), ...(snippet ? { snippet } : {}) }];
  });
}
