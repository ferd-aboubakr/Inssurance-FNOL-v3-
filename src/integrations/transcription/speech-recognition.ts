import type { TranscriptEvent } from "../../core/types.js";

export type RecognitionAlternative = { transcript: string };
export type RecognitionResult = { isFinal: boolean; 0?: RecognitionAlternative };
export type RecognitionResultEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> };
export type RecognitionErrorEvent = { error: string };

export interface BrowserRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

export type BrowserWindow = {
  SpeechRecognition?: new () => BrowserRecognition;
  webkitSpeechRecognition?: new () => BrowserRecognition;
};

export type SpeechTranscriberOptions = {
  language?: "en-US" | "fr-FR" | "ar-MA";
  now?: () => number;
  onTranscript: (event: TranscriptEvent) => void;
  onUnavailable?: () => void;
  onError?: (error: string) => void;
};

/** Browser API boundary. Consumers receive normalized events only. */
export class SpeechTranscriber {
  private recognition?: BrowserRecognition;
  private readonly now: () => number;

  constructor(private readonly browser: BrowserWindow | undefined, private readonly options: SpeechTranscriberOptions) {
    this.now = options.now ?? Date.now;
  }

  start(): boolean {
    const Constructor = this.browser?.SpeechRecognition ?? this.browser?.webkitSpeechRecognition;
    if (!Constructor) {
      this.notifyUnavailable();
      return false;
    }
    try {
      const recognition = new Constructor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = this.options.language ?? "en-US";
      recognition.onresult = (event) => this.handleResult(event);
      recognition.onerror = (event) => {
        this.notifyError(event.error);
        this.notifyUnavailable();
      };
      recognition.onend = () => undefined;
      recognition.start();
      this.recognition = recognition;
      return true;
    } catch (error) {
      this.notifyError(error instanceof Error ? error.message : "speech-start-failed");
      this.notifyUnavailable();
      return false;
    }
  }

  stop(): void { this.recognition?.stop(); }

  private handleResult(event: RecognitionResultEvent): void {
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index];
      const text = result?.[0]?.transcript.trim();
      if (text && result) this.emit({ text, timestamp: this.now(), isFinal: result.isFinal, source: "speech" });
    }
  }

  private emit(event: TranscriptEvent): void {
    try { this.options.onTranscript(event); } catch { /* application callbacks must not break recognition */ }
  }

  private notifyUnavailable(): void {
    try { this.options.onUnavailable?.(); } catch { /* failure isolation */ }
  }

  private notifyError(error: string): void {
    try { this.options.onError?.(error); } catch { /* failure isolation */ }
  }
}
