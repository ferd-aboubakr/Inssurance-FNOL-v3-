import { NextResponse } from "next/server";
import { applyClaimAction, type ClaimAction } from "@/lib/claim-actions";

const ACTIONS: ClaimAction[] = ["ACCEPT", "MODIFY", "REJECT"];

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as {
    claimId?: unknown;
    action?: unknown;
    modifiedRecommendedPayout?: unknown;
    actor?: unknown;
  } | null;
  if (!body || typeof body.claimId !== "string" || !body.claimId.trim() || typeof body.action !== "string" || !ACTIONS.includes(body.action as ClaimAction)) {
    return NextResponse.json({ error: "A claim ID and valid action are required." }, { status: 400 });
  }

  const result = applyClaimAction({
    claimId: body.claimId,
    action: body.action as ClaimAction,
    ...(typeof body.actor === "string" ? { actor: body.actor } : {}),
    ...(typeof body.modifiedRecommendedPayout === "number" ? { modifiedRecommendedPayout: body.modifiedRecommendedPayout } : {}),
  });
  if (!result.found) return NextResponse.json({ error: "Claim not found." }, { status: 404 });
  if (result.error === "invalid-modification") return NextResponse.json({ error: "A non-negative modified payout is required." }, { status: 400 });
  if (result.error === "not-approvable") return NextResponse.json({ error: "Only an approved recommendation can be accepted." }, { status: 409 });

  return NextResponse.json({
    claimId: result.claim.claimId,
    decision: result.claim.decision,
    recommendation: result.claim.recommendation,
    auditEvent: result.auditEvent,
    settlementDraft: result.claim.settlementDraft,
  });
}
