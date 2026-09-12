export type AmbiguousAssessment = { provider: "ambiguous-mock" | "ambiguous"; summary: string; needsReview: boolean };
export interface AmbiguousAdapter { assessTranscript(transcript: string): Promise<AmbiguousAssessment>; }

/** Deliberately labeled deterministic local substitute; it is not a production API client. */
export class DeterministicAmbiguousMock implements AmbiguousAdapter {
  async assessTranscript(transcript: string): Promise<AmbiguousAssessment> {
    const normalized = transcript.trim();
    return { provider: "ambiguous-mock", summary: normalized ? `Local development assessment: ${normalized}` : "Local development assessment: no transcript provided", needsReview: normalized.length === 0 };
  }
}
