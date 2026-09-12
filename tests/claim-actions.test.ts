import { expect, test } from "vitest";
import { applyClaimAction, storeEvaluatedClaim } from "../lib/claim-actions";
import type { SettlementRecommendation } from "../lib/claims";

function recommendation(): SettlementRecommendation {
  return {
    claimType: "weather",
    estimatedDamage: 3000,
    policy: { policyId: "HOME-48291", customerName: "Sarah Martin", status: "active", coverage: ["Home Water Damage", "Flood"], coverageLimit: 10_000, deductible: 500 },
    externalFact: { kind: "weather", verified: true, summary: "Weather report" },
    recommendedPayout: 2500,
    status: "approve",
    rationale: "Verified claim.",
    incidentDate: "2026-09-11",
    requiresApproval: true,
    autoExecute: false,
    stages: [],
  };
}

test("accept persists an audit event and creates an unsent settlement draft", () => {
  const claim = storeEvaluatedClaim("Sarah Martin", recommendation());
  const result = applyClaimAction({ claimId: claim.claimId, action: "ACCEPT", actor: "adjuster" });

  expect(result.found).toBe(true);
  if (!result.found) return;
  expect(result.claim.decision).toBe("ACCEPT");
  expect(result.auditEvent?.policyId).toBe("HOME-48291");
  expect(result.claim.settlementDraft?.status).toBe("draft");
  expect(result.claim.settlementDraft?.body ?? "").toMatch(/\$2,500/);
});

test("modify persists the human-adjusted recommendation and an audit event", () => {
  const claim = storeEvaluatedClaim("Sarah Martin", recommendation());
  const result = applyClaimAction({ claimId: claim.claimId, action: "MODIFY", modifiedRecommendedPayout: 2_100 });

  expect(result.found).toBe(true);
  if (!result.found) return;
  expect(result.claim.decision).toBe("MODIFY");
  expect(result.claim.recommendation.recommendedPayout).toBe(2_100);
  expect(result.auditEvent?.action).toBe("MODIFY");
});

test("reject persists a rejection audit event without a settlement draft", () => {
  const claim = storeEvaluatedClaim("Sarah Martin", recommendation());
  const result = applyClaimAction({ claimId: claim.claimId, action: "REJECT" });

  expect(result.found).toBe(true);
  if (!result.found) return;
  expect(result.claim.decision).toBe("REJECT");
  expect(result.claim.settlementDraft).toBeUndefined();
  expect(result.auditEvent?.source).toBe("human");
});
