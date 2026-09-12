"use client";

import { useEffect, useState } from "react";
import type { SettlementRecommendation } from "@/lib/claims";
import type { TranscriptEvent } from "@/src/core/types";
import { TranscriptionService } from "@/src/integrations/transcription/transcription-service";
import type { BrowserWindow } from "@/src/integrations/transcription/speech-recognition";

const sample = "My basement flooded yesterday after the storm. The damage is about $3,000.";
const languages = ["en-US", "fr-FR", "ar-MA"] as const;
type SupportedLanguage = (typeof languages)[number];
type EvaluatedClaim = SettlementRecommendation & { claimId: string };
type ClaimAction = "ACCEPT" | "MODIFY" | "REJECT";
const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

function statusLabel(status: SettlementRecommendation["status"]) {
  return status === "approve" ? "Recommended approval" : status === "reject" ? "Recommended rejection" : "Manual adjuster review";
}

function Dashboard() {
  const [transcript, setTranscript] = useState(sample);
  const [transcriptEvents, setTranscriptEvents] = useState<TranscriptEvent[]>([]);
  const [language, setLanguage] = useState<SupportedLanguage>("en-US");
  const [recommendation, setRecommendation] = useState<EvaluatedClaim | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [modifiedPayout, setModifiedPayout] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    const service = new TranscriptionService(
      window as unknown as BrowserWindow,
      (event) => {
        setTranscriptEvents((events) => [...events, event].slice(-12));
        if (event.isFinal) setTranscript((current) => `${current.trimEnd()}${current.trim() ? " " : ""}${event.text}`);
      },
      { language },
    );
    service.start();
    return () => service.stop();
  }, [language]);

  async function investigate() {
    setLoading(true); setToast("");
    try {
      const response = await fetch("/api/claim-evaluate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transcript, customerName: "Sarah Martin" }) });
      const payload = await response.json() as EvaluatedClaim & { error?: string };
      if (!response.ok || typeof payload.claimId !== "string") throw new Error(payload.error ?? "Evaluation failed");
      setRecommendation(payload); setModifiedPayout(String(payload.recommendedPayout));
    } catch (error) { setToast(error instanceof Error ? error.message : "Evaluation failed"); }
    finally { setLoading(false); }
  }

  async function decide(action: ClaimAction) {
    if (!recommendation) return;
    const modifiedRecommendedPayout = Number(modifiedPayout);
    if (action === "MODIFY" && (!Number.isFinite(modifiedRecommendedPayout) || modifiedRecommendedPayout < 0)) {
      setToast("Enter a non-negative modified payout."); return;
    }
    setActionLoading(true); setToast("");
    try {
      const response = await fetch("/api/claim-actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ claimId: recommendation.claimId, action, ...(action === "MODIFY" ? { modifiedRecommendedPayout } : {}) }) });
      const payload = await response.json() as { error?: string; recommendation?: SettlementRecommendation; settlementDraft?: { subject: string } };
      if (!response.ok || !payload.recommendation) throw new Error(payload.error ?? "Claim action failed");
      setRecommendation({ ...payload.recommendation, claimId: recommendation.claimId });
      setToast(action === "ACCEPT" ? `Human approval recorded. ${payload.settlementDraft?.subject ?? "Settlement draft created."}` : action === "MODIFY" ? "Modified decision recorded for adjuster review." : "Rejection recorded; no action was executed.");
    } catch (error) { setToast(error instanceof Error ? error.message : "Claim action failed"); }
    finally { setActionLoading(false); }
  }

  return <main>
    <header><div><p className="eyebrow">AMBIENTOPS / FNOL COMMAND CENTER</p><h1>Human judgment, with the context already in hand.</h1></div><span className="live"><i /> LIVE CALL</span></header>
    <section className="grid">
      <article className="panel call"><div className="panel-title"><span>01</span><h2>Call stream</h2></div><textarea value={transcript} onChange={(event) => setTranscript(event.target.value)} aria-label="Live call transcript" /><div className="call-foot"><label>Language <select value={language} onChange={(event) => setLanguage(event.target.value as SupportedLanguage)} aria-label="Transcription language">{languages.map((value) => <option key={value} value={value}>{value}</option>)}</select></label><button onClick={investigate} disabled={loading}>{loading ? "Investigating…" : "Analyze FNOL"}</button></div>{transcriptEvents.length > 0 && <div className="transcript-events" aria-live="polite">{transcriptEvents.map((event, index) => <p key={`${event.timestamp}-${index}`} className={event.isFinal ? "final" : "interim"}><small>{event.source} · {event.isFinal ? "final" : "interim"}</small>{event.text}</p>)}</div>}</article>
      <article className="panel timeline"><div className="panel-title"><span>02</span><h2>Decision timeline</h2></div><ol><li className="done">Transcript ingested</li><li className={recommendation ? "done" : ""}>Policy context retrieved</li><li className={recommendation ? "done" : ""}>External evidence verified</li><li className={recommendation ? "done" : ""}>Rules evaluated</li></ol></article>
      <article className="panel battle"><div className="panel-title"><span>03</span><h2>Battle card</h2></div>{recommendation ? <><p className={`status ${recommendation.status}`}>{statusLabel(recommendation.status)}</p><p className="reason">{recommendation.requiresApproval ? "Human approval required before any action." : "Eligible for low-risk automation."}</p><p className="payout">{recommendation.status === "approve" ? money(recommendation.recommendedPayout) : "HOLD"}</p><p className="reason">{recommendation.rationale}</p><label className="modify-field">Modified payout <input type="number" min="0" value={modifiedPayout} onChange={(event) => setModifiedPayout(event.target.value)} aria-label="Modified payout" /></label><div className="actions"><button className="accept" onClick={() => decide("ACCEPT")} disabled={recommendation.status !== "approve" || actionLoading}>Accept</button><button onClick={() => decide("MODIFY")} disabled={actionLoading}>Modify</button><button className="reject" onClick={() => decide("REJECT")} disabled={actionLoading}>Reject</button></div></> : <p className="empty">Analyze the call to create a settlement recommendation. Every payout remains pending human approval.</p>}</article>
      <article className="panel evidence"><div className="panel-title"><span>04</span><h2>Evidence ledger</h2></div>{recommendation ? <div className="facts"><div><small>INTERNAL / POLICY</small><strong>{recommendation.policy.policyId} · {recommendation.policy.coverage.join(" + ")}</strong><p>Deductible {money(recommendation.policy.deductible)} · Cap {money(recommendation.policy.coverageLimit)}</p></div><div><small>EXTERNAL / EXA</small><strong>{recommendation.externalFact.verified ? "Verified" : "Unverified"}</strong><p>{recommendation.externalFact.summary}</p></div>{recommendation.ambiguousAssessment && <div><small>ANALYSIS / AMBIGUOUS</small><strong>{recommendation.ambiguousAssessment.needsReview ? "Review flagged" : "Assessment complete"}</strong><p>{recommendation.ambiguousAssessment.summary}</p></div>}<div><small>CLAIM ESTIMATE</small><strong>{money(recommendation.estimatedDamage)}</strong><p>Classification: {recommendation.claimType}</p></div></div> : <p className="empty">Policy, weather, and repair evidence will appear here.</p>}</article>
    </section>
    {toast && <div className="toast" role="status">{toast}<button onClick={() => setToast("")}>×</button></div>}
  </main>;
}

export default function Page() { return <Dashboard />; }
