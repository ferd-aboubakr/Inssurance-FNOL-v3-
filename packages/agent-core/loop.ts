import type {
  Claim,
  ClaimEvidence,
  LoopStage,
  Policy,
  UserWorkflowConfig,
} from "../../lib/types";
import {
  evaluateClaim,
  type EvaluationResult,
} from "../business-rules/evaluator";
import type { ApprovalGateOptions } from "../business-rules/securityGuard";
import { buildSystemPrompt } from "./promptBuilder";

export type StageStatus = "COMPLETED" | "BLOCKED";

export interface StageRun {
  stage: LoopStage;
  status: StageStatus;
  detail: string;
}

export interface AgentLoopInput {
  transcript: string;
  claim: Claim;
  policy: Policy;
  evidence: ClaimEvidence;
  workflowConfig: UserWorkflowConfig;
  approvalGateOptions?: ApprovalGateOptions;
}

export interface AgentLoopResult {
  systemPrompt: string;
  evaluation: EvaluationResult;
  stages: StageRun[];
  status: "AWAITING_APPROVAL" | "READY_TO_ACT";
}

export function runAgentLoop(input: AgentLoopInput): AgentLoopResult {
  const stages: StageRun[] = [
    {
      stage: "OBSERVE",
      status: "COMPLETED",
      detail:
        input.transcript.length > 0
          ? "Transcript received."
          : "No transcript received.",
    },
    {
      stage: "DETECT",
      status: "COMPLETED",
      detail: "FNOL claim facts supplied for deterministic evaluation.",
    },
    {
      stage: "INVESTIGATE_INTERNAL",
      status: "COMPLETED",
      detail: "Policy deductible supplied by the internal adapter.",
    },
    {
      stage: "INVESTIGATE_EXTERNAL",
      status: "COMPLETED",
      detail: "External claim evidence supplied by the external adapter.",
    },
  ];

  const evaluation = evaluateClaim(
    input.claim,
    input.policy,
    input.evidence,
    input.approvalGateOptions,
  );

  stages.push(
    {
      stage: "REASON",
      status: "COMPLETED",
      detail: "Deterministic FNOL rules evaluated.",
    },
    {
      stage: "RECOMMEND",
      status: "COMPLETED",
      detail: `Recommendation: ${evaluation.recommendation.decision}.`,
    },
  );

  if (evaluation.recommendation.requiresApproval) {
    stages.push({
      stage: "APPROVE_AUTO",
      status: "BLOCKED",
      detail: "Human approval is required; no action can be auto-executed.",
    });

    return {
      systemPrompt: buildSystemPrompt(input.workflowConfig),
      evaluation,
      stages,
      status: "AWAITING_APPROVAL",
    };
  }

  stages.push(
    {
      stage: "APPROVE_AUTO",
      status: "COMPLETED",
      detail: "Approval gate passed for low-risk automation.",
    },
    {
      stage: "ACT",
      status: "COMPLETED",
      detail: "Action is ready for the action-executor service.",
    },
  );

  return {
    systemPrompt: buildSystemPrompt(input.workflowConfig),
    evaluation,
    stages,
    status: "READY_TO_ACT",
  };
}
