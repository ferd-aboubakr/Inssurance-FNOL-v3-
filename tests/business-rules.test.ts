import { expect, test } from "vitest";
import { evaluateClaim } from "../packages/business-rules/evaluator";

const approvalGate = { highRiskThreshold: 10_000 };

test("Rule 1 rejects damage below the policy deductible", () => {
  const result = evaluateClaim(
    { estimatedDamage: 400, incidentType: "OTHER", isCustomerFacing: false },
    { deductible: 500 },
    {},
    approvalGate,
  );

  expect(result.recommendation.decision).toBe("REJECT");
  expect(result.recommendation.requiresApproval).toBe(true);
  expect(result.recommendation.autoExecute).toBe(false);
  expect(result.findings[0]?.code).toBe("DEDUCTIBLE_CHECK");
});

test("Rule 2 holds an unverified weather claim for review", () => {
  const result = evaluateClaim(
    { estimatedDamage: 2_000, incidentType: "WEATHER", isCustomerFacing: false },
    { deductible: 500 },
    { weatherVerified: false },
    approvalGate,
  );

  expect(result.recommendation.decision).toBe("REVIEW");
  expect(result.recommendation.requiresApproval).toBe(true);
  expect(result.findings[0]?.code).toBe("WEATHER_VERIFICATION");
});

test("Rule 3 holds an auto estimate over the 15% benchmark cap", () => {
  const result = evaluateClaim(
    { estimatedDamage: 12_000, incidentType: "AUTO", isCustomerFacing: false },
    { deductible: 500 },
    { repairBenchmark: 10_000 },
    approvalGate,
  );

  expect(result.recommendation.decision).toBe("REVIEW");
  expect(result.findings[0]?.code).toBe("AUTO_REPAIR_CAP");
});

test("missing external evidence is reviewed instead of throwing", () => {
  const result = evaluateClaim(
    { estimatedDamage: 2_000, incidentType: "WEATHER", isCustomerFacing: false },
    { deductible: 500 },
    {},
    approvalGate,
  );

  expect(result.recommendation.decision).toBe("REVIEW");
  expect(result.recommendation.requiresApproval).toBe(true);
});
