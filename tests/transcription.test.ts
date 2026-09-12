import { describe, expect, it, vi } from "vitest";
import { FALLBACK_TRANSCRIPT, FallbackTranscriber, SpeechTranscriber } from "../src/index.js";
import type { BrowserRecognition, RecognitionErrorEvent, RecognitionResultEvent } from "../src/index.js";

class FakeRecognition implements BrowserRecognition {
  continuous = false; interimResults = false; lang = "";
  onresult: ((event: RecognitionResultEvent) => void) | null = null;
  onerror: ((event: RecognitionErrorEvent) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn(); stop = vi.fn();
}

describe("SpeechTranscriber", () => {
  it("initializes continuous, interim recognition with configured language", () => {
    let recognition: FakeRecognition | undefined;
    const events: unknown[] = [];
    class Factory extends FakeRecognition { constructor() { super(); recognition = this; } }
    const transcriber = new SpeechTranscriber({ SpeechRecognition: Factory }, { language: "fr-FR", onTranscript: (event) => events.push(event) });
    expect(transcriber.start()).toBe(true);
    expect(recognition).toMatchObject({ continuous: true, interimResults: true, lang: "fr-FR" });
    expect(recognition?.start).toHaveBeenCalledOnce(); expect(events).toEqual([]);
  });

  it("normalizes final and interim results", () => {
    let recognition: FakeRecognition | undefined;
    class Factory extends FakeRecognition { constructor() { super(); recognition = this; } }
    const events: unknown[] = [];
    const transcriber = new SpeechTranscriber({ webkitSpeechRecognition: Factory }, { now: () => 42, onTranscript: (event) => events.push(event) });
    transcriber.start();
    recognition?.onresult?.({ resultIndex: 0, results: [{ isFinal: false, 0: { transcript: "  storm  " } }, { isFinal: true, 0: { transcript: " flooded basement " } }] });
    expect(events).toEqual([
      { text: "storm", timestamp: 42, isFinal: false, source: "speech" },
      { text: "flooded basement", timestamp: 42, isFinal: true, source: "speech" },
    ]);
  });

  it("handles unsupported browsers and recognition errors without throwing", () => {
    const unavailable = vi.fn();
    expect(new SpeechTranscriber(undefined, { onTranscript: vi.fn(), onUnavailable: unavailable }).start()).toBe(false);
    expect(unavailable).toHaveBeenCalledOnce();
    let recognition: FakeRecognition | undefined;
    class Factory extends FakeRecognition { constructor() { super(); recognition = this; } }
    const error = vi.fn();
    new SpeechTranscriber({ SpeechRecognition: Factory }, { onTranscript: vi.fn(), onUnavailable: unavailable, onError: error }).start();
    recognition?.onerror?.({ error: "not-allowed" });
    expect(error).toHaveBeenCalledWith("not-allowed"); expect(unavailable).toHaveBeenCalledTimes(2);
  });

  it("isolates application callback failures from browser events", () => {
    let recognition: FakeRecognition | undefined;
    class Factory extends FakeRecognition { constructor() { super(); recognition = this; } }
    const transcriber = new SpeechTranscriber({ SpeechRecognition: Factory }, { onTranscript: () => { throw new Error("consumer failure"); } });
    transcriber.start();
    expect(() => recognition?.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: "storm" } }] })).not.toThrow();
  });
});

describe("FallbackTranscriber", () => {
  it("emits one normal fallback event after its injected delay", () => {
    vi.useFakeTimers();
    const emit = vi.fn(); const fallback = new FallbackTranscriber(emit, 10, () => 99);
    fallback.activate(); fallback.activate();
    vi.advanceTimersByTime(9); expect(emit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1); fallback.activate(); vi.runAllTimers();
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith({ text: FALLBACK_TRANSCRIPT, timestamp: 99, isFinal: true, source: "fallback" });
    vi.useRealTimers();
  });
});
