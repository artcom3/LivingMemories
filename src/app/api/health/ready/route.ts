import { localConnections } from "@/lib/infrastructure/connections";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const connections = await localConnections();
  const ready = Object.values(connections).every(value => value === "ok");
  return Response.json({ status: ready ? "ready" : "unavailable", connections }, { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
