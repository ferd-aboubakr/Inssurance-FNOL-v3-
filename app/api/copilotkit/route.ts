import { Agent, tool } from "@openai/agents";
import { CopilotRuntime, OpenAIAdapter, copilotRuntimeNextJSAppRouterEndpoint } from "@copilotkit/runtime";
import { z } from "zod";
import { getPolicyContext, verifyExternalFact } from "@/lib/claims";

// Replace these deterministic tools with authenticated Ambiguous AI and Exa clients in production.
const getPolicyContextTool = tool({
  name: "getPolicyContext",
  description: "Fetch the active policy, coverage, deductible, and payout cap for a claimant.",
  parameters: z.object({ claimantId: z.string().describe("Claimant identifier, if known") }),
  execute: async () => getPolicyContext(),
});

const verifyExternalFactTool = tool({
  name: "verifyExternalFact",
  description: "Verify a weather event or retrieve a standard auto-repair cost benchmark.",
  parameters: z.object({ query: z.string(), claimType: z.enum(["weather", "auto", "general"]), incidentDate: z.string() }),
  execute: async ({ claimType, incidentDate }) => verifyExternalFact(claimType, incidentDate),
});

const insuranceAgent = new Agent({
  name: "InsuranceAgent",
  instructions: "You are AmbientOps, an FNOL insurance triage copilot. Read English, French, and Moroccan Arabic transcripts. Always retrieve policy context. For flood or hail claims, verify weather facts. For auto repairs, verify the repair benchmark. Reject if estimated damage is below deductible. Require manual adjuster review if an auto estimate exceeds the benchmark by more than 15%. Otherwise calculate payout as damage minus deductible, capped by policy maximum. Never update a CRM or approve a payout yourself. Present a structured recommendation and request the human agent use renderSettlementCard before any action.",
  tools: [getPolicyContextTool, verifyExternalFactTool],
});

// Kept initialized for the CopilotKit runtime's tool registry while the live agent binding is added.
void insuranceAgent;

const runtime = new CopilotRuntime();
const serviceAdapter = new OpenAIAdapter({ model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini" });

export const POST = async (request: Request) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({ runtime, serviceAdapter, endpoint: "/api/copilotkit" });
  return handleRequest(request);
};
