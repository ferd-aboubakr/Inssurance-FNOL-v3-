"use client";

import { useState } from "react";
import type { SettlementRecommendation } from "@/lib/claims";

const sample = "My basement flooded yesterday after the storm. The damage is about $3500.";
const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

function statusLabel(status: SettlementRecommendation["status"]) {
  return status === "approve" ? "Recommended approval" : status === "reject" ? "Recommended rejection" : "Manual adjuster review";
}

function Dashboard() {
  const [transcript, setTranscript] = useState(sample);
  const [recommendation, setRecommendation] = useState<SettlementRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");


  async function investigate() {
    setLoading(true); setToast("");
    try {
      const response = await fetch("/api/claim-evaluate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transcript }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Evaluation failed");
      setRecommendation(payload);
    } catch (error) { setToast(error instanceof Error ? error.message : "Evaluation failed"); }
    finally { setLoading(false); }
  }

  function decide(decision: "accepted" | "modified" | "rejected") {
    setToast(decision === "accepted" ? "Human approval recorded; action executor handoff is pending" : decision === "modified" ? "Recommendation sent to adjuster for modification" : "Recommendation rejected; no action was executed");
  }

  return <main>
    <header><div><p className="eyebrow">AMBIENTOPS / FNOL COMMAND CENTER</p><h1>Human judgment, with the context already in hand.</h1></div><span className="live"><i /> LIVE CALL</span></header>
    <section className="grid">
      <article className="panel call"><div className="panel-title"><span>01</span><h2>Call stream</h2></div><textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} aria-label="Live call transcript" /><div className="call-foot"><span>EN · FR · MA-AR ready</span><button onClick={investigate} disabled={loading}>{loading ? "Investigating…" : "Analyze FNOL"}</button></div></article>
      <article className="panel timeline"><div className="panel-title"><span>02</span><h2>Decision timeline</h2></div><ol><li className="done">Transcript ingested</li><li className={recommendation ? "done" : ""}>Policy context retrieved</li><li className={recommendation ? "done" : ""}>External evidence verified</li><li className={recommendation ? "done" : ""}>Rules evaluated</li></ol></article>
      <article className="panel battle"><div className="panel-title"><span>03</span><h2>Battle card</h2></div>{recommendation ? <><p className={`status ${recommendation.status}`}>{statusLabel(recommendation.status)}</p><p className="reason">{recommendation.requiresApproval ? "Human approval required before any action." : "Eligible for low-risk automation."}</p><p className="payout">{recommendation.status === "approve" ? money(recommendation.recommendedPayout) : "HOLD"}</p><p className="reason">{recommendation.rationale}</p><div className="actions"><button className="accept" onClick={() => decide("accepted")} disabled={recommendation.status !== "approve"}>Accept</button><button onClick={() => decide("modified")}>Modify</button><button className="reject" onClick={() => decide("rejected")}>Reject</button></div></> : <p className="empty">Analyze the call to create a settlement recommendation. Every payout remains pending human approval.</p>}</article>
      <article className="panel evidence"><div className="panel-title"><span>04</span><h2>Evidence ledger</h2></div>{recommendation ? <div className="facts"><div><small>INTERNAL / POLICY</small><strong>{recommendation.policy.policyId} · {recommendation.policy.coverage}</strong><p>Deductible {money(recommendation.policy.deductible)} · Cap {money(recommendation.policy.maxPayout)}</p></div><div><small>EXTERNAL / EXA MOCK</small><strong>{recommendation.externalFact.verified ? "Verified" : "Unverified"}</strong><p>{recommendation.externalFact.summary}</p></div><div><small>CLAIM ESTIMATE</small><strong>{money(recommendation.estimatedDamage)}</strong><p>Classification: {recommendation.claimType}</p></div></div> : <p className="empty">Policy, weather, and repair evidence will appear here.</p>}</article>
    </section>
    {toast && <div className="toast" role="status">{toast}<button onClick={() => setToast("")}>×</button></div>}
  </main>;
}

export default function Page() { return <Dashboard />; }
