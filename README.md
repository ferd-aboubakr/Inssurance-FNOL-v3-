# AmbientOps — FNOL Copilot

AmbientOps is a Next.js demonstration of a human-in-the-loop copilot for First Notice of Loss (FNOL) calls. It converts a live call transcript into a grounded claim recommendation by combining policy context, external evidence, deterministic rules, and a required human decision.

The project is built as a hackathon foundation: adapters are replaceable, external failures degrade safely, and no payout, CRM update, or email is executed automatically.

## What the demo does

1. Captures or accepts a call transcript in English, French, or Moroccan Arabic.
2. Looks up the claimant’s policy through a server-side workspace adapter.
3. Verifies weather claims through the server-side Exa adapter when a key is configured.
4. Runs a provider-neutral AmbiguousAdapter assessment. The current demo uses an explicitly labeled deterministic local implementation.
5. Applies deductible, evidence, repair-benchmark, and approval rules.
6. Presents a recommendation that a human can accept, modify, or reject.
7. Records an in-memory audit event. An accepted recommendation creates an unsent settlement-email draft.

## Demo scenario

| Field | Demo value |
| --- | --- |
| Customer | Sarah Martin |
| Policy | `HOME-48291` |
| Status | Active |
| Incident | Storm flooded the basement |
| Coverage | Home Water Damage, Flood |
| Estimated damage | $3,000 |
| Deductible | $500 |
| Coverage limit | $10,000 |
| Expected payout with verified weather evidence | $2,500 |

If weather evidence is unavailable, AmbientOps returns a manual-review recommendation rather than treating the event as verified.

## Architecture

```text
Browser dashboard
  └─ Transcript events and manual transcript input
       └─ POST /api/claim-evaluate
            ├─ PolicyAdapter
            ├─ Exa weather verifier
            ├─ AmbiguousAdapter
            └─ Deterministic rule engine
                 └─ Recommendation + claim ID
                      └─ POST /api/claim-actions
                           └─ Accept / modify / reject + audit event
```

Key boundaries:

- Browser SpeechRecognition and webkitSpeechRecognition stay within the transcription adapter.
- `EXA_API_KEY` is read only by the server composition module.
- The policy, Exa, and Ambiguous integrations use typed interfaces that can be replaced without changing claim rules.
- The claim API maps the full workspace policy into the smaller rule-engine policy projection at one server boundary.

## Project layout

```text
app/                     Next.js dashboard and API routes
lib/                     Claim orchestration, rules mapping, and human actions
src/core/                Shared TypeScript contracts
src/integrations/        Policy, Exa, Ambiguous, and transcription adapters
packages/agent-core/     Agent-loop orchestration
packages/business-rules/ Deterministic claim rules
tests/                   Vitest coverage for adapters, rules, APIs, and actions
```

## Getting started

### Prerequisites

- Node.js 20 or later
- npm

### Install and run

```bash
npm install
# macOS / Linux
cp .env.example .env.local
npm run dev
```

On PowerShell, use `Copy-Item .env.example .env.local` instead of `cp`.

Open [http://localhost:3000](http://localhost:3000), review the transcript, and select **Analyze FNOL**.

The dashboard works without credentials. A browser without Web Speech API support falls back to the configured fallback transcript after its production delay.

## Configuration

Create `.env.local` from `.env.example`.

```env
# Optional. Enables live Exa weather verification.
EXA_API_KEY=
```

`EXA_API_KEY` is optional for the demo. Without it, weather verification safely returns unverified evidence and the claim is held for manual review. The adapter enforces a five-second production timeout.

The optional `/api/copilotkit` route can use OpenAI through CopilotKit. If you wire that conversational endpoint into an authenticated client, configure `OPENAI_API_KEY` and, optionally, `OPENAI_MODEL`. They are not required for the dashboard claim-evaluation flow.

Never expose any API key through client-side environment variables.

## API overview

### Evaluate a claim

`POST /api/claim-evaluate`

```json
{
  "customerName": "Sarah Martin",
  "transcript": "My basement flooded after a storm. Damage is about $3000.",
  "incidentDate": "2026-09-11"
}
```

The endpoint returns the resolved policy, evidence state, Ambiguous assessment, deterministic recommendation, and an in-memory `claimId`.

Known customers resolve through the policy adapter. An unknown customer returns a controlled `404` response.

### Record a human action

`POST /api/claim-actions`

```json
{
  "claimId": "fnol-1",
  "action": "ACCEPT"
}
```

Supported actions are `ACCEPT`, `MODIFY`, and `REJECT`.

- `ACCEPT` is available only for an approved recommendation and creates an unsent settlement draft.
- `MODIFY` requires a non-negative `modifiedRecommendedPayout`.
- `REJECT` records the decision without creating a settlement draft.

## Safety and failure handling

- Unsupported browser speech recognition or recognition errors do not crash the UI.
- The fallback transcription emits one normalized transcript event after its configurable delay.
- Missing Exa credentials, network errors, malformed responses, empty responses, and timeouts return unverified evidence instead of throwing.
- Unknown policies return a typed not-found result.
- Every recommendation remains subject to human approval before any action.

## Verification

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

## Current scope and production work

AmbientOps is a demonstration, not a production claims platform. The current project intentionally uses in-memory claim and audit state, a seeded policy adapter, and a deterministic local Ambiguous adapter.

Before production use, add authenticated policy access, durable audit storage, authorization, data retention controls, real notification delivery, provider observability, and insurance-specific compliance review.
