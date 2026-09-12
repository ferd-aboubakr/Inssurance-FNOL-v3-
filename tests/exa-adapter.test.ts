import { describe, expect, it, vi } from "vitest";
import { ExaWeatherAdapter } from "../src/server.js";

const success = () => new Response(JSON.stringify({ results: [{ title: "Local weather report", url: "https://example.test/weather", highlights: ["Heavy storm recorded"] }] }), { status: 200 });

describe("ExaWeatherAdapter", () => {
  it("normalizes a successful Exa response", async () => {
    const result = await new ExaWeatherAdapter({ apiKey: "test", fetch: vi.fn().mockResolvedValue(success()) }).verifyWeather("Casablanca storm yesterday");
    expect(result).toEqual({ verified: true, evidence: [{ title: "Local weather report", url: "https://example.test/weather", snippet: "Heavy storm recorded" }] });
  });
  it("degrades when no API key exists", async () => {
    await expect(new ExaWeatherAdapter({ fetch: vi.fn() }).verifyWeather("storm")).resolves.toEqual({ verified: false, evidence: [] });
  });
  it("degrades on network failures", async () => {
    await expect(new ExaWeatherAdapter({ apiKey: "test", fetch: vi.fn().mockRejectedValue(new Error("offline")) }).verifyWeather("storm")).resolves.toEqual({ verified: false, evidence: [] });
  });
  it("degrades malformed and empty responses without claiming verification", async () => {
    const malformed = new ExaWeatherAdapter({ apiKey: "test", fetch: vi.fn().mockResolvedValue(new Response("{}", { status: 200 })) });
    const empty = new ExaWeatherAdapter({ apiKey: "test", fetch: vi.fn().mockResolvedValue(new Response(JSON.stringify({ results: [] }), { status: 200 })) });
    await expect(malformed.verifyWeather("storm")).resolves.toEqual({ verified: false, evidence: [] });
    await expect(empty.verifyWeather("storm")).resolves.toEqual({ verified: false, evidence: [] });
  });
  it("aborts and degrades after an injected short timeout", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn((_url: string, init?: RequestInit) => new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")))));
    const pending = new ExaWeatherAdapter({ apiKey: "test", fetch: fetcher, timeoutMs: 10 }).verifyWeather("storm");
    await vi.advanceTimersByTimeAsync(10);
    await expect(pending).resolves.toEqual({ verified: false, evidence: [] });
    vi.useRealTimers();
  });
});
