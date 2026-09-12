import { NextResponse } from "next/server";
import { evaluateTranscript } from "@/lib/claims";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { transcript?: unknown; incidentDate?: unknown } | null;
  if (!body || typeof body.transcript !== "string" || !body.transcript.trim()) {
    return NextResponse.json({ error: "A transcript is required." }, { status: 400 });
  }
  return NextResponse.json(evaluateTranscript(body.transcript, typeof body.incidentDate === "string" ? body.incidentDate : undefined));
}
