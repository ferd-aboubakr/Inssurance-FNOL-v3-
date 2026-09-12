import type {
  Claim,
  ClaimEvidence,
  RulePolicy,
  RecommendationDecision,
} from "../../lib/types";

export type RuleCode =
  | "DEDUCTIBLE_CHECK"
  | "WEATHER_VERIFICATION"
  | "AUTO_REPAIR_CAP";

export interface RuleFinding {
  code: RuleCode;
  decision: RecommendationDecision;
  reason: string;
}

export function checkDeductible(
  claim: Claim,
  policy: RulePolicy,
): RuleFinding | undefined {
  if (claim.estimatedDamage < policy.deductible) {
    return {
      code: "DEDUCTIBLE_CHECK",
      decision: "REJECT",
      reason: "Estimated damage is below the policy deductible.",
    };
  }
}

export function checkWeatherVerification(
  claim: Claim,
  evidence: ClaimEvidence,
): RuleFinding | undefined {
  if (claim.incidentType === "WEATHER" && evidence.weatherVerified !== true) {
    return {
      code: "WEATHER_VERIFICATION",
      decision: "REVIEW",
      reason: "Weather claim requires verified external weather evidence.",
    };
  }
}

export function checkAutoRepairCap(
  claim: Claim,
  evidence: ClaimEvidence,
): RuleFinding | undefined {
  if (claim.incidentType !== "AUTO") {
    return;
  }

  if (evidence.repairBenchmark === undefined) {
    return {
      code: "AUTO_REPAIR_CAP",
      decision: "REVIEW",
      reason: "Auto claim requires an external repair benchmark before payout.",
    };
  }

  if (claim.estimatedDamage > evidence.repairBenchmark * 1.15) {
    return {
      code: "AUTO_REPAIR_CAP",
      decision: "REVIEW",
      reason:
        "Estimated damage exceeds the external repair benchmark by more than 15%.",
    };
  }
}
