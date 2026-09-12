export type ClaimType = "weather" | "auto" | "general";
export type RecommendationStatus = "approve" | "reject" | "manual_review";

export interface PolicyContext {
  policyId: string;
  coverage: string;
  deductible: number;
  maxPayout: number;
}

export interface ExternalFact {
  kind: "weather" | "repair" | "not_required";
  verified: boolean;
  summary: string;
  benchmark?: number;
}

export interface SettlementRecommendation {
  claimType: ClaimType;
  estimatedDamage: number;
  policy: PolicyContext;
  externalFact: ExternalFact;
  recommendedPayout: number;
  status: RecommendationStatus;
  rationale: string;
  incidentDate: string;
}

export const MOCK_POLICY: PolicyContext = {
  policyId: "POL-123",
  coverage: "Comprehensive",
  deductible: 500,
  maxPayout: 10000,
};

export function getPolicyContext(): PolicyContext {
  return MOCK_POLICY;
}

export function verifyExternalFact(claimType: ClaimType, incidentDate: string): ExternalFact {
  if (claimType === "weather") {
    return {
      kind: "weather",
      verified: true,
      summary: `Weather event verified for ${incidentDate}: severe rainfall recorded in the reported area.`,
    };
  }
  if (claimType === "auto") {
    return {
      kind: "repair",
      verified: true,
      benchmark: 3000,
      summary: "Repair benchmark verified: $3,000 standard market estimate.",
    };
  }
  return { kind: "not_required", verified: true, summary: "No external verification required for this claim type." };
}

function parseDamage(transcript: string): number {
  const amount = transcript.match(/(?:\$|about\s+|approximately\s+)([\d,]+(?:\.\d{1,2})?)/i)?.[1]
    ?? transcript.match(/([\d,]+)\s*(?:dollars?|usd|mad)/i)?.[1];
  return amount ? Number(amount.replace(/,/g, "")) : 3500;
}

export function classifyClaim(transcript: string): ClaimType {
  if (/flood|flooded|hail|storm|rain|weather|inondation|grêle|فيض|مطر/i.test(transcript)) return "weather";
  if (/car|auto|vehicle|collision|accident|repair|voiture|حادث/i.test(transcript)) return "auto";
  return "general";
}

export function evaluateTranscript(transcript: string, incidentDate = "reported incident date"): SettlementRecommendation {
  const policy = getPolicyContext();
  const claimType = classifyClaim(transcript);
  const estimatedDamage = parseDamage(transcript);
  const externalFact = verifyExternalFact(claimType, incidentDate);

  if (estimatedDamage < policy.deductible) {
    return { claimType, estimatedDamage, policy, externalFact, recommendedPayout: 0, status: "reject", incidentDate,
      rationale: `Estimated damage is below the $${policy.deductible.toLocaleString()} deductible; the claim is not payable.` };
  }
  if (claimType === "weather" && !externalFact.verified) {
    return { claimType, estimatedDamage, policy, externalFact, recommendedPayout: 0, status: "manual_review", incidentDate,
      rationale: "Weather-related claim requires a verified external event before settlement." };
  }
  if (claimType === "auto" && externalFact.benchmark && estimatedDamage > externalFact.benchmark * 1.15) {
    return { claimType, estimatedDamage, policy, externalFact, recommendedPayout: 0, status: "manual_review", incidentDate,
      rationale: `Estimate exceeds the $${externalFact.benchmark.toLocaleString()} market benchmark by more than 15%; adjuster review is required.` };
  }
  const recommendedPayout = Math.min(estimatedDamage - policy.deductible, policy.maxPayout);
  return { claimType, estimatedDamage, policy, externalFact, recommendedPayout, status: "approve", incidentDate,
    rationale: `Verified claim. $${estimatedDamage.toLocaleString()} damage less $${policy.deductible.toLocaleString()} deductible.` };
}
