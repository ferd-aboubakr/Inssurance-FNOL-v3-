import { evaluateClaimRequest } from "@/lib/claim-evaluation";

export async function POST(request: Request) {
  return evaluateClaimRequest(request);
}
