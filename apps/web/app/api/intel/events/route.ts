/**
 * GET /api/intel/events
 * Returns current intelligence events.
 * Tries Python backend first; falls back to mock data.
 */

import { NextRequest, NextResponse } from "next/server";
import { MOCK_GEO_EVENTS } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

const BACKEND = process.env.AEGIS_API_URL; // e.g. http://localhost:8000

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const threat    = searchParams.get("threat");
  const category  = searchParams.get("category");
  const limit     = parseInt(searchParams.get("limit") ?? "50");

  // Try Python backend
  if (BACKEND) {
    try {
      const params = new URLSearchParams();
      if (threat)   params.set("threat", threat);
      if (category) params.set("category", category);
      params.set("limit", String(limit));

      const res = await fetch(`${BACKEND}/api/v1/events?${params}`, {
        headers: { "Accept": "application/json" },
        signal:  AbortSignal.timeout(5_000),
        next:    { revalidate: 0 },
      });

      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch (err) {
      console.warn("[events] Backend unavailable, using mock data:", err);
    }
  }

  // Fallback: mock data with filter support
  let events = [...MOCK_GEO_EVENTS];
  if (threat)   events = events.filter((e) => e.threat === threat);
  if (category) events = events.filter((e) => e.category === category);
  events = events.slice(0, limit);

  return NextResponse.json({
    events,
    total: events.length,
    source: "mock",
    timestamp: new Date().toISOString(),
  });
}
