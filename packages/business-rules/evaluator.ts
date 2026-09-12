import type {
  Claim,
  ClaimEvidence,
  RulePolicy,
  Recommendation,
  RecommendationDecision,
} from "../../lib/types";
import {
  checkAutoRepairCap,
  checkDeductible,
  checkWeatherVerification,
  type RuleFinding,
} from "./rules";
import {
  enforceApprovalGate,
  type ApprovalGateOptions,
} from "./securityGuard";

export interface EvaluationResult {
  findings: RuleFinding[];
  recommendation: Recommendation;
}

export function evaluateClaim(
  claim: Claim,
  policy: RulePolicy,
  evidence: ClaimEvidence,
  approvalGateOptions: ApprovalGateOptions = {},
): EvaluationResult {
  const findings = [
    checkDeductible(claim, policy),
    checkWeatherVerification(claim, evidence),
    checkAutoRepairCap(claim, evidence),
  ].filter((finding): finding is RuleFinding => finding !== undefined);

  const decision = selectDecision(findings);
  const candidate: Recommendation = {
    decision,
    reasons: findings.map((finding) => finding.reason),
    requiresApproval: decision !== "PROCEED",
    autoExecute: decision === "PROCEED",
  };

  return {
    findings,
    recommendation: enforceApprovalGate(candidate, claim, approvalGateOptions),
  };
}

function selectDecision(findings: RuleFinding[]): RecommendationDecision {
  if (findings.some((finding) => finding.decision === "REJECT")) {
    return "REJECT";
  }

  if (findings.some((finding) => finding.decision === "REVIEW")) {
    return "REVIEW";
  }

  return "PROCEED";
}
