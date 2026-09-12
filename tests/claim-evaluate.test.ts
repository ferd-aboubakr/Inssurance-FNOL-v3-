import { expect, test } from "vitest";
import { evaluateClaimRequest } from "../lib/claim-evaluation";
import { DemoWorkspacePolicyAdapter } from "../src/integrations/workspace/policy-adapter";
import { FALLBACK_TRANSCRIPT } from "../src/integrations/transcription/fallback-transcriber";

function request(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/claim-evaluate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("claim evaluation resolves Sarah Martin's workspace policy", async () => {
  let assessedTranscript = "";
  const response = await evaluateClaimRequest(request({
    customerName: "Sarah Martin",
    transcript: "My basement flooded after a storm. Damage is about $3000.",
    incidentDate: "2026-09-11",
  }), {
    policyAdapter: new DemoWorkspacePolicyAdapter(),
    weatherVerifier: { verifyWeather: async () => ({ verified: true, evidence: [{ title: "Weather report", snippet: "Heavy rainfall recorded" }] }) },
    ambiguousAdapter: {
      assessTranscript: async (transcript) => {
        assessedTranscript = transcript;
        return { provider: "ambiguous-mock", summary: "Transcript assessed by the local demo adapter.", needsReview: false };
      },
    },
  });
  const payload = await response.json() as {
    policy: { policyId: string; deductible: number; coverageLimit: number };
    recommendedPayout: number;
    ambiguousAssessment: { provider: string; summary: string; needsReview: boolean };
  };

  expect(response.status).toBe(200);
  expect(payload.policy).toEqual({
    policyId: "HOME-48291",
    customerName: "Sarah Martin",
    status: "active",
    coverage: ["Home Water Damage", "Flood"],
    coverageLimit: 10_000,
    deductible: 500,
  });
  expect(payload.recommendedPayout).toBe(2_500);
  expect(assessedTranscript).toContain("basement flooded");
  expect(payload.ambiguousAssessment).toEqual({
    provider: "ambiguous-mock",
    summary: "Transcript assessed by the local demo adapter.",
    needsReview: false,
  });
});

test("claim evaluation returns a controlled not-found response for an unknown customer", async () => {
  const response = await evaluateClaimRequest(request({ customerName: "Unknown Customer", transcript: "My basement flooded." }), {
    policyAdapter: new DemoWorkspacePolicyAdapter(),
  });
  const payload = await response.json() as { error: string };
  expect(response.status).toBe(404);
  expect(payload.error).toBe("Policy not found for the supplied customer.");
});

test("claim evaluation continues with a manual-review recommendation when Exa is unavailable", async () => {
  const response = await evaluateClaimRequest(request({
    customerName: "Sarah Martin",
    transcript: "My basement flooded after a storm. Damage is about $3000.",
  }), {
    policyAdapter: new DemoWorkspacePolicyAdapter(),
    weatherVerifier: { verifyWeather: async () => ({ verified: false, evidence: [] }) },
  });
  const payload = await response.json() as { status: string; externalFact: { verified: boolean }; recommendedPayout: number };

  expect(response.status).toBe(200);
  expect(payload.status).toBe("manual_review");
  expect(payload.externalFact.verified).toBe(false);
  expect(payload.recommendedPayout).toBe(0);
});

test("the fallback FNOL transcript remains a $3,000 weather claim through assessment", async () => {
  const response = await evaluateClaimRequest(request({ customerName: "Sarah Martin", transcript: FALLBACK_TRANSCRIPT }), {
    policyAdapter: new DemoWorkspacePolicyAdapter(),
    weatherVerifier: { verifyWeather: async () => ({ verified: true, evidence: [{ title: "Weather report" }] }) },
    ambiguousAdapter: { assessTranscript: async (transcript) => ({ provider: "ambiguous-mock", summary: `Assessed: ${transcript}`, needsReview: false }) },
  });
  const payload = await response.json() as {
    claimType: string;
    estimatedDamage: number;
    recommendedPayout: number;
    ambiguousAssessment: { summary: string };
  };

  expect(response.status).toBe(200);
  expect(payload.claimType).toBe("weather");
  expect(payload.estimatedDamage).toBe(3_000);
  expect(payload.recommendedPayout).toBe(2_500);
  expect(payload.ambiguousAssessment.summary).toContain("storm yesterday flooded my basement");
});
