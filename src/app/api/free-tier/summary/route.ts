import { computeFreeTierTotals } from "@omniroute/open-sse/config/freeTierCatalog.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: CORS });
}

export function GET(req: Request): Response {
  const url = new URL(req.url);
  const excludeTosAvoid = url.searchParams.get("excludeTosAvoid") === "1";
  const totals = computeFreeTierTotals({ excludeTosAvoid });
  return new Response(JSON.stringify(totals), {
    status: 200,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}
