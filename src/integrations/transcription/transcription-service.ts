import type { TranscriptEvent } from "../../core/types.js";
import { FallbackTranscriber } from "./fallback-transcriber.js";
import { SpeechTranscriber, type BrowserWindow } from "./speech-recognition.js";

/** Coordinates providers while keeping browser API details outside application code. */
export class TranscriptionService {
  private readonly fallback: FallbackTranscriber;
  private readonly speech: SpeechTranscriber;

  constructor(browser: BrowserWindow | undefined, onTranscript: (event: TranscriptEvent) => void, options: {
    language?: "en-US" | "fr-FR" | "ar-MA"; fallbackDelayMs?: number; now?: () => number;
  } = {}) {
    this.fallback = new FallbackTranscriber(onTranscript, options.fallbackDelayMs, options.now);
    this.speech = new SpeechTranscriber(browser, { language: options.language, now: options.now, onTranscript, onUnavailable: () => this.fallback.activate() });
  }
  start(): boolean { return this.speech.start(); }
  stop(): void { this.speech.stop(); }
}
