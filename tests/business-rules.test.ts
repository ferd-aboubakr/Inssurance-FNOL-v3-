import assert from "node:assert/strict";
import test from "node:test";
import { evaluateClaim } from "../packages/business-rules/evaluator";

const approvalGate = { highRiskThreshold: 10_000 };

test("Rule 1 rejects damage below the policy deductible", () => {
  const result = evaluateClaim(
    { estimatedDamage: 400, incidentType: "OTHER", isCustomerFacing: false },
    { deductible: 500 },
    {},
    approvalGate,
  );

  assert.equal(result.recommendation.decision, "REJECT");
  assert.equal(result.recommendation.requiresApproval, true);
  assert.equal(result.recommendation.autoExecute, false);
  assert.equal(result.findings[0]?.code, "DEDUCTIBLE_CHECK");
});

test("Rule 2 holds an unverified weather claim for review", () => {
  const result = evaluateClaim(
    { estimatedDamage: 2_000, incidentType: "WEATHER", isCustomerFacing: false },
    { deductible: 500 },
    { weatherVerified: false },
    approvalGate,
  );

  assert.equal(result.recommendation.decision, "REVIEW");
  assert.equal(result.recommendation.requiresApproval, true);
  assert.equal(result.findings[0]?.code, "WEATHER_VERIFICATION");
});

test("Rule 3 holds an auto estimate over the 15% benchmark cap", () => {
  const result = evaluateClaim(
    { estimatedDamage: 1_151, incidentType: "AUTO", isCustomerFacing: false },
    { deductible: 500 },
    { repairBenchmark: 1_000 },
    approvalGate,
  );

  assert.equal(result.recommendation.decision, "REVIEW");
  assert.equal(result.findings[0]?.code, "AUTO_REPAIR_CAP");
});

test("missing external evidence is reviewed instead of throwing", () => {
  const result = evaluateClaim(
    { estimatedDamage: 2_000, incidentType: "WEATHER", isCustomerFacing: false },
    { deductible: 500 },
    {},
    approvalGate,
  );

  assert.equal(result.recommendation.decision, "REVIEW");
  assert.equal(result.recommendation.requiresApproval, true);
});
