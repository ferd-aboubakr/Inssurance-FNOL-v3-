import type { Policy, PolicyLookupResult } from "../../core/types.js";

export interface PolicyAdapter { getPolicy(customerName: string): Promise<PolicyLookupResult>; }

const DEMO_POLICIES: Policy[] = [{
  policyId: "HOME-48291", customerName: "Sarah Martin", status: "active",
  coverage: ["Home Water Damage", "Flood"], coverageLimit: 10_000, deductible: 500,
}];

/** Replaceable in-memory workspace boundary for the hackathon demo. */
export class DemoWorkspacePolicyAdapter implements PolicyAdapter {
  constructor(private readonly policies: Policy[] = DEMO_POLICIES) {}
  async getPolicy(customerName: string): Promise<PolicyLookupResult> {
    const normalized = customerName.trim().toLocaleLowerCase();
    const policy = this.policies.find((item) => item.customerName.toLocaleLowerCase() === normalized);
    return policy ? { found: true, policy: { ...policy, coverage: [...policy.coverage] } } : { found: false, policy: null };
  }
}
