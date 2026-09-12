export type TranscriptEvent = {
  text: string;
  timestamp: number;
  isFinal: boolean;
  source: "speech" | "fallback";
};

export type Policy = {
  policyId: string;
  customerName: string;
  status: "active" | "inactive";
  coverage: string[];
  coverageLimit: number;
  deductible: number;
};

export type PolicyLookupResult =
  | { found: true; policy: Policy }
  | { found: false; policy: null };

export type ExaEvidence = { title: string; url?: string; snippet?: string };
export type ExaResult = { verified: boolean; evidence: ExaEvidence[] };
