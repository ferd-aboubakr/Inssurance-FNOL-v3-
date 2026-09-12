import { NextResponse } from "next/server";
import { storeEvaluatedClaim } from "@/lib/claim-actions";
import { classifyClaim, evaluateTranscript, mapExaResultToExternalFact, type EvaluateTranscriptOptions } from "@/lib/claims";
import type { LoopStage, StageCriteria, UserWorkflowConfig } from "@/lib/types";
import type { AmbiguousAdapter, ExaResult } from "@/src/core/types";
import type { PolicyAdapter } from "@/src/integrations/workspace/policy-adapter";
import { createServerAmbiguousAdapter, createServerPolicyAdapter, createServerWeatherVerifier } from "@/src/server";

const LOOP_STAGES: LoopStage[] = ["OBSERVE", "DETECT", "INVESTIGATE_INTERNAL", "INVESTIGATE_EXTERNAL", "REASON", "RECOMMEND", "APPROVE_AUTO", "ACT"];
const DEFAULT_DEMO_CUSTOMER = "Sarah Martin";
const policyAdapter = createServerPolicyAdapter();
const weatherVerifier = createServerWeatherVerifier();
const ambiguousAdapter = createServerAmbiguousAdapter();

type WeatherVerifier = { verifyWeather(query: string): Promise<ExaResult> };
export type ClaimEvaluationDependencies = {
  policyAdapter?: PolicyAdapter;
  weatherVerifier?: WeatherVerifier;
  ambiguousAdapter?: AmbiguousAdapter;
};

export async function evaluateClaimRequest(request: Request, dependencies: ClaimEvaluationDependencies = {}) {
  const body = await request.json().catch(() => null) as {
    transcript?: unknown;
    customerName?: unknown;
    incidentDate?: unknown;
    workflowConfig?: unknown;
  } | null;
  if (!body || typeof body.transcript !== "string" || !body.transcript.trim()) {
    return NextResponse.json({ error: "A transcript is required." }, { status: 400 });
  }
  const customerName = typeof body.customerName === "string" ? body.customerName.trim() : DEFAULT_DEMO_CUSTOMER;
  if (!customerName) return NextResponse.json({ error: "A customer name is required." }, { status: 400 });

  const policyLookup = await (dependencies.policyAdapter ?? policyAdapter).getPolicy(customerName);
  if (!policyLookup.found) return NextResponse.json({ error: "Policy not found for the supplied customer." }, { status: 404 });

  const claimType = classifyClaim(body.transcript);
  const externalFact = claimType === "weather"
    ? mapExaResultToExternalFact(await (dependencies.weatherVerifier ?? weatherVerifier).verifyWeather(
      `Weather conditions for this FNOL incident on ${typeof body.incidentDate === "string" ? body.incidentDate : "the reported incident date"}: ${body.transcript}`,
    ))
    : undefined;
  const options: EvaluateTranscriptOptions = { workflowConfig: parseWorkflowConfig(body.workflowConfig), externalFact };
  const ambiguousAssessment = await (dependencies.ambiguousAdapter ?? ambiguousAdapter).assessTranscript(body.transcript);
  const recommendation = {
    ...evaluateTranscript(body.transcript, policyLookup.policy, typeof body.incidentDate === "string" ? body.incidentDate : undefined, options),
    ambiguousAssessment,
  };
  const claim = storeEvaluatedClaim(customerName, recommendation);
  return NextResponse.json({ ...recommendation, claimId: claim.claimId });
}

function parseWorkflowConfig(value: unknown): UserWorkflowConfig {
  if (!isRecord(value) || !isRecord(value.stages)) return { stages: {} };
  const stages: Partial<Record<LoopStage, StageCriteria>> = {};
  for (const stage of LOOP_STAGES) {
    const criteria = value.stages[stage];
    if (!isRecord(criteria)) continue;
    stages[stage] = { selectedPresets: stringArray(criteria.selectedPresets), customConditions: stringArray(criteria.customConditions) };
  }
  return { stages };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
