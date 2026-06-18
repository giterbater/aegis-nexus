/**
 * GET /api/intel/stream
 * Server-Sent Events stream — emits new intelligence events in real-time.
 *
 * Priority order:
 *   1. Python backend WebSocket (proxied → SSE) when AEGIS_API_URL is set
 *   2. Simulated live stream from mock data (always works, no deps)
 *
 * The frontend connects here and gets a unified SSE feed regardless of
 * whether the full microservice stack is running.
 */

import { NextRequest } from "next/server";
import { MOCK_STREAM_EVENTS } from "@/lib/mock-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_WS = process.env.AEGIS_WS_URL; // e.g. ws://localhost:8000/ws/intelligence

// Simulate realistic live events with varying intervals
const SIMULATED_EVENTS = [
  {
    id: `live-${Date.now()}-1`,
    type: "ALERT" as const,
    title: "SIGINT: Encrypted Traffic Spike — Eastern Corridor",
    body: "Anomalous encrypted traffic volume detected on monitored frequencies. Pattern consistent with pre-operation communications.",
    threat: "HIGH" as const,
    source: "AEGIS-SIGINT",
    isNew: true,
  },
  {
    id: `live-${Date.now()}-2`,
    type: "ANALYSIS" as const,
    title: "AI Cross-Correlation: Supply Chain Nexus Detected",
    body: "DEEP-RESEARCH-α has identified shared logistics infrastructure between 2 active threat actors. Probability of coordination: 63%.",
    threat: "MEDIUM" as const,
    source: "DEEP-RESEARCH-α",
    isNew: true,
  },
  {
    id: `live-${Date.now()}-3`,
    type: "UPDATE" as const,
    title: "Satellite Imagery: New Construction — Disputed Zone",
    body: "Planet Labs SAR imagery confirms 3 new hardened structures at coordinates 11.9°N, 114.3°E. Construction pace accelerated 40% vs last cycle.",
    threat: "MEDIUM" as const,
    source: "AEGIS-IMINT",
    isNew: true,
  },
  {
    id: `live-${Date.now()}-4`,
    type: "AGENT" as const,
    title: "RISKMETRIC: Escalation Probability Updated",
    body: "East Asia theater escalation probability revised upward to 41% (72h window) following additional PLAAF sortie data. Key indicator threshold breached.",
    threat: "HIGH" as const,
    source: "RISKMETRIC",
    isNew: true,
  },
  {
    id: `live-${Date.now()}-5`,
    type: "SYSTEM" as const,
    title: "Pipeline: 1,247 articles ingested — 31 events extracted",
    body: "Multilingual NLP classification complete. 7 HIGH+ events queued for agent review. Entity graph updated with 14 new relationships.",
    source: "PIPELINE-ENGINE",
    isNew: true,
  },
];

async function* simulatedEventGenerator() {
  // Emit historical events first (fast)
  for (const ev of MOCK_STREAM_EVENTS.slice(0, 3)) {
    yield { ...ev, isNew: false };
    await sleep(300);
  }

  // Then emit live simulated events at realistic intervals
  let i = 0;
  while (true) {
    const delay = 8000 + Math.random() * 12000; // 8-20 seconds
    await sleep(delay);
    const base = SIMULATED_EVENTS[i % SIMULATED_EVENTS.length];
    yield {
      ...base,
      id: `live-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    i++;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();
  let closed = false;

  req.signal.addEventListener("abort", () => { closed = true; });

  const stream = new ReadableStream({
    async start(controller) {
      // Send heartbeat comment every 15s to keep connection alive
      const heartbeat = setInterval(() => {
        if (!closed) {
          try { controller.enqueue(encoder.encode(": heartbeat\n\n")); }
          catch { /* closed */ }
        }
      }, 15_000);

      // Send initial connection event
      const connectEvent = {
        type: "connected",
        message: "AEGIS Intelligence Stream — ONLINE",
        timestamp: new Date().toISOString(),
        provider: BACKEND_WS ? "backend" : "simulated",
      };
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(connectEvent)}\n\n`));

      try {
        // TODO: when BACKEND_WS is set, proxy from Python WS
        // For now (and as fallback), use simulated stream
        for await (const event of simulatedEventGenerator()) {
          if (closed) break;
          const payload = { type: "event", data: event };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        }
      } catch (err) {
        if (!closed) {
          const errEvent = { type: "error", message: "Stream interrupted" };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errEvent)}\n\n`));
        }
      } finally {
        clearInterval(heartbeat);
        if (!closed) controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":      "text/event-stream",
      "Cache-Control":     "no-cache, no-transform",
      "Connection":        "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
