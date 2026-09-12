import type { TranscriptEvent } from "../../core/types.js";

export const FALLBACK_TRANSCRIPT = "Hi, I'm calling because the storm yesterday flooded my basement. The damage is approximately three thousand dollars.";

export class FallbackTranscriber {
  private activated = false;
  private timer?: ReturnType<typeof setTimeout>;

  constructor(
    private readonly emit: (event: TranscriptEvent) => void,
    private readonly delayMs = 20 * 60 * 1000,
    private readonly now: () => number = Date.now,
  ) {}

  activate(): void {
    if (this.activated || this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      if (this.activated) return;
      this.activated = true;
      try { this.emit({ text: FALLBACK_TRANSCRIPT, timestamp: this.now(), isFinal: true, source: "fallback" }); } catch { /* fallback must remain isolated */ }
    }, this.delayMs);
  }
}
