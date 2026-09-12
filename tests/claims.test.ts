import { expect, test } from "vitest";
import { evaluateTranscript, mapExaResultToExternalFact } from "../lib/claims";
import { DemoWorkspacePolicyAdapter } from "../src/integrations/workspace/policy-adapter";

async function sarahPolicy() {
  const result = await new DemoWorkspacePolicyAdapter().getPolicy("Sarah Martin");
  expect(result.found).toBe(true);
  if (!result.found) throw new Error("Expected Sarah Martin policy");
  return result.policy;
}

test("uses Sarah Martin's HOME-48291 policy for flood evaluation", async () => {
  const policy = await sarahPolicy();
  const result = evaluateTranscript("My basement flooded after a storm. Damage is about $3500.", policy, "2026-09-11", {
    externalFact: mapExaResultToExternalFact({ verified: true, evidence: [{ title: "Weather report", snippet: "Heavy rainfall recorded" }] }),
  });
  expect(policy.policyId).toBe("HOME-48291");
  expect(policy.deductible).toBe(500);
  expect(policy.coverageLimit).toBe(10_000);
  expect(result.status).toBe("approve"); expect(result.recommendedPayout).toBe(3000); expect(result.externalFact.verified).toBe(true);
});
test("holds a weather claim for review when Exa evidence is degraded", async () => {
  const result = evaluateTranscript("My basement flooded after a storm. Damage is about $3000.", await sarahPolicy(), "2026-09-11", {
    externalFact: mapExaResultToExternalFact({ verified: false, evidence: [] }),
  });
  expect(result.status).toBe("manual_review");
  expect(result.recommendedPayout).toBe(0);
  expect(result.externalFact.verified).toBe(false);
});
test("rejects losses below Sarah Martin's deductible", async () => {
  const result = evaluateTranscript("Minor water damage, about $300.", await sarahPolicy());
  expect(result.status).toBe("reject"); expect(result.recommendedPayout).toBe(0);
});
test("routes inflated auto estimates to an adjuster", async () => {
  const result = evaluateTranscript("My car accident repair is $4000.", await sarahPolicy());
  expect(result.status).toBe("manual_review");
});
