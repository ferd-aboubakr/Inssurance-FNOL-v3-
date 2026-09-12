/**
 * Server composition entry point. Keep this module out of browser bundles: it is
 * the only project module that reads EXA_API_KEY.
 */
import { ExaWeatherAdapter } from "./integrations/exa/exa-adapter.js";

export { ExaWeatherAdapter } from "./integrations/exa/exa-adapter.js";

export function createServerWeatherVerifier(): ExaWeatherAdapter {
  return new ExaWeatherAdapter({ apiKey: process.env.EXA_API_KEY });
}
