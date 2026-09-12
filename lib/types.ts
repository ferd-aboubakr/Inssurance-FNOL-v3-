/**
 * Integration contract v1.
 * MOCK - Ambiguous AI and Exa API schemas were not supplied.
 * Keep this contract stable across adapters and UI.
 */
export interface Claim {
  estimatedDamage: number;
  incidentType: "WEATHER" | "AUTO" | "OTHER";
  isCustomerFacing: boolean;
}

/** Projection of the workspace policy required by deterministic rules. */
export interface RulePolicy {
  deductible: number;
}

/** MOCK - only the fields required by the deterministic rules. */
export interface ClaimEvidence {
  weatherVerified?: boolean;
  repairBenchmark?: number;
}

export type RecommendationDecision = "REJECT" | "REVIEW" | "PROCEED";

export interface Recommendation {
  decision: RecommendationDecision;
  reasons: string[];
  requiresApproval: boolean;
  autoExecute: boolean;
}

export type LoopStage =
  | "OBSERVE"
  | "DETECT"
  | "INVESTIGATE_INTERNAL"
  | "INVESTIGATE_EXTERNAL"
  | "REASON"
  | "RECOMMEND"
  | "APPROVE_AUTO"
  | "ACT";

export interface StageCriteria {
  selectedPresets: string[];
  customConditions: string[];
}

export interface UserWorkflowConfig {
  stages: Partial<Record<LoopStage, StageCriteria>>;
}
