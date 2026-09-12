"use client";

import { useCopilotAction, useCopilotReadable } from "@copilotkit/react-core";
import type { SettlementRecommendation } from "@/lib/claims";

/**
 * Attach this hook within a CopilotKit provider after an authenticated v2 agent
 * endpoint is registered. Kept separate so the credential-free dashboard demo
 * never attempts a live agent call.
 */
export function useAmbientOpsCopilotContract(transcript: string) {
  useCopilotReadable({ description: "Live multilingual FNOL transcript.", value: transcript });
  useCopilotAction({
    name: "renderSettlementCard",
    description: "Render a human-review settlement card.",
    available: "frontend",
    parameters: [{ name: "recommendation", type: "object", description: "Settlement payload", required: true }],
    render: ({ args }) => <div className="agent-rendered-card">Recommendation: {String((args.recommendation as SettlementRecommendation)?.status)}</div>,
  });
}
