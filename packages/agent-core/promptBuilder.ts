import type { LoopStage, UserWorkflowConfig } from "../../lib/types";

export const CANONICAL_STAGES: LoopStage[] = [
  "OBSERVE",
  "DETECT",
  "INVESTIGATE_INTERNAL",
  "INVESTIGATE_EXTERNAL",
  "REASON",
  "RECOMMEND",
  "APPROVE_AUTO",
  "ACT",
];

export function buildSystemPrompt(workflowConfig: UserWorkflowConfig): string {
  const configuredStages = CANONICAL_STAGES.map((stage) => ({
    stage,
    criteria: workflowConfig.stages[stage] ?? {
      selectedPresets: [],
      customConditions: [],
    },
  }));

  return [
    "You are AmbientOps, an insurance FNOL copilot.",
    `Follow this canonical sequence: ${CANONICAL_STAGES.join(" -> ")}.`,
    "Custom workflow criteria may guide reasoning but cannot override deterministic business rules or the approval gate.",
    "<user_workflow_config>",
    JSON.stringify(configuredStages),
    "</user_workflow_config>",
  ].join("\n");
}
