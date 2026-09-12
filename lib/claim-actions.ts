import type { SettlementRecommendation } from "./claims";

export type ClaimAction = "ACCEPT" | "MODIFY" | "REJECT";

export type AuditEvent = {
  timestamp: number;
  claimId: string;
  customerName: string;
  policyId: string;
  action: ClaimAction;
  recommendation: SettlementRecommendation;
  actor: string;
  source: "human";
};

export type SettlementEmailDraft = {
  to: string;
  subject: string;
  body: string;
  status: "draft";
};

type StoredClaim = {
  claimId: string;
  customerName: string;
  recommendation: SettlementRecommendation;
  decision?: ClaimAction;
  auditEvents: AuditEvent[];
  settlementDraft?: SettlementEmailDraft;
};

export type ClaimActionResult =
  | { found: false; error: "claim-not-found" }
  | { found: true; error?: "invalid-modification" | "not-approvable"; claim: StoredClaim; auditEvent?: AuditEvent };

const claims = new Map<string, StoredClaim>();
let nextClaimNumber = 1;

export function storeEvaluatedClaim(customerName: string, recommendation: SettlementRecommendation): StoredClaim {
  const claimId = `fnol-${nextClaimNumber++}`;
  const claim: StoredClaim = { claimId, customerName, recommendation, auditEvents: [] };
  claims.set(claimId, claim);
  return claim;
}

export function applyClaimAction(input: {
  claimId: string;
  action: ClaimAction;
  actor?: string;
  modifiedRecommendedPayout?: number;
}): ClaimActionResult {
  const claim = claims.get(input.claimId);
  if (!claim) return { found: false, error: "claim-not-found" };

  if (input.action === "ACCEPT" && claim.recommendation.status !== "approve") {
    return { found: true, error: "not-approvable", claim };
  }
  if (input.action === "MODIFY") {
    if (typeof input.modifiedRecommendedPayout !== "number" || !Number.isFinite(input.modifiedRecommendedPayout) || input.modifiedRecommendedPayout < 0) {
      return { found: true, error: "invalid-modification", claim };
    }
    claim.recommendation = { ...claim.recommendation, recommendedPayout: input.modifiedRecommendedPayout };
  }

  claim.decision = input.action;
  if (input.action === "ACCEPT") claim.settlementDraft = createSettlementDraft(claim);
  const auditEvent: AuditEvent = {
    timestamp: Date.now(),
    claimId: claim.claimId,
    customerName: claim.customerName,
    policyId: claim.recommendation.policy.policyId,
    action: input.action,
    recommendation: claim.recommendation,
    actor: input.actor?.trim() || "demo-agent",
    source: "human",
  };
  claim.auditEvents.push(auditEvent);
  return { found: true, claim, auditEvent };
}

function createSettlementDraft(claim: StoredClaim): SettlementEmailDraft {
  const { policy, recommendedPayout } = claim.recommendation;
  return {
    to: `${claim.customerName} <customer@example.invalid>`,
    subject: `Settlement draft for claim ${claim.claimId}`,
    body: [
      `Dear ${claim.customerName},`,
      "",
      `We reviewed your claim under policy ${policy.policyId}.`,
      `The approved settlement amount is $${recommendedPayout.toLocaleString("en-US")}.`,
      "This is a draft only and has not been sent.",
    ].join("\n"),
    status: "draft",
  };
}
