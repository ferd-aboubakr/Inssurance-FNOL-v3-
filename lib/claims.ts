import { runAgentLoop, type StageRun } from "@/packages/agent-core/loop";
import type { ClaimEvidence, UserWorkflowConfig } from "@/lib/types";

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
  requiresApproval: boolean;
  autoExecute: boolean;
  stages: StageRun[];
}

export interface EvaluateTranscriptOptions {
  workflowConfig?: UserWorkflowConfig;
  highRiskThreshold?: number;
  isCustomerFacing?: boolean;
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

export function evaluateTranscript(
  transcript: string,
  incidentDate = "reported incident date",
  options: EvaluateTranscriptOptions = {},
): SettlementRecommendation {
  const policy = getPolicyContext();
  const claimType = classifyClaim(transcript);
  const estimatedDamage = parseDamage(transcript);
  const externalFact = verifyExternalFact(claimType, incidentDate);
  const result = runAgentLoop({
    transcript,
    claim: {
      estimatedDamage,
      incidentType: toIncidentType(claimType),
      isCustomerFacing: options.isCustomerFacing ?? true,
    },
    policy: { deductible: policy.deductible },
    evidence: toEvidence(claimType, externalFact),
    workflowConfig: options.workflowConfig ?? { stages: {} },
    approvalGateOptions: { highRiskThreshold: options.highRiskThreshold },
  });
  const { recommendation } = result.evaluation;
  const recommendedPayout = recommendation.decision === "PROCEED"
    ? Math.min(estimatedDamage - policy.deductible, policy.maxPayout)
    : 0;

  return {
    claimType,
    estimatedDamage,
    policy,
    externalFact,
    recommendedPayout,
    status: toStatus(recommendation.decision),
    rationale: recommendation.reasons[0]
      ?? `Verified claim. $${estimatedDamage.toLocaleString()} damage less $${policy.deductible.toLocaleString()} deductible.`,
    incidentDate,
    requiresApproval: recommendation.requiresApproval,
    autoExecute: recommendation.autoExecute,
    stages: result.stages,
  };
}

function toIncidentType(claimType: ClaimType): "WEATHER" | "AUTO" | "OTHER" {
  if (claimType === "weather") return "WEATHER";
  if (claimType === "auto") return "AUTO";
  return "OTHER";
}

function toEvidence(claimType: ClaimType, externalFact: ExternalFact): ClaimEvidence {
  if (claimType === "weather") return { weatherVerified: externalFact.verified };
  if (claimType === "auto") return { repairBenchmark: externalFact.benchmark };
  return {};
}

function toStatus(decision: "REJECT" | "REVIEW" | "PROCEED"): RecommendationStatus {
  if (decision === "REJECT") return "reject";
  if (decision === "REVIEW") return "manual_review";
  return "approve";
}
