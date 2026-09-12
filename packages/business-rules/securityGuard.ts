import type { Claim, Recommendation } from "../../lib/types";

export interface ApprovalGateOptions {
  highRiskThreshold?: number;
}

export function enforceApprovalGate(
  recommendation: Recommendation,
  claim: Claim,
  options: ApprovalGateOptions = {},
): Recommendation {
  const { highRiskThreshold } = options;
  const highFinancialImpact =
    highRiskThreshold === undefined || claim.estimatedDamage > highRiskThreshold;

  if (highFinancialImpact || claim.isCustomerFacing) {
    return {
      ...recommendation,
      requiresApproval: true,
      autoExecute: false,
    };
  }

  return recommendation;
}
