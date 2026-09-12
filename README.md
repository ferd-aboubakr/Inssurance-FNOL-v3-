# AmbientOps — FNOL Copilot

A Next.js prototype for human-in-the-loop First Notice of Loss triage. The dashboard demonstrates the full path from a multilingual call transcript through policy lookup, evidence verification, business-rule evaluation, and a human settlement decision.

## Run it

```bash
npm install
npm run dev
```

Open `http://localhost:3000`, edit the live-call transcript, then select **Analyze FNOL**.

## Demo behavior

The analysis endpoint is deterministic so the prototype is usable without credentials:

- Flood, hail, storm, and rain claims receive a mock verified weather event.
- Auto repair claims use a mock $3,000 market benchmark.
- Damage below the $500 deductible is rejected.
- Auto estimates greater than $3,450 route to manual adjuster review.
- Otherwise, recommended payout is the damage minus $500, capped at $10,000.

`app/api/copilotkit/route.ts` declares the OpenAI Agents SDK `InsuranceAgent`, mock Ambiguous AI / Exa tools, and the CopilotKit runtime. The dashboard's deterministic evaluation stays independent of optional conversational runtime transport, so it remains safe to demo without an API key. Set `OPENAI_API_KEY` and optionally `OPENAI_MODEL` when wiring the runtime into an authenticated CopilotKit agent endpoint.

## Verify

```bash
npm run build
npm test
```

This is a prototype: connect authenticated policy, weather/repair, CRM, audit logging, authorization, and compliance controls before handling real claim data.
