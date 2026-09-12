import { NextResponse } from "next/server";
import { evaluateTranscript, type EvaluateTranscriptOptions } from "@/lib/claims";
import type { LoopStage, StageCriteria, UserWorkflowConfig } from "@/lib/types";

const LOOP_STAGES: LoopStage[] = [
  "OBSERVE",
  "DETECT",
  "INVESTIGATE_INTERNAL",
  "INVESTIGATE_EXTERNAL",
  "REASON",
  "RECOMMEND",
  "APPROVE_AUTO",
  "ACT",
];

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as {
    transcript?: unknown;
    incidentDate?: unknown;
    workflowConfig?: unknown;
  } | null;
  if (!body || typeof body.transcript !== "string" || !body.transcript.trim()) {
    return NextResponse.json({ error: "A transcript is required." }, { status: 400 });
  }

  const options: EvaluateTranscriptOptions = {
    workflowConfig: parseWorkflowConfig(body.workflowConfig),
  };
  return NextResponse.json(evaluateTranscript(
    body.transcript,
    typeof body.incidentDate === "string" ? body.incidentDate : undefined,
    options,
  ));
}

function parseWorkflowConfig(value: unknown): UserWorkflowConfig {
  if (!isRecord(value) || !isRecord(value.stages)) return { stages: {} };

  const stages: Partial<Record<LoopStage, StageCriteria>> = {};
  for (const stage of LOOP_STAGES) {
    const criteria = value.stages[stage];
    if (!isRecord(criteria)) continue;
    stages[stage] = {
      selectedPresets: stringArray(criteria.selectedPresets),
      customConditions: stringArray(criteria.customConditions),
    };
  }
  return { stages };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
