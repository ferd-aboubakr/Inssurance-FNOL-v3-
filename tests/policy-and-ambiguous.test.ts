import { describe, expect, it } from "vitest";
import { DemoWorkspacePolicyAdapter, DeterministicAmbiguousMock } from "../src/index.js";

describe("workspace policy adapter", () => {
  it("retrieves Sarah Martin's policy", async () => {
    const result = await new DemoWorkspacePolicyAdapter().getPolicy("Sarah Martin");
    expect(result).toMatchObject({ found: true, policy: { policyId: "HOME-48291", deductible: 500, status: "active" } });
  });
  it("returns a non-throwing not-found result", async () => {
    await expect(new DemoWorkspacePolicyAdapter().getPolicy("Unknown Person")).resolves.toEqual({ found: false, policy: null });
  });
});

describe("Ambiguous adapter", () => {
  it("clearly labels its deterministic local implementation", async () => {
    await expect(new DeterministicAmbiguousMock().assessTranscript("A storm claim")).resolves.toMatchObject({ provider: "ambiguous-mock", needsReview: false });
  });
});
