import { runAgentLoop, type StageRun } from "@/packages/agent-core/loop";
import { createServerPolicyAdapter } from "@/src/server";
import type { AmbiguousAssessment, ExaEvidence, ExaResult, Policy, PolicyLookupResult } from "@/src/core/types";
import type { ClaimEvidence, RulePolicy, UserWorkflowConfig } from "@/lib/types";

export type ClaimType = "weather" | "auto" | "general";
export type RecommendationStatus = "approve" | "reject" | "manual_review";

export interface ExternalFact {
  kind: "weather" | "repair" | "not_required";
  verified: boolean;
  summary: string;
  benchmark?: number;
  evidence?: ExaEvidence[];
}

export interface SettlementRecommendation {
  claimType: ClaimType;
  estimatedDamage: number;
  policy: Policy;
  externalFact: ExternalFact;
  /** Provider-neutral transcript assessment obtained during claim evaluation. */
  ambiguousAssessment?: AmbiguousAssessment;
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
  externalFact?: ExternalFact;
}

/** Legacy CopilotKit tool boundary; resolves the same workspace policy as the API. */
export function getPolicyContext(customerName = "Sarah Martin"): Promise<PolicyLookupResult> {
  return createServerPolicyAdapter().getPolicy(customerName);
}

export function verifyExternalFact(claimType: ClaimType, incidentDate: string): ExternalFact {
  if (claimType === "weather") {
    return {
      kind: "weather",
      verified: false,
      evidence: [],
      summary: `Weather verification is unavailable for the reported incident date: ${incidentDate}.`,
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

/** The only conversion from normalized Exa output into the claim/rules evidence model. */
export function mapExaResultToExternalFact(result: ExaResult): ExternalFact {
  const evidence = result.evidence;
  const verified = result.verified && evidence.length > 0;
  if (!verified) {
    return {
      kind: "weather",
      verified: false,
      evidence: [],
      summary: "Weather evidence is unavailable or could not be verified.",
    };
  }
  const first = evidence[0];
  return {
    kind: "weather",
    verified: true,
    evidence,
    summary: first?.snippet ?? first?.title ?? "Weather event verified by external evidence.",
  };
}

function parseDamage(transcript: string): number {
  const amount = transcript.match(/(?:\$|about\s+|approximately\s+)([\d,]+(?:\.\d{1,2})?)/i)?.[1]
    ?? transcript.match(/([\d,]+)\s*(?:dollars?|usd|mad)/i)?.[1];
  if (amount) return Number(amount.replace(/,/g, ""));
  if (/\bthree\s+thousand(?:\s+dollars?)?\b/i.test(transcript)) return 3000;
  return 3500;
}

export function classifyClaim(transcript: string): ClaimType {
  if (/flood|flooded|hail|storm|rain|weather|inondation|grêle|فيض|مطر/i.test(transcript)) return "weather";
  if (/car|auto|vehicle|collision|accident|repair|voiture|حادث/i.test(transcript)) return "auto";
  return "general";
}

export function evaluateTranscript(
  transcript: string,
  policy: Policy,
  incidentDate = "reported incident date",
  options: EvaluateTranscriptOptions = {},
): SettlementRecommendation {
  const claimType = classifyClaim(transcript);
  const estimatedDamage = parseDamage(transcript);
  const externalFact = options.externalFact ?? verifyExternalFact(claimType, incidentDate);
  const result = runAgentLoop({
    transcript,
    claim: {
      estimatedDamage,
      incidentType: toIncidentType(claimType),
      isCustomerFacing: options.isCustomerFacing ?? true,
    },
    policy: toRulePolicy(policy),
    evidence: toEvidence(claimType, externalFact),
    workflowConfig: options.workflowConfig ?? { stages: {} },
    approvalGateOptions: { highRiskThreshold: options.highRiskThreshold },
  });
  const { recommendation } = result.evaluation;
  const recommendedPayout = recommendation.decision === "PROCEED"
    ? Math.min(estimatedDamage - policy.deductible, policy.coverageLimit)
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

/** Single boundary from the full workspace policy to the rule-engine projection. */
function toRulePolicy(policy: Policy): RulePolicy {
  return { deductible: policy.deductible };
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
