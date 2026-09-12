/**
 * Server composition entry point. Keep this module out of browser bundles: it is
 * the only project module that reads EXA_API_KEY.
 */
import { ExaWeatherAdapter } from "./integrations/exa/exa-adapter";
import { DeterministicAmbiguousMock, type AmbiguousAdapter } from "./integrations/ambiguous/ambiguous-adapter";
import { DemoWorkspacePolicyAdapter, type PolicyAdapter } from "./integrations/workspace/policy-adapter";

export { ExaWeatherAdapter } from "./integrations/exa/exa-adapter";

export function createServerWeatherVerifier(): ExaWeatherAdapter {
  return new ExaWeatherAdapter({ apiKey: process.env.EXA_API_KEY });
}

export function createServerPolicyAdapter(): PolicyAdapter {
  return new DemoWorkspacePolicyAdapter();
}

/** Composition point for a future configured provider; local demos use the labeled deterministic mock. */
export function createServerAmbiguousAdapter(): AmbiguousAdapter {
  return new DeterministicAmbiguousMock();
}
