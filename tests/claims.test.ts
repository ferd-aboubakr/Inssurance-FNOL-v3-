import test from "node:test";
import assert from "node:assert/strict";
import { evaluateTranscript } from "../lib/claims";

test("approves verified flood loss less deductible", () => {
  const result = evaluateTranscript("My basement flooded after a storm. Damage is about $3500.", "2026-09-11");
  assert.equal(result.status, "approve"); assert.equal(result.recommendedPayout, 3000); assert.equal(result.externalFact.verified, true);
});
test("rejects losses below deductible", () => {
  const result = evaluateTranscript("Minor water damage, about $300.");
  assert.equal(result.status, "reject"); assert.equal(result.recommendedPayout, 0);
});
test("routes inflated auto estimates to an adjuster", () => {
  const result = evaluateTranscript("My car accident repair is $4000.");
  assert.equal(result.status, "manual_review");
});
